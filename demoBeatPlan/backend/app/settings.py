"""Application settings for BeatPulse AI (ITC TM&D)."""
from __future__ import annotations

import os
from datetime import date
from pathlib import Path

AS_OF: date = date(2026, 11, 14)

APP_DIR = Path(__file__).resolve().parent
DATA_DIR = APP_DIR / "data"
LANDING_DIR = Path(os.getenv("BEATPULSE_LANDING_DIR", str(DATA_DIR / "landing")))

PROJECT_ID: str = (
    os.getenv("BEATPULSE_PROJECT_ID")
    or os.getenv("GOOGLE_CLOUD_PROJECT")
    or "itc-tmd-agentic-demo"
)
TEXT_MODEL: str = os.getenv("BEATPULSE_TEXT_MODEL", "gemini-3.8-flash")
TEXT_LOCATION: str = os.getenv("BEATPULSE_TEXT_LOCATION", "global")
AGENT_LLM: str = os.getenv("BEATPULSE_AGENT_LLM", "vertex").lower()
DEFAULT_LANGUAGE: str = os.getenv("BEATPULSE_DEFAULT_LANGUAGE", "english").lower()


def get_gemini_api_key(override: str | None = None) -> str:
    """Resolve optional Gemini API key from request override, env, or local user config (~/.config/itc_tmd_demo/gemini_api_key)."""
    if override and override.strip():
        return override.strip()
    env_key = (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip()
    if env_key:
        return env_key
    key_file = Path.home() / ".config" / "itc_tmd_demo" / "gemini_api_key"
    if key_file.is_file():
        try:
            return key_file.read_text(encoding="utf-8").strip()
        except OSError:
            pass
    return ""

CITIES = ("Bangalore", "Hyderabad", "Chennai")

ITC_PORTFOLIO = {
    "Foods": ["Aashirvaad Atta 5kg", "Sunfeast Dark Fantasy", "Bingo! Mad Angles", "YiPPee! Magic Masala"],
    "Personal Care": ["Savlon Deep Clean", "Fiama Gel Bar", "Vivel Body Wash"],
    "Stationery": ["Classmate Pulse 180pg", "Paperkraft Premium"],
    "Matches & Agarbatti": ["Mangaldeep Sandalwood", "Aim Homelites"],
}
