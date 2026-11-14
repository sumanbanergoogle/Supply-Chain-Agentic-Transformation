"""Text agent runner (Vertex AI gemini-3.8-flash + deterministic tool-grounded fallback)."""
from __future__ import annotations

import asyncio
import json
import logging
import re
import time
import uuid
from typing import Any

from app import settings
from app.agent import tools as agent_tools
from app.analytics.ml_engine import get_engine
from app.data_access.repository import get_repository

logger = logging.getLogger("beatpulse.agent.runner")

ACTION_MAP = {
    "compare_cities": ("city_compare", None),
    "get_priority_queue": ("city_health", None),
    "get_outlet_profile": ("outlet", "overview"),
    "diagnose_outlet_leakage": ("outlet", "diagnosis"),
    "recommend_outlet_intervention": ("outlet", "recommendation"),
    "compare_outlet_interventions": ("outlet", "compare"),
    "simulate_beat_rebalance": ("beat_simulator", None),
}

_OUTLET_RE = re.compile(r"\b(BLR|HYD|CHN)[-\s]?(\d{3})\b", re.IGNORECASE)
_BEAT_RE = re.compile(r"\b(BLR|HYD|CHN)[-\s]?(B0[1-6])\b", re.IGNORECASE)


def _language_instruction(lang: str) -> str:
    if lang == "hinglish":
        return "Reply concisely in crisp executive Hinglish (mix of English business terms and natural Hindi connectors)."
    if lang == "hindi":
        return "Reply concisely in clear Hindi (Devanagari) keeping ITC SKU names and IDs intact."
    return "Reply concisely in sharp, executive English (2-4 sentences, citing exact INR, LSPC, and tool numbers)."


def _deterministic_turn(
    text: str,
    city: str | None,
    outlet_id: str | None,
    language: str,
) -> dict[str, Any]:
    """Deterministic tool-grounded router used when Vertex ADC is unavailable or AGENT_LLM=fake."""
    q = text.lower().strip()
    tool_calls: list[dict[str, Any]] = []
    artifacts: list[dict[str, Any]] = []
    actions: list[dict[str, Any]] = []

    m_outlet = _OUTLET_RE.search(text)
    target_outlet = f"{m_outlet.group(1).upper()}-{m_outlet.group(2)}" if m_outlet else outlet_id

    m_beat = _BEAT_RE.search(text)
    target_beat = f"{m_beat.group(1).upper()}-{m_beat.group(2).upper()}" if m_beat else None

    detected_city = city
    for cname in settings.CITIES:
        if cname.lower() in q:
            detected_city = cname
            break

    # Pick city's top critical outlet if user asked about "worst" or "top zero billing"
    if not target_outlet and any(w in q for w in ("worst", "top", "critical", "zero", "priority", "outlet")):
        pq = agent_tools.get_priority_queue(detected_city or "ALL", limit=1)["data"]["priority_queue"]
        if pq:
            target_outlet = pq[0]["outlet_id"]

    t0 = time.perf_counter()

    if "report" in q or "pack" in q or "briefing pdf" in q:
        oid = target_outlet or "BLR-108"
        res = agent_tools.get_outlet_profile(oid)
        tool_calls.append({"name": "get_outlet_profile", "args": {"outlet_id": oid}, "status": "OK", "duration_ms": int((time.perf_counter() - t0) * 1000)})
        actions.append({"kind": "ui", "source_tool": "ui_control", "command": {"action": "report", "value": "open", "outlet_id": oid}})
        return {
            "response": f"Prepared the printable ITC TM&D Beat Action Pack for {oid} ({res['data']['name']}, {res['data']['city']}).",
            "tool_calls": tool_calls,
            "artifacts": [],
            "actions": actions,
            "status": "ok",
            "engine": "deterministic-tools",
        }

    if target_beat or any(w in q for w in ("rebalance", "split", "route", "beat")):
        bid = target_beat or (
            "BLR-B02" if (detected_city or "").lower() == "bangalore"
            else ("HYD-B04" if (detected_city or "").lower() == "hyderabad" else "CHN-B02")
        )
        res = agent_tools.simulate_beat_rebalance(bid)
        d = res["data"]
        tool_calls.append({"name": "simulate_beat_rebalance", "args": {"beat_id": bid}, "status": "OK", "duration_ms": int((time.perf_counter() - t0) * 1000)})
        actions.append({"kind": "navigate", "screen": "beat_simulator", "city": d["city"], "beat_id": bid, "source_tool": "simulate_beat_rebalance"})
        actions.append({"kind": "ui", "source_tool": "ui_control", "command": {"action": "focus_city", "value": d["city"]}})
        msg = (
            f"Simulated rebalancing for {bid} ({d['zone']}, {d['city']}): shifting 2 fringe outlets to {d['target_transfer_beat']} "
            f"cuts beat travel from {d['before']['distance_km']} km to {d['after']['distance_km']} km, boosts salesman visit duration "
            f"from {d['before']['avg_visit_duration_min']} min to {d['after']['avg_visit_duration_min']} min, and recovers "
            f"₹{d['after']['projected_monthly_recovery_inr']:,.0f}/month (+{d['after']['projected_lspc_uplift']} LSPC)."
        )
        return {"response": msg, "tool_calls": tool_calls, "artifacts": artifacts, "actions": actions, "status": "ok", "engine": "deterministic-tools"}

    if any(w in q for w in ("compare", "cities", "bangalore", "hyderabad", "chennai")) and not target_outlet and any(w in q for w in ("compare", "all cities", "across")):
        res = agent_tools.compare_cities()["data"]
        tool_calls.append({"name": "compare_cities", "args": {}, "status": "OK", "duration_ms": int((time.perf_counter() - t0) * 1000)})
        actions.append({"kind": "navigate", "screen": "city_compare", "source_tool": "compare_cities"})
        summary = "; ".join(
            f"{c['city']}: ₹{c['monthly_leakage_inr']:,.0f} at risk ({c['critical_count']} zero-billing, avg LSPC {c['avg_lspc']})"
            for c in res["cities"]
        )
        return {"response": f"Cross-city ITC TM&D benchmark — {summary}. Opening City Comparison.", "tool_calls": tool_calls, "artifacts": artifacts, "actions": actions, "status": "ok", "engine": "deterministic-tools"}

    if target_outlet and any(w in q for w in ("counterfactual", "alternative", "option")):
        res = agent_tools.compare_outlet_interventions(target_outlet)["data"]
        tool_calls.append({"name": "compare_outlet_interventions", "args": {"outlet_id": target_outlet}, "status": "OK", "duration_ms": int((time.perf_counter() - t0) * 1000)})
        actions.append({"kind": "navigate", "screen": "outlet", "view": "compare", "outlet_id": target_outlet, "source_tool": "compare_outlet_interventions"})
        rec = res["recommended"]
        alt = res["alternative"]
        msg = (
            f"Counterfactual for {target_outlet}: '{rec['title']}' outperforms '{alt['title']}' by "
            f"₹{res['net_advantage_inr']:,.0f}/month ({int(rec['p_recovery']*100)}% vs {int(alt['p_recovery']*100)}% confidence, {rec['payback_days']}d payback)."
        )
        return {"response": msg, "tool_calls": tool_calls, "artifacts": artifacts, "actions": actions, "status": "ok", "engine": "deterministic-tools"}

    if target_outlet and any(w in q for w in ("recommend", "action", "fix", "recover", "nba", "what should")):
        res = agent_tools.recommend_outlet_intervention(target_outlet)["data"]
        top = res["recommendations"][0]
        tool_calls.append({"name": "recommend_outlet_intervention", "args": {"outlet_id": target_outlet}, "status": "OK", "duration_ms": int((time.perf_counter() - t0) * 1000)})
        actions.append({"kind": "navigate", "screen": "outlet", "view": "recommendation", "outlet_id": target_outlet, "city": res["city"], "source_tool": "recommend_outlet_intervention"})
        msg = (
            f"Top Next-Best-Action for {target_outlet} ({res['name']}): {top['title']} "
            f"({int(top['p_recovery']*100)}% recovery probability, +₹{top['expected_monthly_uplift_inr']:,.0f}/mo, +{top['expected_lspc_gain']} LSPC in {top['sla_days']} days)."
        )
        return {"response": msg, "tool_calls": tool_calls, "artifacts": artifacts, "actions": actions, "status": "ok", "engine": "deterministic-tools"}

    if target_outlet:
        diag = agent_tools.diagnose_outlet_leakage(target_outlet)
        if diag["status"] == "OK":
            d = diag["data"]
            top_f = d["factors"][0]
            tool_calls.append({"name": "diagnose_outlet_leakage", "args": {"outlet_id": target_outlet}, "status": "OK", "duration_ms": int((time.perf_counter() - t0) * 1000)})
            actions.append({"kind": "navigate", "screen": "outlet", "view": "diagnosis", "outlet_id": d["outlet_id"], "city": d["city"], "source_tool": "diagnose_outlet_leakage"})
            msg = (
                f"ML Root-Cause for {d['outlet_id']} ({d['name']}, {d['city']}): ₹{d['monthly_leakage_inr']:,.0f}/month leakage, "
                f"churn probability {int(d['churn_prob']*100)}%, GNN spillover {int(d['gnn_spillover_risk']*100)}%. "
                f"Primary SHAP driver ({top_f['share_pct']}%): {top_f['label']}."
            )
            return {"response": msg, "tool_calls": tool_calls, "artifacts": artifacts, "actions": actions, "status": "ok", "engine": "deterministic-tools"}

    if detected_city and detected_city != "ALL":
        res = agent_tools.get_priority_queue(detected_city, limit=5)["data"]
        s = res["summary"]
        tool_calls.append({"name": "get_priority_queue", "args": {"city": detected_city}, "status": "OK", "duration_ms": int((time.perf_counter() - t0) * 1000)})
        actions.append({"kind": "ui", "source_tool": "ui_control", "command": {"action": "focus_city", "value": detected_city}})
        top = res["priority_queue"][0] if res["priority_queue"] else None
        extra = f" Highest leakage store is {top['outlet_id']} ({top['name']}, ₹{top['revenue_leakage_monthly_inr']:,.0f}/mo)." if top else ""
        msg = (
            f"{detected_city} TM&D Pulse: {s['total_outlets']} outlets tracked — {s['critical_count']} Zero-Billing, "
            f"{s['warning_count']} At-Risk, monthly leakage ₹{s['monthly_leakage_inr']:,.0f}, avg LSPC {s['avg_lspc']} vs target {s['target_lspc']}.{extra}"
        )
        return {"response": msg, "tool_calls": tool_calls, "artifacts": artifacts, "actions": actions, "status": "ok", "engine": "deterministic-tools"}

    # Default fleet briefing
    k = agent_tools.get_city_kpis("ALL")["data"]
    tool_calls.append({"name": "get_city_kpis", "args": {"city": "ALL"}, "status": "OK", "duration_ms": int((time.perf_counter() - t0) * 1000)})
    actions.append({"kind": "navigate", "screen": "city_health", "source_tool": "get_priority_queue"})
    msg = (
        f"Across Bangalore, Hyderabad & Chennai ({k['total_outlets']} GT outlets), ₹{k['monthly_leakage_inr']:,.0f}/month is at risk "
        f"across {k['critical_count']} Zero-Billing and {k['warning_count']} At-Risk stores (avg LSPC {k['avg_lspc']} vs target {k['target_lspc']}). "
        f"Ask me to inspect any city, diagnose an outlet like BLR-104, or simulate beat rebalancing."
    )
    return {"response": msg, "tool_calls": tool_calls, "artifacts": artifacts, "actions": actions, "status": "ok", "engine": "deterministic-tools"}


async def run_turn_async(
    *,
    session_id: str | None = None,
    user_id: str = "exec",
    persona: str = "VP_TMD",
    city: str | None = None,
    outlet_id: str | None = None,
    language: str = "english",
    text: str,
    screen: str | None = None,
) -> dict[str, Any]:
    """Run one turn using Vertex AI gemini-3.8-flash with automatic deterministic fallback."""
    sid = session_id or f"bp-{uuid.uuid4().hex[:8]}"
    lang = (language or settings.DEFAULT_LANGUAGE).lower()

    if settings.AGENT_LLM != "vertex":
        res = _deterministic_turn(text, city, outlet_id, lang)
        return {"session_id": sid, "language": lang, "persona": persona, **res}

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(vertexai=True, project=settings.PROJECT_ID, location=settings.TEXT_LOCATION)

        tool_fns = [
            agent_tools.get_city_kpis,
            agent_tools.compare_cities,
            agent_tools.get_priority_queue,
            agent_tools.get_outlet_profile,
            agent_tools.diagnose_outlet_leakage,
            agent_tools.recommend_outlet_intervention,
            agent_tools.compare_outlet_interventions,
            agent_tools.simulate_beat_rebalance,
            agent_tools.ui_control,
        ]
        fn_map = {fn.__name__: fn for fn in tool_fns}

        sys_prompt = (
            "You are Sahayak AI, ITC Limited TM&D General Trade Copilot across Bangalore, Hyderabad, and Chennai. "
            "Always ground every number in a tool response from this turn; never invent revenue, LSPC, or outlet IDs. "
            "When user intent refers to a city, outlet, comparison, or beat rebalance, also call ui_control or analytical tools so the dashboard updates automatically. "
            f"Current context: persona={persona}, city={city or 'ALL'}, outlet_id={outlet_id or 'none'}, screen={screen or 'map'}. "
            + _language_instruction(lang)
        )

        contents: list[Any] = [types.Content(role="user", parts=[types.Part.from_text(text=text)])]
        config = types.GenerateContentConfig(
            system_instruction=sys_prompt,
            tools=tool_fns,
            temperature=0.2,
        )

        recorded_tools: list[dict[str, Any]] = []
        recorded_actions: list[dict[str, Any]] = []
        reply_text = ""

        for _ in range(4):
            resp = await asyncio.to_thread(
                client.models.generate_content,
                model=settings.TEXT_MODEL,
                contents=contents,
                config=config,
            )
            cand = resp.candidates[0] if resp.candidates else None
            if not cand or not cand.content:
                break
            contents.append(cand.content)
            fcs = [p.function_call for p in (cand.content.parts or []) if p.function_call]
            if not fcs:
                reply_text = "".join(p.text for p in (cand.content.parts or []) if p.text).strip()
                break

            fn_responses = []
            for fc in fcs:
                fn = fn_map.get(fc.name)
                t0 = time.perf_counter()
                args = dict(fc.args or {})
                result = fn(**args) if fn else {"status": "ERROR", "message": f"Unknown tool {fc.name}"}
                dur = int((time.perf_counter() - t0) * 1000)
                recorded_tools.append({"name": fc.name, "args": args, "status": str(result.get("status", "OK")), "duration_ms": dur})

                if fc.name == "ui_control" and result.get("status") == "OK":
                    recorded_actions.append({"kind": "ui", "source_tool": "ui_control", "command": result["data"]["command"]})
                elif fc.name in ACTION_MAP and result.get("status") == "OK":
                    scr, vw = ACTION_MAP[fc.name]
                    recorded_actions.append({
                        "kind": "navigate",
                        "screen": scr,
                        "view": vw,
                        "city": result.get("city"),
                        "outlet_id": result.get("outlet_id"),
                        "beat_id": result.get("beat_id"),
                        "source_tool": fc.name,
                    })
                fn_responses.append(types.Part.from_function_response(name=fc.name, response={"result": result}))
            contents.append(types.Content(role="user", parts=fn_responses))

        if reply_text:
            return {
                "session_id": sid,
                "response": reply_text,
                "tool_calls": recorded_tools,
                "artifacts": [],
                "actions": recorded_actions,
                "status": "ok",
                "engine": f"vertex:{settings.TEXT_MODEL}",
                "language": lang,
                "persona": persona,
            }
    except Exception as e:  # noqa: BLE001
        logger.warning("Vertex chat unavailable (%s: %s) — falling back to deterministic tools", type(e).__name__, e)

    fallback = _deterministic_turn(text, city, outlet_id, lang)
    fallback["status"] = "degraded" if settings.AGENT_LLM == "vertex" else "ok"
    return {"session_id": sid, "language": lang, "persona": persona, **fallback}
