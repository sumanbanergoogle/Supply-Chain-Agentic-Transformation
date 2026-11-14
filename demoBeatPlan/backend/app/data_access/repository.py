"""Parquet-backed repository for ITC TM&D BeatPulse AI."""
from __future__ import annotations

from functools import lru_cache
from typing import Any

import pandas as pd

from app import settings
from app.analytics.generator import generate_dataset


class BeatPulseRepository:
    """In-memory cached repository backed by synthetic parquet tables."""

    def __init__(self) -> None:
        landing = settings.LANDING_DIR
        required = [
            "wd_master.parquet",
            "dark_stores.parquet",
            "beat_master.parquet",
            "outlet_master.parquet",
            "weekly_telemetry.parquet",
            "intervention_history.parquet",
        ]
        if not all((landing / fname).exists() for fname in required):
            generate_dataset(landing)

        self.wd_master: pd.DataFrame = pd.read_parquet(landing / "wd_master.parquet")
        self.dark_stores: pd.DataFrame = pd.read_parquet(landing / "dark_stores.parquet")
        self.beat_master: pd.DataFrame = pd.read_parquet(landing / "beat_master.parquet")
        self.outlet_master: pd.DataFrame = pd.read_parquet(landing / "outlet_master.parquet")
        self.weekly_telemetry: pd.DataFrame = pd.read_parquet(landing / "weekly_telemetry.parquet")
        self.intervention_history: pd.DataFrame = pd.read_parquet(landing / "intervention_history.parquet")

    def list_outlets(
        self,
        city: str | None = None,
        beat_id: str | None = None,
        health: str | None = None,
        query: str | None = None,
    ) -> list[dict[str, Any]]:
        df = self.outlet_master
        if city and city.upper() != "ALL":
            df = df[df["city"].str.lower() == city.strip().lower()]
        if beat_id:
            df = df[df["beat_id"].str.lower() == beat_id.strip().lower()]
        if health and health.lower() != "all":
            h = health.lower()
            if h in ("zero_billing", "not_producing", "critical"):
                df = df[df["health_status"] == "critical"]
            elif h in ("attention", "at_risk", "warning"):
                df = df[df["health_status"] == "warning"]
            elif h in ("healthy", "productive"):
                df = df[df["health_status"] == "healthy"]
        if query and query.strip():
            q = query.strip().lower()
            mask = (
                df["outlet_id"].str.lower().str.contains(q, regex=False)
                | df["name"].str.lower().str.contains(q, regex=False)
                | df["zone"].str.lower().str.contains(q, regex=False)
                | df["beat_id"].str.lower().str.contains(q, regex=False)
                | df["wd_name"].str.lower().str.contains(q, regex=False)
            )
            df = df[mask]
        return df.to_dict(orient="records")

    def get_outlet(self, outlet_id: str) -> dict[str, Any] | None:
        norm = outlet_id.strip().upper()
        sub = self.outlet_master[self.outlet_master["outlet_id"].str.upper() == norm]
        if sub.empty:
            return None
        return sub.iloc[0].to_dict()

    def get_outlet_history(self, outlet_id: str) -> list[dict[str, Any]]:
        norm = outlet_id.strip().upper()
        sub = self.weekly_telemetry[self.weekly_telemetry["outlet_id"].str.upper() == norm].sort_values("week_index")
        return sub.to_dict(orient="records")

    def get_city_infrastructure(self, city: str | None = None) -> dict[str, Any]:
        wds = self.wd_master
        ds = self.dark_stores
        beats = self.beat_master
        if city and city.upper() != "ALL":
            c = city.strip().lower()
            wds = wds[wds["city"].str.lower() == c]
            ds = ds[ds["city"].str.lower() == c]
            beats = beats[beats["city"].str.lower() == c]
        return {
            "wds": wds.to_dict(orient="records"),
            "dark_stores": ds.to_dict(orient="records"),
            "beats": beats.to_dict(orient="records"),
        }


@lru_cache(maxsize=1)
def get_repository() -> BeatPulseRepository:
    return BeatPulseRepository()
