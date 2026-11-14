"""Text agent runner (Real-time Vertex AI / Gemini API tool-calling + dynamic fallback)."""
from __future__ import annotations

import asyncio
import logging
import os
import re
import time
import uuid
from typing import Any

from app import settings
from app.agent import tools as agent_tools

logger = logging.getLogger("beatpulse.agent.runner")

ACTION_MAP = {
    "compare_cities": ("city_compare", None),
    "get_priority_queue": ("city_health", None),
    "get_outlet_profile": ("outlet", "overview"),
    "diagnose_outlet_leakage": ("outlet", "diagnosis"),
    "diagnose_beat_leakage": ("beat_diagnosis", None),
    "recommend_outlet_intervention": ("outlet", "recommendation"),
    "compare_outlet_interventions": ("outlet", "compare"),
    "simulate_beat_rebalance": ("beat_simulator", None),
}

_OUTLET_RE = re.compile(r"\b(BLR|HYD|CHN)[-\s]?(\d{3})\b", re.IGNORECASE)
_BEAT_RE = re.compile(r"\b(BLR|HYD|CHN)[-\s]?(B0[1-7])\b", re.IGNORECASE)


def _language_instruction(lang: str) -> str:
    if lang == "hinglish":
        return "Reply naturally and concisely in crisp executive Hinglish."
    if lang == "hindi":
        return "Reply concisely in clear Hindi (Devanagari) keeping ITC SKU names and IDs intact."
    return "Respond strictly in 100% standard English ONLY. NEVER use any Hindi or Hinglish words. Keep it crisp (2-4 sentences citing exact INR, LSPC, and tool numbers)."


def _deterministic_turn(
    text: str,
    city: str | None,
    outlet_id: str | None,
    language: str,
) -> dict[str, Any]:
    """Tool-grounded responder handling both 5-Step Storyboard and open-ended analytics offline."""
    q = text.lower().strip()
    tool_calls: list[dict[str, Any]] = []
    actions: list[dict[str, Any]] = []
    t0 = time.perf_counter()

    m_outlet = _OUTLET_RE.search(text)
    target_outlet = f"{m_outlet.group(1).upper()}-{m_outlet.group(2)}" if m_outlet else outlet_id
    if "lakshmi" in q:
        target_outlet = "BLR-701"

    m_beat = _BEAT_RE.search(text)
    target_beat = f"{m_beat.group(1).upper()}-{m_beat.group(2).upper()}" if m_beat else None
    if not target_beat:
        if "beat 4" in q or "koramangala" in q:
            target_beat = "BLR-B04"
        elif "beat 7" in q or "hsr" in q:
            target_beat = "BLR-B07"

    detected_city = city
    for cname in settings.CITIES:
        if cname.lower() in q or ("bengaluru" in q and cname == "Bangalore"):
            detected_city = cname
            break

    # Storyboard Step 5b: ASM Dispatch
    if any(w in q for w in ("send", "dispatch", "asm", "alert")) and any(w in q for w in ("beat", "stock", "update", "asm", "action")):
        bid = target_beat or "BLR-B04"
        res = agent_tools.dispatch_asm_action(bid)["data"]
        tool_calls.append({"name": "dispatch_asm_action", "args": {"beat_id": bid}, "status": "OK", "duration_ms": int((time.perf_counter() - t0) * 1000)})
        actions.append({"kind": "ui", "source_tool": "ui_control", "command": {"action": "report", "value": "open", "outlet_id": target_outlet or "BLR-701"}})
        return {
            "response": f"Ticket {res['ticket_id']} dispatched to ASM & Distributor DMS: {bid} split plan + HSR Beat 7 priority Sunfeast/Bingo! stock alert queued.",
            "tool_calls": tool_calls,
            "artifacts": [],
            "actions": actions,
            "status": "ok",
            "engine": "deterministic-tools",
        }

    # Distributor / WD queries
    if any(w in q for w in ("distributor", "wd ", "wds", "stockist", "fill rate", "fill-rate")):
        res = agent_tools.get_distributor_performance(detected_city or "ALL")
        tool_calls.append({"name": "get_distributor_performance", "args": {"city": detected_city or "ALL"}, "status": "OK", "duration_ms": int((time.perf_counter() - t0) * 1000)})
        worst = min(res["distributors"], key=lambda x: x["avg_fill_rate"])
        msg = (
            f"Lowest WD fill rate is {worst['name']} ({worst['city']}) at {worst['avg_fill_rate']*100:.1f}%, "
            f"with {worst['zero_billing_outlets']} zero-billing stores and ₹{worst['monthly_leakage_inr']:,.0f}/month leakage."
        )
        return {"response": msg, "tool_calls": tool_calls, "artifacts": [], "actions": actions, "status": "ok", "engine": "deterministic-tools"}

    # Category / SKU mix queries (only when not asking for Beat rebalance simulation)
    if (
        any(w in q for w in ("sku", "category", "categories", "aashirvaad", "sunfeast", "savlon", "fiama", "classmate", "bingo", "yippee", "personal care", "foods", "stationery"))
        and "lakshmi" not in q
        and not any(w in q for w in ("simulate", "rebalance", "split"))
    ):
        res = agent_tools.get_sku_category_breakdown(city=detected_city or "ALL", beat_id=target_beat or "", outlet_id=target_outlet or "")
        if res["status"] == "OK":
            tool_calls.append({"name": "get_sku_category_breakdown", "args": {"city": detected_city or "ALL"}, "status": "OK", "duration_ms": int((time.perf_counter() - t0) * 1000)})
            cats = res["categories"]
            summary = "; ".join(f"{k.replace('_', ' ').title()}: {v['change_pct']}%" for k, v in cats.items())
            return {"response": f"Category momentum ({res['scope']}): {summary}.", "tool_calls": tool_calls, "artifacts": [], "actions": actions, "status": "ok", "engine": "deterministic-tools"}

    # Storyboard Step 5a: Beat Rebalance Simulation
    if any(w in q for w in ("simulate", "rebalance", "fix", "recovery", "split")):
        bid = target_beat or ("BLR-B04" if (detected_city or "").lower() in ("bangalore", "") else f"{detected_city[:3].upper()}-B02")
        res = agent_tools.simulate_beat_rebalance(bid)["data"]
        tool_calls.append({"name": "simulate_beat_rebalance", "args": {"beat_id": bid}, "status": "OK", "duration_ms": int((time.perf_counter() - t0) * 1000)})
        actions.append({"kind": "ui", "source_tool": "ui_control", "command": {"action": "focus_city", "value": res["city"]}})
        actions.append({"kind": "navigate", "screen": "beat_simulator", "city": res["city"], "beat_id": bid, "source_tool": "simulate_beat_rebalance"})
        msg = (
            f"Simulated {bid} route rebalance & Beat 7 Hero SKU push: travel time drops {res['after']['travel_time_reduction_pct']}% "
            f"(distance {res['before']['distance_km']} km → {res['after']['distance_km']} km, all outlets covered before {res['after']['finish_time']}). "
            f"Projected impact: +{res['after']['reactivated_zero_billing_outlets']} zero-billing outlets reactivated, +{res['after']['projected_lspc_uplift']} LSPC, "
            f"and ₹{res['after']['projected_monthly_recovery_inr'] / 100000:.1f}L/month estimated recovery."
        )
        return {"response": msg, "tool_calls": tool_calls, "artifacts": [], "actions": actions, "status": "ok", "engine": "deterministic-tools"}

    # Storyboard Step 4: Multimodal Storefront Vision Inspection
    if target_outlet and (target_outlet == "BLR-701" or any(w in q for w in ("lakshmi", "vision", "storefront", "categories", "college", "shelf", "inspect"))):
        prof = agent_tools.get_outlet_profile(target_outlet)
        tool_calls.append({"name": "get_outlet_profile", "args": {"outlet_id": target_outlet}, "status": "OK", "duration_ms": int((time.perf_counter() - t0) * 1000)})
        o = prof["data"]
        actions.append({"kind": "ui", "source_tool": "ui_control", "command": {"action": "focus_city", "value": o["city"]}})
        actions.append({"kind": "navigate", "screen": "outlet", "view": "vision", "outlet_id": o["outlet_id"], "city": o["city"], "source_tool": "get_outlet_profile"})
        msg = (
            f"Storefront Vision Audit on {o['name']} ({o['outlet_id']}): {o['storefront_vision_note']} "
            f"Opening Vision & Shelf Potential view now — expected recovery +₹1,18,000/month with Savlon, Fiama & Classmate multipacks."
        )
        return {"response": msg, "tool_calls": tool_calls, "artifacts": [], "actions": actions, "status": "ok", "engine": "deterministic-tools"}

    # Storyboard Step 3: Beat ML/SHAP
    if (target_beat and any(w in q for w in ("diagnostic", "ml", "shap", "gnn", "why", "drop", "root", "model", "compliance"))) or ("beat 7" in q and "beat 4" not in q):
        bid = target_beat or "BLR-B07"
        res = agent_tools.diagnose_beat_leakage(bid)["data"]
        tool_calls.append({"name": "diagnose_beat_leakage", "args": {"beat_id": bid}, "status": "OK", "duration_ms": int((time.perf_counter() - t0) * 1000)})
        actions.append({"kind": "ui", "source_tool": "ui_control", "command": {"action": "focus_city", "value": res["beat"]["city"]}})
        actions.append({"kind": "ui", "source_tool": "ui_control", "command": {"action": "focus_beat", "value": bid}})
        actions.append({"kind": "navigate", "screen": "beat_diagnosis", "city": res["beat"]["city"], "beat_id": bid, "source_tool": "diagnose_beat_leakage"})
        breakdown = " | ".join(f"{int(round(f['share_pct']))}% {f['label']}" for f in res["factors"])
        return {"response": f"XGBoost+SHAP & Spatio-Temporal GNN breakdown for {bid} ({res['beat']['zone']}): {breakdown}.", "tool_calls": tool_calls, "artifacts": [], "actions": actions, "status": "ok", "engine": "deterministic-tools"}

    # Storyboard Step 2: Beat 4 vs 7 Planned vs Actual
    if any(w in q for w in ("beat 4", "beat 7", "salesman visit", "zero-billing kirana", "planned", "actual", "zoom into")):
        bid = "BLR-B04"
        res = agent_tools.diagnose_beat_leakage(bid)["data"]
        tool_calls.append({"name": "diagnose_beat_leakage", "args": {"beat_id": bid}, "status": "OK", "duration_ms": int((time.perf_counter() - t0) * 1000)})
        actions.append({"kind": "ui", "source_tool": "ui_control", "command": {"action": "focus_city", "value": "Bangalore"}})
        actions.append({"kind": "ui", "source_tool": "ui_control", "command": {"action": "focus_beat", "value": "BLR-B04,BLR-B07"}})
        actions.append({"kind": "ui", "source_tool": "ui_control", "command": {"action": "flowlines", "value": "on"}})
        actions.append({"kind": "navigate", "screen": "beat_diagnosis", "city": "Bangalore", "beat_id": bid, "source_tool": "diagnose_beat_leakage"})
        msg = (
            f"Zoomed into Koramangala Beat 4 (BLR-B04) & HSR Beat 7 (BLR-B07): Planned vs. Actual SFA GPS overlay shows Beat 4 turns green early, "
            f"then hits the 4:15 PM Sony World traffic cutoff — leaving tail-end kiranas skipped 3 weeks in a row ({res['skipped_count']} tail outlets zero-billed)."
        )
        return {"response": msg, "tool_calls": tool_calls, "artifacts": [], "actions": actions, "status": "ok", "engine": "deterministic-tools"}

    # Storyboard Step 1: Macro Q3 GT Health
    if any(w in q for w in ("q3", "macro", "biggest drop", "general trade health", "bengaluru", "bangalore")) and not target_outlet and "compare" not in q:
        k = agent_tools.get_city_kpis("Bangalore")["data"]
        tool_calls.append({"name": "get_city_kpis", "args": {"city": "Bangalore"}, "status": "OK", "duration_ms": int((time.perf_counter() - t0) * 1000)})
        actions.append({"kind": "ui", "source_tool": "ui_control", "command": {"action": "focus_city", "value": "Bangalore"}})
        actions.append({"kind": "navigate", "screen": "city_health", "city": "Bangalore", "source_tool": "get_priority_queue"})
        msg = (
            f"Bengaluru Metro GT Health (Q3): {k['total_outlets']} outlets tracked with {k['critical_count']} Zero-Billing and ₹{k['monthly_leakage_inr']:,.0f}/month at risk. "
            f"South Cluster (Koramangala BLR-B04 / HSR BLR-B07) shows the sharpest drop: -14% Active Outlets and LSPC down to {k['avg_lspc']} vs target {k['target_lspc']}."
        )
        return {"response": msg, "tool_calls": tool_calls, "artifacts": [], "actions": actions, "status": "ok", "engine": "deterministic-tools"}

    if any(w in q for w in ("compare", "cities", "hyderabad", "chennai")) and not target_outlet:
        res = agent_tools.compare_cities()["data"]
        tool_calls.append({"name": "compare_cities", "args": {}, "status": "OK", "duration_ms": int((time.perf_counter() - t0) * 1000)})
        actions.append({"kind": "navigate", "screen": "city_compare", "source_tool": "compare_cities"})
        summary = "; ".join(f"{c['city']}: ₹{c['monthly_leakage_inr']:,.0f}/mo ({c['critical_count']} zero-billing)" for c in res["cities"])
        return {"response": f"Cross-city ITC TM&D benchmark — {summary}.", "tool_calls": tool_calls, "artifacts": [], "actions": actions, "status": "ok", "engine": "deterministic-tools"}

    if target_outlet:
        diag = agent_tools.diagnose_outlet_leakage(target_outlet)
        if diag["status"] == "OK":
            d = diag["data"]
            top_f = d["factors"][0]
            tool_calls.append({"name": "diagnose_outlet_leakage", "args": {"outlet_id": target_outlet}, "status": "OK", "duration_ms": int((time.perf_counter() - t0) * 1000)})
            actions.append({"kind": "navigate", "screen": "outlet", "view": "diagnosis", "outlet_id": d["outlet_id"], "city": d["city"], "source_tool": "diagnose_outlet_leakage"})
            return {"response": f"SHAP Diagnosis for {d['outlet_id']} ({d['name']}): ₹{d['monthly_leakage_inr']:,.0f}/mo leakage; top driver {top_f['share_pct']}% {top_f['label']}.", "tool_calls": tool_calls, "artifacts": [], "actions": actions, "status": "ok", "engine": "deterministic-tools"}

    # Generic open-ended query fallback across live store metrics
    cause_filter = ""
    if "q-commerce" in q or "zepto" in q or "blinkit" in q or "quick" in q:
        cause_filter = "qcommerce_spillover"
    elif "credit" in q:
        cause_filter = "credit_margin_squeeze"
    elif "mismatch" in q or "tier" in q or "assortment" in q:
        cause_filter = "assortment_tier_mismatch"
    elif "stockout" in q or "out of stock" in q or "oos" in q:
        cause_filter = "hero_sku_stockout"

    res = agent_tools.query_outlets(city=detected_city or "ALL", dominant_cause=cause_filter, limit=5)
    tool_calls.append({"name": "query_outlets", "args": {"city": detected_city or "ALL", "dominant_cause": cause_filter}, "status": "OK", "duration_ms": int((time.perf_counter() - t0) * 1000)})
    top_names = ", ".join(f"{o['outlet_id']} (₹{int(o['revenue_leakage_monthly_inr']):,})" for o in res["outlets"][:3])
    msg = (
        f"Live query ({detected_city or 'All 3 Cities'}{f' · {cause_filter}' if cause_filter else ''}): "
        f"{res['count']} matching outlets, ₹{res['total_monthly_leakage_inr']:,.0f}/month leakage, avg LSPC {res['avg_lspc']}. "
        f"Top impacted: {top_names}."
    )
    return {"response": msg, "tool_calls": tool_calls, "artifacts": [], "actions": actions, "status": "ok", "engine": "deterministic-tools"}


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
    api_key: str | None = None,
) -> dict[str, Any]:
    sid = session_id or f"bp-{uuid.uuid4().hex[:8]}"
    lang = (language or settings.DEFAULT_LANGUAGE).lower()
    if settings.AGENT_LLM == "fake" and not api_key:
        res = _deterministic_turn(text, city, outlet_id, lang)
        return {"session_id": sid, "language": lang, "persona": persona, **res}

    runtime_key = settings.get_gemini_api_key(api_key)

    try:
        from google import genai
        from google.genai import types

        if runtime_key:
            client = genai.Client(api_key=runtime_key)
            model_name = os.getenv("BEATPULSE_AI_STUDIO_TEXT_MODEL", settings.TEXT_MODEL)
        else:
            client = genai.Client(vertexai=True, project=settings.PROJECT_ID, location=settings.TEXT_LOCATION)
            model_name = settings.TEXT_MODEL

        tool_fns = agent_tools.ALL_TOOLS
        fn_map = agent_tools.TOOL_REGISTRY
        sys_prompt = (
            "You are Sahayak AI, the real-time executive copilot for ITC Limited TM&D across Bangalore, Hyderabad, and Chennai. "
            "The audience may ask ANY open-ended question about cities, beats, WDs, SKUs/categories, outlets, ML/SHAP drivers, GNN spillover, storefront vision, or simulations. "
            "Always call the appropriate tools in real time to compute exact numbers — never guess numbers. "
            "Also call ui_control or analytical tools so the map and Answer Canvas update automatically on screen. "
            f"Context: persona={persona}, city={city or 'ALL'}, outlet_id={outlet_id or 'none'}, screen={screen or 'map'}. "
            + _language_instruction(lang)
        )
        contents: list[Any] = [types.Content(role="user", parts=[types.Part.from_text(text=text)])]
        config = types.GenerateContentConfig(
            system_instruction=sys_prompt,
            tools=tool_fns,
            temperature=0.25,
            automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
        )

        recorded_tools: list[dict[str, Any]] = []
        recorded_actions: list[dict[str, Any]] = []
        reply_text = ""

        for _ in range(5):
            resp = await asyncio.to_thread(client.models.generate_content, model=model_name, contents=contents, config=config)
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
                recorded_tools.append({"name": fc.name, "args": args, "status": str(result.get("status", "OK")), "duration_ms": int((time.perf_counter() - t0) * 1000)})
                if fc.name == "ui_control" and result.get("status") == "OK":
                    recorded_actions.append({"kind": "ui", "source_tool": "ui_control", "command": result["data"]["command"]})
                elif fc.name in ACTION_MAP and result.get("status") == "OK":
                    scr, vw = ACTION_MAP[fc.name]
                    recorded_actions.append({"kind": "navigate", "screen": scr, "view": vw, "city": result.get("city"), "outlet_id": result.get("outlet_id"), "beat_id": result.get("beat_id"), "source_tool": fc.name})
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
                "engine": f"live:{model_name}",
                "language": lang,
                "persona": persona,
            }
    except Exception as e:  # noqa: BLE001
        logger.warning("Live Gemini LLM unavailable (%s: %s) — falling back to local tool engine", type(e).__name__, e)

    fallback = _deterministic_turn(text, city, outlet_id, lang)
    fallback["status"] = "degraded"
    return {"session_id": sid, "language": lang, "persona": persona, **fallback}
