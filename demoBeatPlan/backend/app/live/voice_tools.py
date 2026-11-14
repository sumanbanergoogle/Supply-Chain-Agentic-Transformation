"""Voice tool registry wrapping ITC TM&D analytical and UI control tools."""
from __future__ import annotations

import inspect
import logging
import time
from dataclasses import dataclass
from typing import Any, Callable

from app.agent import tools as agent_tools

logger = logging.getLogger("beatpulse.live.voice_tools")

TOOL_TIMEOUT_S = 10.0
_PY_TO_SCHEMA = {str: "STRING", int: "INTEGER", float: "NUMBER", bool: "BOOLEAN"}


@dataclass(frozen=True)
class VoiceTool:
    name: str
    fn: Callable[..., Any]
    description: str
    action_kind: str | None = None


VOICE_TOOLS: dict[str, VoiceTool] = {}


def register_voice_tool(
    name: str,
    description: str,
    action_kind: str | None = None,
) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    def deco(fn: Callable[..., Any]) -> Callable[..., Any]:
        VOICE_TOOLS[name] = VoiceTool(name=name, fn=fn, description=description, action_kind=action_kind)
        return fn

    return deco


@register_voice_tool(name="get_city_kpis", action_kind="city_kpis", description="Get ITC TM&D KPIs for ALL, Bangalore, Hyderabad, or Chennai.")
def _get_city_kpis(city: str = "ALL") -> dict[str, Any]:
    return agent_tools.get_city_kpis(city=city)


@register_voice_tool(name="compare_cities", action_kind="city_comparison", description="Compare Bangalore, Hyderabad, and Chennai across zero-billing %, LSPC, revenue leakage, and dominant root cause.")
def _compare_cities() -> dict[str, Any]:
    return agent_tools.compare_cities()


@register_voice_tool(name="get_priority_queue", action_kind="priority_queue", description="Get top churning or zero-billing outlets in a city sorted by monthly revenue leakage.")
def _get_priority_queue(city: str = "ALL", limit: int = 8) -> dict[str, Any]:
    return agent_tools.get_priority_queue(city=city, limit=limit)


@register_voice_tool(name="get_outlet_profile", action_kind="outlet_profile", description="Inspect outlet profile, storefront vision shelf audit, distributor, and telemetry summary (e.g. BLR-701 Lakshmi Super Mart).")
def _get_outlet_profile(outlet_id: str) -> dict[str, Any]:
    return agent_tools.get_outlet_profile(outlet_id=outlet_id)


@register_voice_tool(name="diagnose_outlet_leakage", action_kind="attribution_waterfall", description="Run SHAP + Spatio-Temporal GNN + Storefront Vision attribution explaining why an outlet is losing revenue/LSPC.")
def _diagnose_outlet_leakage(outlet_id: str) -> dict[str, Any]:
    return agent_tools.diagnose_outlet_leakage(outlet_id=outlet_id)


@register_voice_tool(name="diagnose_beat_leakage", action_kind="beat_diagnosis", description="Run Beat-level SHAP + GNN + Planned vs Actual GPS visit comparison on a beat like BLR-B04 or BLR-B07.")
def _diagnose_beat_leakage(beat_id: str) -> dict[str, Any]:
    return agent_tools.diagnose_beat_leakage(beat_id=beat_id)


@register_voice_tool(name="recommend_outlet_intervention", action_kind="nba", description="Rank top-3 Next Best Actions with recovery probability, monthly uplift, and k-NN analog stores for an outlet.")
def _recommend_outlet_intervention(outlet_id: str, top_k: int = 3) -> dict[str, Any]:
    return agent_tools.recommend_outlet_intervention(outlet_id=outlet_id, top_k=top_k)


@register_voice_tool(name="compare_outlet_interventions", action_kind="counterfactual", description="Compare recommended vs alternative intervention side-by-side for an outlet.")
def _compare_outlet_interventions(outlet_id: str) -> dict[str, Any]:
    return agent_tools.compare_outlet_interventions(outlet_id=outlet_id)


@register_voice_tool(name="simulate_beat_rebalance", action_kind="beat_simulation", description="Simulate spatial beat rebalancing for a beat like BLR-B04 or BLR-B07.")
def _simulate_beat_rebalance(beat_id: str) -> dict[str, Any]:
    return agent_tools.simulate_beat_rebalance(beat_id=beat_id)


@register_voice_tool(name="dispatch_asm_action", action_kind="asm_dispatch", description="Dispatch approved beat rebalance and priority stock alert ticket to the ASM and Distributor.")
def _dispatch_asm_action(beat_id: str, note: str = "") -> dict[str, Any]:
    return agent_tools.dispatch_asm_action(beat_id=beat_id, note=note)


@register_voice_tool(name="ui_control", action_kind="ui_control", description="Control dashboard: focus_city, focus_beat, focus_outlet, open_outlet, open_screen, health_filter, basemap, flowlines, fullscreen, panel, report.")
def _ui_control(action: str, value: str = "", outlet_id: str = "", view: str = "") -> dict[str, Any]:
    return agent_tools.ui_control(action=action, value=value, outlet_id=outlet_id, view=view)


def build_genai_tools() -> list[Any]:
    from google.genai import types

    decls = []
    for t in VOICE_TOOLS.values():
        sig = inspect.signature(t.fn)
        props: dict[str, Any] = {}
        req: list[str] = []
        for pname, param in sig.parameters.items():
            ptype = _PY_TO_SCHEMA.get(param.annotation, "STRING")
            props[pname] = types.Schema(type=ptype, description=f"Parameter {pname}")
            if param.default is inspect.Parameter.empty:
                req.append(pname)
        decls.append(
            types.FunctionDeclaration(
                name=t.name,
                description=t.description,
                parameters=types.Schema(type="OBJECT", properties=props, required=req),
            )
        )
    return [types.Tool(function_declarations=decls)]


def execute_voice_tool(name: str, args: dict[str, Any]) -> dict[str, Any]:
    t0 = time.perf_counter()
    tool = VOICE_TOOLS.get(name)
    if not tool:
        return {"status": "ERROR", "message": f"Unknown tool: {name}", "duration_ms": 0}
    try:
        res = tool.fn(**(args or {}))
        if isinstance(res, dict):
            res.setdefault("duration_ms", round((time.perf_counter() - t0) * 1000))
            return res
        return {"status": "OK", "data": res, "duration_ms": round((time.perf_counter() - t0) * 1000)}
    except Exception as e:  # noqa: BLE001
        logger.warning("Voice tool %s error: %s", name, e)
        return {"status": "ERROR", "message": str(e), "duration_ms": round((time.perf_counter() - t0) * 1000)}
