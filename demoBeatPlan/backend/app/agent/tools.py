"""Tool-grounded ITC TM&D functions shared between text chat and Gemini Live."""
from __future__ import annotations

from typing import Any

from app.agent.ui_control import normalize_outlet_id, validate_ui_command
from app.analytics.ml_engine import get_engine
from app.data_access.repository import get_repository


def get_city_kpis(city: str = "ALL") -> dict[str, Any]:
    """Return ITC TM&D summary KPIs (outlets, zero-billing count, LSPC, monthly leakage) for ALL or Bangalore/Hyderabad/Chennai."""
    return {"status": "OK", "data": get_engine().kpis(city)}


def compare_cities() -> dict[str, Any]:
    """Compare Bangalore, Hyderabad, and Chennai across zero-billing %, monthly revenue leakage, LSPC, and top ML root cause."""
    return {"status": "OK", "data": get_engine().compare_cities()}


def get_priority_queue(city: str = "ALL", limit: int = 8) -> dict[str, Any]:
    """Return top at-risk and zero-billing outlets ranked by monthly revenue leakage and ML churn score."""
    data = get_engine().city_health(city)
    data["priority_queue"] = data["priority_queue"][: max(1, min(limit, 20))]
    return {"status": "OK", "data": data}


def get_outlet_profile(outlet_id: str) -> dict[str, Any]:
    """Return full outlet profile, WD, beat info, and latest KPIs for a specific outlet ID like BLR-104 or HYD-108."""
    oid = normalize_outlet_id(outlet_id) or outlet_id
    out = get_repository().get_outlet(oid)
    if not out:
        return {"status": "NOT_FOUND", "message": f"Outlet {oid} not found"}
    enriched = get_engine()._outlet_index.get(out["outlet_id"], out)
    return {"status": "OK", "outlet_id": out["outlet_id"], "city": out["city"], "data": enriched}


def diagnose_outlet_leakage(outlet_id: str) -> dict[str, Any]:
    """Run Tree SHAP root-cause attribution + Spatio-Temporal GNN spillover + Vision audit for an outlet."""
    oid = normalize_outlet_id(outlet_id) or outlet_id
    try:
        res = get_engine().attribute_leakage(oid)
        return {"status": "OK", "outlet_id": res["outlet_id"], "city": res["city"], "data": res}
    except KeyError as e:
        return {"status": "NOT_FOUND", "message": str(e)}


def recommend_outlet_intervention(outlet_id: str, top_k: int = 3) -> dict[str, Any]:
    """Rank top-3 Next Best Actions with recovery probability, NSV uplift, payback days, and k-NN analog stores."""
    oid = normalize_outlet_id(outlet_id) or outlet_id
    try:
        res = get_engine().recommend_nba(oid, top_k=top_k)
        return {"status": "OK", "outlet_id": res["outlet_id"], "city": res["city"], "data": res}
    except KeyError as e:
        return {"status": "NOT_FOUND", "message": str(e)}


def compare_outlet_interventions(outlet_id: str) -> dict[str, Any]:
    """Compare Recommended vs Alternative intervention side by side in a counterfactual decision matrix."""
    oid = normalize_outlet_id(outlet_id) or outlet_id
    try:
        res = get_engine().compare_counterfactual(oid)
        return {"status": "OK", "outlet_id": res["outlet_id"], "data": res}
    except KeyError as e:
        return {"status": "NOT_FOUND", "message": str(e)}


def simulate_beat_rebalance(beat_id: str) -> dict[str, Any]:
    """Simulate spatial beat split / rebalancing for a beat like BLR-B02 or HYD-B04 to recover salesman visit time and LSPC."""
    try:
        res = get_engine().simulate_beat_rebalance(beat_id)
        return {"status": "OK", "beat_id": res["beat_id"], "city": res["city"], "data": res}
    except KeyError as e:
        return {"status": "NOT_FOUND", "message": str(e)}


def ui_control(
    action: str,
    value: str = "",
    outlet_id: str = "",
    view: str = "",
) -> dict[str, Any]:
    """Drive the dashboard UI: focus_city, focus_outlet, open_outlet, open_screen, health_filter, basemap, beat_trails, fullscreen, panel, language, report."""
    res = validate_ui_command(action=action, value=value or None, outlet_id=outlet_id or None, view=view or None)
    if res["status"] == "OK":
        return {"status": "OK", "data": res}
    return res
