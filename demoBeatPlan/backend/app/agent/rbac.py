"""Persona capability definitions for ITC TM&D BeatPulse AI."""
from __future__ import annotations

from fastapi import Header

PERSONAS: dict[str, dict[str, object]] = {
    "TMD_HEAD": {
        "id": "TMD_HEAD",
        "label": "TM&D Head / Circle",
        "scope_badge": "3-City Exec",
        "capabilities": [
            "city.compare",
            "city.health",
            "queue.read",
            "outlet.read",
            "beat.diagnose",
            "beat.simulate",
            "asm.dispatch",
            "report.export",
        ],
    },
    "BRANCH_AM": {
        "id": "BRANCH_AM",
        "label": "Branch / Area Mgr (AM)",
        "scope_badge": "AM · DMS Dispatch",
        "capabilities": [
            "city.health",
            "queue.read",
            "outlet.read",
            "beat.diagnose",
            "beat.simulate",
            "asm.dispatch",
            "report.export",
        ],
    },
    "AREA_EXEC_SO": {
        "id": "AREA_EXEC_SO",
        "label": "Area Exec / SO (WD Pilot)",
        "scope_badge": "Field Execution",
        "capabilities": [
            "city.health",
            "queue.read",
            "outlet.read",
            "beat.diagnose",
            "report.export",
        ],
    },
}

DEFAULT_PERSONA = "TMD_HEAD"

_PERSONA_ALIASES = {
    "VP_TMD": "TMD_HEAD",
    "BRANCH_MANAGER": "BRANCH_AM",
    "FIELD_SO": "AREA_EXEC_SO",
}


def normalize_persona(raw: str | None) -> str:
    p = (raw or DEFAULT_PERSONA).strip().upper()
    p = _PERSONA_ALIASES.get(p, p)
    return p if p in PERSONAS else DEFAULT_PERSONA


def get_persona(x_persona: str | None = Header(None, alias="X-Persona")) -> str:
    return normalize_persona(x_persona)


def capabilities_for(persona: str | None) -> dict[str, object]:
    p = normalize_persona(persona)
    info = PERSONAS[p]
    return {
        "persona": p,
        "label": info["label"],
        "scope_badge": info["scope_badge"],
        "capabilities": info["capabilities"],
        "personas": [{"id": k, "label": v["label"], "scope_badge": v["scope_badge"]} for k, v in PERSONAS.items()],
    }
