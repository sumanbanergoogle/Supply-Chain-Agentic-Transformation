"""Gemini Live bidirectional proxy behind WS /ws/live (auto-enabled on load)."""
from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import os
from collections.abc import Callable
from pathlib import Path
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect

from app import settings
from app.live import fallback, voice_tools

logger = logging.getLogger("beatpulse.live.session")

DEFAULT_LIVE_MODEL = "gemini-3.8-live"
DEFAULT_LIVE_LOCATION = "us-central1"
MAX_CONSECUTIVE_FAILURES = 3
LANGUAGES = ("english", "hinglish", "hindi")
PROMPT_PATH = Path(__file__).with_name("live_prompt.md")
LANGUAGE_MARKER = "## LANGUAGE BLOCKS"
_CLOSED = object()

ConnectFactory = Callable[[str, Any], Any]


def live_settings(api_key: str | None = None) -> dict[str, Any]:
    key = settings.get_gemini_api_key(api_key)
    default_model = os.getenv("BEATPULSE_LIVE_MODEL", DEFAULT_LIVE_MODEL)
    return {
        "api_key": key or None,
        "model": default_model,
        "location": os.getenv("BEATPULSE_LIVE_LOCATION", DEFAULT_LIVE_LOCATION),
        "project": os.getenv("BEATPULSE_LIVE_PROJECT") or settings.PROJECT_ID,
        "voice": os.getenv("BEATPULSE_LIVE_VOICE", "Aoede"),
        "offline": os.getenv("BEATPULSE_LIVE_OFFLINE", "0") == "1",
        "backoff_s": float(os.getenv("BEATPULSE_LIVE_BACKOFF_S", "0.2") or 0.2),
        "tool_timeout_s": float(os.getenv("BEATPULSE_LIVE_TOOL_TIMEOUT_S", str(voice_tools.TOOL_TIMEOUT_S)) or 10.0),
    }


def norm_language(lang: str | None) -> str:
    val = (lang or settings.DEFAULT_LANGUAGE).strip().lower()
    return val if val in LANGUAGES else "english"


def _read_prompt() -> str:
    try:
        return PROMPT_PATH.read_text(encoding="utf-8")
    except OSError:
        return "You are Sahayak AI for ITC Limited TM&D. Cite only numbers returned by tools."


def language_block(lang: str) -> str:
    text = _read_prompt()
    _, _, blocks = text.partition(LANGUAGE_MARKER)
    lang = norm_language(lang)
    for chunk in blocks.split("### ")[1:]:
        head, _, body = chunk.partition("\n")
        if head.strip().lower() == lang:
            return body.strip()
    return f"Reply in {lang}."


def _context_line(ui: dict[str, Any] | None) -> str:
    if not ui:
        return ""
    bits = [f"{k}={ui[k]}" for k in ("city", "outlet_id", "persona", "screen") if ui.get(k)]
    bits.append(f"language={norm_language(ui.get('language'))}")
    return f"[UI context] {', '.join(bits)}"


def build_system_prompt(ui: dict[str, Any] | None) -> str:
    ui = ui or {}
    base = _read_prompt().partition(LANGUAGE_MARKER)[0].strip()
    lang = norm_language(ui.get("language"))
    parts = [base, f"## LANGUAGE ({lang})\n{language_block(lang)}"]
    ctx = _context_line(ui)
    if ctx:
        parts.append(f"## SESSION CONTEXT\n{ctx}")
    return "\n\n".join(parts)


def build_live_config(types: Any, system_prompt: str, tools: list[Any], handle: str | None, voice: str) -> Any:
    return types.LiveConnectConfig(
        response_modalities=[types.Modality.AUDIO],
        output_audio_transcription=types.AudioTranscriptionConfig(),
        input_audio_transcription=types.AudioTranscriptionConfig(),
        system_instruction=types.Content(parts=[types.Part.from_text(text=system_prompt)]),
        tools=tools,
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice))
        ),
        session_resumption=types.SessionResumptionConfig(handle=handle),
        context_window_compression=types.ContextWindowCompressionConfig(sliding_window=types.SlidingWindow()),
    )


def _default_connect_factory(cfg: dict[str, Any]) -> ConnectFactory:
    from google import genai

    api_key = cfg.get("api_key") or settings.get_gemini_api_key()
    client = genai.Client(api_key=api_key) if api_key else genai.Client(vertexai=True, project=cfg["project"], location=cfg["location"])

    def factory(model: str, config: Any) -> Any:
        return client.aio.live.connect(model=model, config=config)

    return factory


async def _send(ws: WebSocket, payload: dict[str, Any]) -> bool:
    try:
        await ws.send_json(payload)
        return True
    except Exception:
        return False


def _merge_ui(state: dict[str, Any], ui_state: Any) -> bool:
    if not isinstance(ui_state, dict):
        return False
    before = norm_language(state["ui"].get("language"))
    state["ui"] = {**state["ui"], **{k: v for k, v in ui_state.items() if v is not None}}
    return norm_language(state["ui"].get("language")) != before


def initial_ui_from_query(websocket: WebSocket) -> dict[str, Any]:
    q = websocket.query_params
    ui = {k: q.get(k) for k in ("city", "outlet_id", "persona", "screen", "language") if q.get(k)}
    ui["language"] = norm_language(ui.get("language"))
    return ui


async def _run_tool(ws: WebSocket, name: str, args: dict[str, Any], timeout_s: float) -> dict[str, Any]:
    await _send(ws, {"type": "tool_call", "name": name, "status": "running", "args": args})
    try:
        result = await asyncio.wait_for(asyncio.to_thread(voice_tools.execute_voice_tool, name, args), timeout=timeout_s)
    except TimeoutError:
        result = {"status": "UNAVAILABLE", "message": "timeout", "duration_ms": round(timeout_s * 1000)}

    await _send(
        ws,
        {
            "type": "tool_call",
            "name": name,
            "status": "done",
            "args": args,
            "duration_ms": result.get("duration_ms"),
            "result": result,
        },
    )
    tool = voice_tools.VOICE_TOOLS.get(name)
    if tool and tool.action_kind and result.get("status") == "OK":
        await _send(ws, {"type": "action", "kind": tool.action_kind, "payload": result})
    return result


async def handle_live_websocket(websocket: WebSocket, connect_factory: ConnectFactory | None = None) -> None:
    await websocket.accept()
    api_key = websocket.query_params.get("api_key")
    cfg = live_settings(api_key=api_key)
    inbound: asyncio.Queue = asyncio.Queue()
    state: dict[str, Any] = {"handle": None, "resumable": False, "closed": False, "suppress_audio": False, "ui": initial_ui_from_query(websocket), "api_key": api_key}

    async def browser_reader() -> None:
        try:
            while True:
                msg = await websocket.receive()
                if msg.get("type") == "websocket.disconnect":
                    break
                await inbound.put(msg)
        except (WebSocketDisconnect, RuntimeError):
            pass
        finally:
            state["closed"] = True
            await inbound.put(_CLOSED)

    reader_task = asyncio.create_task(browser_reader())
    try:
        if cfg["offline"] and connect_factory is None:
            await _send(
                websocket,
                {
                    "type": "status",
                    "status": "fallback",
                    "model": "text",
                    "memory": False,
                    "message": "Offline mode enabled — using tool-grounded interactive copilot.",
                },
            )
            await run_fallback_session(websocket, inbound, state)
            return
        await run_resilient_live(websocket, inbound, cfg, state, connect_factory)
    finally:
        reader_task.cancel()
        with contextlib.suppress(asyncio.CancelledError, Exception):
            await reader_task


async def run_resilient_live(
    websocket: WebSocket,
    inbound: asyncio.Queue,
    cfg: dict[str, Any],
    state: dict[str, Any],
    connect_factory: ConnectFactory | None = None,
) -> None:
    try:
        from google.genai import types

        tools = voice_tools.build_genai_tools()
        if connect_factory is None:
            connect_factory = _default_connect_factory(cfg)
    except Exception as e:  # noqa: BLE001
        await _send(
            websocket,
            {
                "type": "status",
                "status": "fallback",
                "model": "text",
                "memory": False,
                "message": f"Gemini Live unavailable ({type(e).__name__}) — tool copilot active.",
            },
        )
        await run_fallback_session(websocket, inbound, state)
        return

    model = cfg["model"]
    failures = 0
    ever_connected = False
    while not state.get("closed"):
        handle = state["handle"] if state["resumable"] else None
        resuming = ever_connected
        connected_this_turn = False
        if not resuming or failures > 0:
            await _send(websocket, {"type": "status", "status": "reconnecting" if resuming else "connecting", "model": model})
        try:
            config = build_live_config(types, build_system_prompt(state["ui"]), tools, handle, cfg["voice"])
            async with connect_factory(model, config) as session:
                connected_this_turn = True
                failures = 0
                ever_connected = True
                await _send(
                    websocket,
                    {
                        "type": "status",
                        "status": "resumed" if resuming else "connected",
                        "model": model,
                        "memory": bool(handle),
                    },
                )
                reason = await _run_bidi_stream(websocket, session, inbound, state, cfg)
            if reason == "browser_closed" or state.get("closed"):
                return
        except Exception as e:  # noqa: BLE001
            if state.get("closed"):
                return
            err_msg = str(e).lower()
            is_idle_or_goaway = connected_this_turn and any(
                tok in err_msg for tok in ("inactivity", "1008", "1000", "1001", "going away", "closed", "timeout")
            )
            if is_idle_or_goaway:
                logger.info("Gemini Live idle/session renewal (%s) — transparently resuming.", e)
                failures = 0
                await asyncio.sleep(0.15)
                continue
            if handle and not connected_this_turn:
                # Clear potentially expired resumption handle before retrying with a fresh Live session.
                state["handle"] = None
                state["resumable"] = False
            failures += 1
            logger.warning("Gemini Live failure %d/%d: %s: %s", failures, MAX_CONSECUTIVE_FAILURES, type(e).__name__, e)
            if failures >= MAX_CONSECUTIVE_FAILURES:
                await _send(
                    websocket,
                    {
                        "type": "status",
                        "status": "fallback",
                        "model": "text",
                        "memory": False,
                        "message": f"Live voice audio unavailable ({type(e).__name__}) — using tool-grounded text & browser speech mode.",
                    },
                )
                await run_fallback_session(websocket, inbound, state)
                return
            await asyncio.sleep(cfg["backoff_s"] * failures)


async def _run_bidi_stream(
    websocket: WebSocket,
    session: Any,
    inbound: asyncio.Queue,
    state: dict[str, Any],
    cfg: dict[str, Any],
) -> str:
    from google.genai import types

    async def client_to_gemini() -> str:
        while True:
            message = await inbound.get()
            if message is _CLOSED:
                return "browser_closed"
            if message.get("bytes"):
                await session.send_realtime_input(audio=types.Blob(data=message["bytes"], mime_type="audio/pcm;rate=16000"))
                continue
            if not message.get("text"):
                continue
            try:
                data = json.loads(message["text"])
            except json.JSONDecodeError:
                continue
            mtype = data.get("type")
            lang_changed = _merge_ui(state, data.get("ui_state"))
            if mtype == "context":
                line = _context_line(state["ui"])
                if line:
                    lang_now = norm_language(state["ui"].get("language"))
                    suffix = (
                        f"\n[STRICT LANGUAGE SWITCH: From now on respond ONLY in {lang_now}.]\n{language_block(lang_now)}"
                        if lang_changed
                        else ""
                    )
                    await session.send_client_content(
                        turns=[types.Content(role="user", parts=[types.Part.from_text(text=f"{line}{suffix}")])],
                        turn_complete=False,
                    )
            elif mtype in ("prompt", "text"):
                state["suppress_audio"] = False
                text = str(data.get("text", ""))
                await _send(websocket, {"type": "voice_state", "state": "thinking"})
                line = _context_line(state["ui"])
                full = f"{line}\n{text}" if line else text
                await session.send_client_content(
                    turns=[types.Content(role="user", parts=[types.Part.from_text(text=full)])],
                    turn_complete=True,
                )
            elif mtype == "resume_audio":
                state["suppress_audio"] = False
            elif mtype == "audio_end":
                await session.send_realtime_input(audio_stream_end=True)
            elif mtype == "interrupt":
                state["suppress_audio"] = True
                state["speaking"] = False
                await _send(websocket, {"type": "interrupted"})
                await _send(websocket, {"type": "voice_state", "state": "idle"})

    async def gemini_to_client() -> str:
        caption: list[str] = []
        turn_output = False
        tool_since_output = False
        while True:
            got_any = False
            async for response in session.receive():
                got_any = True
                sru = getattr(response, "session_resumption_update", None)
                if sru is not None and getattr(sru, "resumable", False) and getattr(sru, "new_handle", None):
                    state["handle"] = sru.new_handle
                    state["resumable"] = True
                if getattr(response, "go_away", None) is not None:
                    return "go_away"

                tc = getattr(response, "tool_call", None)
                if tc is not None:
                    tool_since_output = True
                    await _send(websocket, {"type": "voice_state", "state": "thinking"})
                    responses = []
                    for fc in tc.function_calls or []:
                        result = await _run_tool(websocket, fc.name, dict(fc.args or {}), cfg["tool_timeout_s"])
                        responses.append(types.FunctionResponse(name=fc.name, response={"result": result}, id=fc.id))
                    await session.send_tool_response(function_responses=responses)

                sc = getattr(response, "server_content", None)
                if sc is None:
                    continue
                if getattr(sc, "interrupted", False):
                    state["speaking"] = False
                    await _send(websocket, {"type": "interrupted"})
                it = getattr(sc, "input_transcription", None)
                if it is not None and getattr(it, "text", None):
                    await _send(websocket, {"type": "input_transcript", "text": it.text})
                ot = getattr(sc, "output_transcription", None)
                if ot is not None and getattr(ot, "text", None) and not state.get("suppress_audio"):
                    turn_output = True
                    caption.append(ot.text)
                    await _send(websocket, {"type": "caption_delta", "text": ot.text, "role": "agent"})
                mt = getattr(sc, "model_turn", None)
                if mt is not None and not state.get("suppress_audio"):
                    for part in mt.parts or []:
                        inline = getattr(part, "inline_data", None)
                        if inline is not None and inline.data:
                            if not state.get("speaking"):
                                state["speaking"] = True
                                await _send(websocket, {"type": "voice_state", "state": "speaking"})
                            turn_output = True
                            await websocket.send_bytes(inline.data)
                if getattr(sc, "turn_complete", False):
                    if state.get("suppress_audio"):
                        state["suppress_audio"] = False
                        turn_output = False
                        tool_since_output = False
                        state["speaking"] = False
                        caption = []
                        await _send(websocket, {"type": "voice_state", "state": "idle"})
                        continue
                    if not turn_output and tool_since_output:
                        continue
                    turn_output = False
                    tool_since_output = False
                    state["speaking"] = False
                    full_text = "".join(caption).strip()
                    caption = []
                    await _send(websocket, {"type": "turn_complete", "full_text": full_text})
                    await _send(websocket, {"type": "voice_state", "state": "idle"})
            if not got_any:
                return "server_closed"

    t1 = asyncio.create_task(client_to_gemini())
    t2 = asyncio.create_task(gemini_to_client())
    done, pending = await asyncio.wait([t1, t2], return_when=asyncio.FIRST_COMPLETED)
    for p in pending:
        p.cancel()
        with contextlib.suppress(asyncio.CancelledError, Exception):
            await p
    return done.pop().result()


async def run_fallback_session(websocket: WebSocket, inbound: asyncio.Queue, state: dict[str, Any]) -> None:
    await _send(websocket, {"type": "voice_state", "state": "idle"})
    warned_audio = False
    while True:
        msg = await inbound.get()
        if msg is _CLOSED:
            return
        if msg.get("bytes"):
            if not warned_audio:
                warned_audio = True
                await _send(
                    websocket,
                    {
                        "type": "error",
                        "message": "Direct PCM audio stream unavailable — use browser voice input or type your query.",
                    },
                )
            continue
        if not msg.get("text"):
            continue
        try:
            data = json.loads(msg["text"])
        except json.JSONDecodeError:
            continue
        _merge_ui(state, data.get("ui_state"))
        if data.get("type") not in ("prompt", "text"):
            continue
        text = str(data.get("text", ""))
        await _send(websocket, {"type": "voice_state", "state": "thinking"})
        reply = await fallback.answer_text_async(text, dict(state["ui"]), api_key=state.get("api_key"))
        for tc in reply.get("tool_calls", []):
            await _send(websocket, {"type": "tool_call", "name": tc["name"], "status": "done", "duration_ms": tc.get("duration_ms")})
        await _send(
            websocket,
            {
                "type": "fallback_reply",
                "text": reply.get("text", ""),
                "actions": reply.get("actions", []),
                "engine": reply.get("engine", "text-fallback"),
            },
        )
        await _send(websocket, {"type": "turn_complete", "full_text": reply.get("text", "")})
        await _send(websocket, {"type": "voice_state", "state": "idle"})
