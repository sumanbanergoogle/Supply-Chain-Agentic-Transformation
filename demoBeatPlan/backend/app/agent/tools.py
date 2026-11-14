"""Tool-grounded ITC TM&D functions shared between text chat and Gemini Live."""
from __future__ import annotations

from typing import Any

from app.agent.ui_control import normalize_outlet_id, validate_ui_command
from app.analytics.ml_engine import get_engine
from app.data_access.repository import get_repository


def get_city_kpis(city: str = "ALL") -> dict[str, Any]:
    """Return ITC TM&D summary KPIs (outlets, zero-billing count, LSPC, monthly leakage) for ALL or Bangalore/Hyderabad/Chennai."""
    return {"status": "OK", "city": city, "data": get_engine().kpis(city)}


def compare_cities() -> dict[str, Any]:
    """Compare Bangalore, Hyderabad, and Chennai across zero-billing %, monthly revenue leakage, LSPC, and top ML root cause."""
    return {"status": "OK", "data": get_engine().compare_cities()}


def get_priority_queue(city: str = "ALL", limit: int = 10) -> dict[str, Any]:
    """Return top at-risk and zero-billing outlets ranked by monthly revenue leakage and ML churn score."""
    data = get_engine().city_health(city)
    data["priority_queue"] = data["priority_queue"][: max(1, min(int(limit), 25))]
    return {"status": "OK", "city": city, "data": data}


def query_outlets(
    city: str = "ALL",
    beat_id: str = "",
    health_status: str = "",
    dominant_cause: str = "",
    tier: str = "",
    limit: int = 10,
) -> dict[str, Any]:
    """Filter ITC GT outlets dynamically across Bangalore, Hyderabad, Chennai by beat, health (healthy/warning/critical), root cause (hero_sku_stockout/qcommerce_spillover/beat_coverage_fatigue/credit_margin_squeeze/assortment_tier_mismatch), or tier."""
    df = get_engine().outlets.copy()
    if city and city.upper() != "ALL":
        df = df[df["city"].str.lower() == city.strip().lower()]
    if beat_id:
        df = df[df["beat_id"].str.upper() == beat_id.strip().upper()]
    if health_status:
        df = df[df["health_status"].str.lower() == health_status.strip().lower()]
    if dominant_cause:
        df = df[df["dominant_cause"].str.lower().str.contains(dominant_cause.strip().lower(), regex=False)]
    if tier:
        df = df[df["tier"].str.lower().str.contains(tier.strip().lower(), regex=False)]

    total_leakage = float(df["revenue_leakage_monthly_inr"].sum()) if len(df) else 0.0
    sub = df.sort_values("revenue_leakage_monthly_inr", ascending=False).head(max(1, min(int(limit), 20)))
    return {
        "status": "OK",
        "city": city,
        "count": int(len(df)),
        "total_monthly_leakage_inr": round(total_leakage, 0),
        "avg_lspc": round(float(df["current_lspc"].mean()), 1) if len(df) else 0.0,
        "outlets": sub[
            [
                "outlet_id",
                "name",
                "city",
                "beat_id",
                "health_status",
                "dominant_cause",
                "current_lspc",
                "target_lspc",
                "revenue_leakage_monthly_inr",
                "churn_prob",
            ]
        ].to_dict(orient="records"),
    }


def get_sku_category_breakdown(city: str = "ALL", beat_id: str = "", outlet_id: str = "") -> dict[str, Any]:
    """Analyze weekly ITC category sales (Foods, Personal Care, Stationery, Matches & Agarbatti) and recent erosion across any city, beat, or outlet."""
    repo = get_repository()
    df = repo.weekly_telemetry
    if outlet_id:
        oid = normalize_outlet_id(outlet_id) or outlet_id
        df = df[df["outlet_id"].str.upper() == oid.upper()]
    elif beat_id:
        df = df[df["beat_id"].str.upper() == beat_id.strip().upper()]
    elif city and city.upper() != "ALL":
        df = df[df["city"].str.lower() == city.strip().lower()]

    if df.empty:
        return {"status": "NOT_FOUND", "message": "No telemetry rows match filter"}

    early = df[df["week_index"] <= 6]
    recent = df[df["week_index"] >= 21]
    cats = ["foods_inr", "personal_care_inr", "stationery_inr", "agarbatti_matches_inr"]
    breakdown = {}
    for c in cats:
        b = float(early[c].mean()) * 4.0
        cur = float(recent[c].mean()) * 4.0
        pct = round(((cur - b) / b) * 100.0, 1) if b > 0 else 0.0
        breakdown[c.replace("_inr", "")] = {"baseline_monthly_inr": round(b, 0), "current_monthly_inr": round(cur, 0), "change_pct": pct}
    return {"status": "OK", "scope": outlet_id or beat_id or city, "categories": breakdown}


def get_distributor_performance(city: str = "ALL") -> dict[str, Any]:
    """Return Wholesale Distributor (WD) fill rates, zero-billing outlet exposure, and monthly leakage per distributor."""
    eng = get_engine()
    repo = get_repository()
    wds = repo.wd_master
    outlets = eng.outlets
    if city and city.upper() != "ALL":
        wds = wds[wds["city"].str.lower() == city.strip().lower()]
        outlets = outlets[outlets["city"].str.lower() == city.strip().lower()]

    rows = []
    for wd in wds.to_dict(orient="records"):
        sub = outlets[outlets["wd_id"] == wd["wd_id"]]
        rows.append(
            {
                "wd_id": wd["wd_id"],
                "name": wd["name"],
                "city": wd["city"],
                "hub": wd["hub"],
                "avg_fill_rate": round(float(sub["wd_fill_rate"].mean()), 3) if len(sub) else wd["fill_rate_base"],
                "outlets_served": int(len(sub)),
                "zero_billing_outlets": int((sub["health_status"] == "critical").sum()),
                "monthly_leakage_inr": round(float(sub["revenue_leakage_monthly_inr"].sum()), 0),
            }
        )
    return {"status": "OK", "city": city, "distributors": rows}


def get_outlet_profile(outlet_id: str) -> dict[str, Any]:
    """Return full outlet profile, WD, beat info, storefront vision note, and KPIs (e.g. BLR-701 Lakshmi Super Mart)."""
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


def diagnose_beat_leakage(beat_id: str) -> dict[str, Any]:
    """Run Beat-level SHAP + Spatio-Temporal GNN + Planned vs Actual SFA GPS Reality Check for a beat (e.g. BLR-B04 or BLR-B07)."""
    try:
        res = get_engine().diagnose_beat(beat_id)
        return {"status": "OK", "beat_id": res["beat"]["beat_id"], "city": res["beat"]["city"], "data": res}
    except KeyError as e:
        return {"status": "NOT_FOUND", "message": str(e)}


def recommend_outlet_intervention(outlet_id: str, top_k: int = 3) -> dict[str, Any]:
    """Rank top-3 Next Best Actions with recovery probability, NSV uplift, payback days, and k-NN analog stores."""
    oid = normalize_outlet_id(outlet_id) or outlet_id
    try:
        res = get_engine().recommend_nba(oid, top_k=int(top_k))
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
    """Simulate spatial beat split / rebalancing for a beat like BLR-B04 or BLR-B07 to recover salesman visit time and revenue."""
    try:
        res = get_engine().simulate_beat_rebalance(beat_id)
        return {"status": "OK", "beat_id": res["beat_id"], "city": res["city"], "data": res}
    except KeyError as e:
        return {"status": "NOT_FOUND", "message": str(e)}


def dispatch_asm_action(beat_id: str, note: str = "") -> dict[str, Any]:
    """Create and send an actionable beat rebalance + priority stock allocation ticket to the ASM & WD."""
    res = get_engine().dispatch_asm_action(beat_id=beat_id, note=note)
    return {"status": "OK", "beat_id": res["beat_id"], "data": res}


def ui_control(
    action: str,
    value: str = "",
    outlet_id: str = "",
    view: str = "",
) -> dict[str, Any]:
    """Drive the dashboard UI: focus_city, focus_beat, focus_outlet, open_outlet, open_screen, health_filter, basemap, flowlines, fullscreen, panel, language, report."""
    res = validate_ui_command(action=action, value=value or None, outlet_id=outlet_id or None, view=view or None)
    if res["status"] == "OK":
        return {"status": "OK", "data": res}
    return res


ALL_TOOLS = [
    get_city_kpis,
    compare_cities,
    get_priority_queue,
    query_outlets,
    get_sku_category_breakdown,
    get_distributor_performance,
    get_outlet_profile,
    diagnose_outlet_leakage,
    diagnose_beat_leakage,
    recommend_outlet_intervention,
    compare_outlet_interventions,
    simulate_beat_rebalance,
    dispatch_asm_action,
    ui_control,
]

TOOL_REGISTRY = {fn.__name__: fn for fn in ALL_TOOLS}
