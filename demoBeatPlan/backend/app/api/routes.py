"""REST endpoints for ITC TM&D BeatPulse AI."""
from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from app import settings
from app.agent import rbac, tools as agent_tools
from app.agent.runner import run_turn_async
from app.analytics.ml_engine import get_engine
from app.data_access.repository import get_repository

router = APIRouter()


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    session_id: str | None = None
    language: Literal["english", "hinglish", "hindi"] = "english"
    city: str | None = None
    outlet_id: str | None = None
    screen: str | None = None


class ToolExecRequest(BaseModel):
    name: str
    args: dict[str, Any] = {}


class DispatchRequest(BaseModel):
    note: str = ""


@router.get("/health")
def health() -> dict[str, Any]:
    engine = get_engine()
    return {
        "status": "ok",
        "service": "beatpulse-itc-tmd",
        "cities": list(settings.CITIES),
        "total_outlets": len(engine.outlets),
        "as_of": settings.AS_OF.isoformat(),
    }


@router.get("/me/capabilities")
def me_capabilities(persona: str = Depends(rbac.get_persona)) -> dict[str, Any]:
    return rbac.capabilities_for(persona)


@router.get("/kpis")
def kpis(city: str = "ALL") -> dict[str, Any]:
    return get_engine().kpis(city)


@router.get("/cities/compare")
def compare_cities() -> dict[str, Any]:
    return get_engine().compare_cities()


@router.get("/cities/{city}/health")
def city_health(city: str) -> dict[str, Any]:
    return get_engine().city_health(city)


@router.get("/geo/infrastructure")
def geo_infrastructure(city: str = "ALL") -> dict[str, Any]:
    return get_repository().get_city_infrastructure(city)


@router.get("/outlets")
def list_outlets(
    city: str = "ALL",
    beat: str | None = None,
    health: str = "all",
    q: str | None = None,
) -> list[dict[str, Any]]:
    rows = get_repository().list_outlets(city=city, beat_id=beat, health=health, query=q)
    idx = get_engine()._outlet_index
    return [idx.get(r["outlet_id"], r) for r in rows]


@router.get("/outlets/{outlet_id}")
def get_outlet_detail(outlet_id: str) -> dict[str, Any]:
    eng = get_engine()
    row = eng._outlet_index.get(outlet_id.strip().upper())
    if not row:
        raise HTTPException(status_code=404, detail=f"Outlet {outlet_id} not found")
    return {
        "outlet": row,
        "attribution": eng.attribute_leakage(row["outlet_id"]),
        "recommendations": eng.recommend_nba(row["outlet_id"]),
        "nearby": eng.nearby_outlets(row["outlet_id"]),
    }


@router.get("/outlets/{outlet_id}/history")
def get_outlet_history(outlet_id: str) -> list[dict[str, Any]]:
    hist = get_repository().get_outlet_history(outlet_id)
    if not hist:
        raise HTTPException(status_code=404, detail=f"Outlet {outlet_id} not found")
    return hist


@router.get("/outlets/{outlet_id}/counterfactual")
def get_counterfactual(outlet_id: str, recommended: str | None = None, alternative: str | None = None) -> dict[str, Any]:
    try:
        return get_engine().compare_counterfactual(outlet_id, recommended=recommended, alternative=alternative)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get("/outlets/{outlet_id}/report")
def get_outlet_report(outlet_id: str) -> dict[str, Any]:
    try:
        return get_engine().build_field_report(outlet_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get("/beats")
def list_beats(city: str = "ALL") -> list[dict[str, Any]]:
    repo = get_repository()
    df = repo.beat_master
    if city and city.upper() != "ALL":
        df = df[df["city"].str.lower() == city.strip().lower()]
    return df.to_dict(orient="records")


@router.get("/beats/{beat_id}/diagnose")
def diagnose_beat(beat_id: str) -> dict[str, Any]:
    try:
        return get_engine().diagnose_beat(beat_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.post("/beats/{beat_id}/simulate")
def simulate_beat(beat_id: str) -> dict[str, Any]:
    try:
        return get_engine().simulate_beat_rebalance(beat_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.post("/beats/{beat_id}/dispatch")
def dispatch_beat(beat_id: str, req: DispatchRequest) -> dict[str, Any]:
    return get_engine().dispatch_asm_action(beat_id=beat_id, note=req.note)


@router.post("/tools/execute")
def execute_tool_endpoint(req: ToolExecRequest) -> dict[str, Any]:
    fn = agent_tools.TOOL_REGISTRY.get(req.name)
    if not fn:
        raise HTTPException(status_code=404, detail=f"Unknown tool {req.name}")
    return fn(**(req.args or {}))


@router.get("/tools/declarations")
def tool_declarations() -> dict[str, Any]:
    from app.live import voice_tools

    out = []
    for name, vt in voice_tools.VOICE_TOOLS.items():
        import inspect

        sig = inspect.signature(vt.fn)
        props = {}
        req = []
        for pname, param in sig.parameters.items():
            ptype = "integer" if param.annotation is int else ("number" if param.annotation is float else "string")
            props[pname] = {"type": ptype, "description": f"Parameter {pname}"}
            if param.default is inspect.Parameter.empty:
                req.append(pname)
        out.append(
            {
                "name": name,
                "description": vt.description,
                "parameters": {"type": "object", "properties": props, "required": req},
            }
        )
    return {"declarations": out}


@router.post("/chat")
async def post_chat(
    req: ChatRequest,
    persona: str = Depends(rbac.get_persona),
    x_gemini_api_key: str | None = Header(None, alias="X-Gemini-Api-Key"),
) -> dict[str, Any]:
    return await run_turn_async(
        session_id=req.session_id,
        user_id="web",
        persona=persona,
        city=req.city,
        outlet_id=req.outlet_id,
        language=req.language,
        text=req.message,
        screen=req.screen,
        api_key=x_gemini_api_key,
    )
