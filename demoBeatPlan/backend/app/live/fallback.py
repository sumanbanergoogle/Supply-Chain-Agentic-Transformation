"""Fallback text responder when Gemini Live stream is unavailable."""
from __future__ import annotations

import logging
from typing import Any

from app.agent.runner import run_turn_async

logger = logging.getLogger("beatpulse.live.fallback")


async def answer_text_async(
    text: str,
    ui: dict[str, Any] | None = None,
    api_key: str | None = None,
) -> dict[str, Any]:
    ui = ui or {}
    try:
        res = await run_turn_async(
            session_id=ui.get("session_id") or "live-fallback",
            user_id="live",
            persona=ui.get("persona") or "VP_TMD",
            city=ui.get("city"),
            outlet_id=ui.get("outlet_id"),
            language=ui.get("language") or "english",
            text=text,
            screen=ui.get("screen"),
            api_key=api_key,
        )
        return {
            "text": res.get("response", ""),
            "actions": res.get("actions", []),
            "tool_calls": res.get("tool_calls", []),
            "engine": f"text-fallback:{res.get('engine', 'tools')}",
        }
    except Exception as e:  # noqa: BLE001
        logger.warning("Fallback answer failed: %s", e)
        return {"text": "Model unavailable; please retry.", "actions": [], "tool_calls": [], "engine": "text-fallback:error"}
