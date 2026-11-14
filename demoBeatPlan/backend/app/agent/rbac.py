"""Persona capability definitions for ITC TM&D BeatPulse AI."""
from __future__ import annotations

from fastapi import Header

PERSONAS: dict[str, dict[str, object]] = {
    "VP_TMD": {
        "id": "VP_TMD",
        "label": "VP TM&D (Executive)",
        "capabilities": ["city.compare", "city.health", "queue.read", "outlet.read", "beat.simulate", "report.export"],
    },
    "BRANCH_MANAGER": {
        "id": "BRANCH_MANAGER",
        "label": "Branch Manager",
        "capabilities": ["city.compare", "city.health", "queue.read", "outlet.read", "beat.simulate", "report.export"],
    },
    "FIELD_SO": {
        "id": "FIELD_SO",
        "label": "Sales Officer (SO)",
        "capabilities": ["city.health", "queue.read", "outlet.read", "beat.simulate", "report.export"],
    },
}

DEFAULT_PERSONA = "VP_TMD"


def normalize_persona(raw: str | None) -> str:
    p = (raw or DEFAULT_PERSONA).strip().upper()
    return p if p in PERSONAS else DEFAULT_PERSONA


def get_persona(x_persona: str | None = Header(None, alias="X-Persona")) -> str:
    return normalize_persona(x_persona)


def capabilities_for(persona: str | None) -> dict[str, object]:
    p = normalize_persona(persona)
    info = PERSONAS[p]
    return {
        "persona": p,
        "label": info["label"],
        "capabilities": info["capabilities"],
        "personas": [{"id": k, "label": v["label"]} for k, v in PERSONAS.items()],
    }
