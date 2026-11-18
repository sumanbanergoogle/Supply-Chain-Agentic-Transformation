"""Allow-listed UI command vocabulary for agentic screen control."""
from __future__ import annotations

import re
from typing import Any

UI_ACTIONS: dict[str, tuple[str, ...] | None] = {
    "map_view": ("india", "city"),
    "fullscreen": ("on", "off"),
    "basemap": ("satellite", "street"),
    "flowlines": ("on", "off"),
    "legend": ("on", "off"),
    "zoom": ("in", "out"),
    "focus_city": ("Bangalore", "Hyderabad", "Chennai", "ALL"),
    "focus_beat": None,
    "focus_outlet": None,
    "open_outlet": None,
    "open_screen": ("beat_history", "city_compare", "city_health", "beat_simulator", "beat_diagnosis"),
    "panel": ("expand", "restore", "close"),
    "language": ("english", "hinglish", "hindi"),
    "report": ("open", "print", "close"),
    "agent": ("dock", "undock"),
    "health_filter": ("all", "healthy", "attention", "critical"),
}

OUTLET_VIEWS = (
    "summary",
    "overview",
    "telemetry",
    "diagnosis",
    "vision",
    "recommendation",
    "compare",
    "nearby",
)

_ALIASES: dict[str, dict[str, str]] = {
    "focus_city": {
        "all": "ALL",
        "blr": "Bangalore",
        "bengaluru": "Bangalore",
        "bangalore": "Bangalore",
        "hyd": "Hyderabad",
        "hyderabad": "Hyderabad",
        "chn": "Chennai",
        "madras": "Chennai",
        "chennai": "Chennai",
    },
    "health_filter": {
        "all": "all",
        "none": "all",
        "green": "healthy",
        "productive": "healthy",
        "healthy": "healthy",
        "amber": "attention",
        "yellow": "attention",
        "at_risk": "attention",
        "attention": "attention",
        "red": "critical",
        "zero": "critical",
        "zero_billing": "critical",
        "zero-billing": "critical",
        "critical": "critical",
    },
    "open_screen": {
        "history": "beat_history",
        "compare": "city_compare",
        "cities": "city_compare",
        "health": "city_health",
        "priority": "city_health",
        "queue": "city_health",
        "beat": "beat_simulator",
        "simulate": "beat_simulator",
        "diagnose": "beat_diagnosis",
    },
    "basemap": {"dark": "street", "scada": "street", "satellite": "satellite", "sat": "satellite"},
    "language": {"en": "english", "english": "english", "hi": "hindi", "hindi": "hindi", "hinglish": "hinglish"},
}

_OUTLET_RE = re.compile(r"\b(BLR|HYD|CHN)[-\s]?(\d{3})\b", re.IGNORECASE)


def normalize_outlet_id(raw: str | None) -> str | None:
    if not raw:
        return None
    if "lakshmi" in raw.lower():
        return "BLR-701"
    m = _OUTLET_RE.search(raw.strip())
    if m:
        return f"{m.group(1).upper()}-{m.group(2)}"
    return raw.strip().upper()


def validate_ui_command(
    action: str,
    value: str | None = None,
    outlet_id: str | None = None,
    view: str | None = None,
) -> dict[str, Any]:
    act = (action or "").strip().lower()
    if act not in UI_ACTIONS:
        return {"status": "ERROR", "message": f"Unsupported UI action: {action}"}

    val = (value or "").strip()
    if act in _ALIASES and val.lower() in _ALIASES[act]:
        val = _ALIASES[act][val.lower()]

    allowed = UI_ACTIONS[act]
    if allowed is not None and val not in allowed:
        if act == "language":
            return {
                "status": "ERROR",
                "message": f"Unsupported language '{value}'. Only english, hindi, and hinglish are supported.",
            }
        val = allowed[0]

    norm_outlet = normalize_outlet_id(outlet_id or (val if act in ("focus_outlet", "open_outlet") else None))
    if act in ("focus_outlet", "open_outlet") and not norm_outlet:
        return {"status": "ERROR", "message": "Missing outlet_id for outlet action"}

    cmd: dict[str, Any] = {"action": act}
    if val:
        cmd["value"] = val
    if norm_outlet:
        cmd["outlet_id"] = norm_outlet
    if view and view.lower() in OUTLET_VIEWS:
        cmd["view"] = view.lower()
    return {"status": "OK", "command": cmd}
