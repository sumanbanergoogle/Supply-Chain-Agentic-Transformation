"""Deterministic synthetic data generator for ITC TM&D (Bangalore, Hyderabad, Chennai).

Produces realistic General Trade (GT) outlet master records, Wholesale Distributors (WD),
Beat definitions, 24-week category/LSPC/revenue telemetry, Quick-Commerce dark store POIs,
and historical intervention outcomes for k-NN analog matching and ML training.
"""
from __future__ import annotations

import math
from datetime import timedelta
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from app import settings

CITY_CONFIG: dict[str, dict[str, Any]] = {
    "Bangalore": {
        "code": "BLR",
        "region": "South Branch · Karnataka",
        "center": (12.9716, 77.5946),
        "wds": [
            {"wd_id": "BLR-WD-01", "name": "Sri Lakshmi Venkateshwara Agencies", "hub": "Indiranagar", "lat": 12.9784, "lng": 77.6408, "fill_rate_base": 0.91},
            {"wd_id": "BLR-WD-02", "name": "Kaveri FMCG Distributors", "hub": "Koramangala", "lat": 12.9352, "lng": 77.6245, "fill_rate_base": 0.84},
            {"wd_id": "BLR-WD-03", "name": "Metro Horizon Stockists", "hub": "Malleswaram", "lat": 13.0031, "lng": 77.5643, "fill_rate_base": 0.94},
        ],
        "zones": [
            ("Indiranagar 100ft Rd", 12.9765, 77.6412, "BLR-WD-01", "BLR-B01", "Raghavendra Rao"),
            ("Koramangala 4th Block", 12.9345, 77.6266, "BLR-WD-02", "BLR-B02", "Karthik Gowda"),
            ("HSR Layout Sector 2", 12.9121, 77.6446, "BLR-WD-02", "BLR-B03", "Suresh Naik"),
            ("Whitefield ITPL Main", 12.9855, 77.7363, "BLR-WD-01", "BLR-B04", "Prashanth K"),
            ("Malleswaram 8th Cross", 13.0022, 77.5712, "BLR-WD-03", "BLR-B05", "Manjunath B"),
            ("Jayanagar 4th Block", 12.9299, 77.5838, "BLR-WD-03", "BLR-B06", "Deepak Shetty"),
        ],
        "dark_stores": [
            {"poi_id": "BLR-QC-01", "name": "Zepto Pod · Indiranagar", "lat": 12.9741, "lng": 77.6380, "intensity": 0.92},
            {"poi_id": "BLR-QC-02", "name": "Blinkit Hub · Koramangala", "lat": 12.9368, "lng": 77.6215, "intensity": 0.95},
            {"poi_id": "BLR-QC-03", "name": "Instamart Dark · HSR", "lat": 12.9154, "lng": 77.6401, "intensity": 0.88},
            {"poi_id": "BLR-QC-04", "name": "Zepto Pod · Whitefield", "lat": 12.9822, "lng": 77.7310, "intensity": 0.85},
        ],
        "store_names": [
            "Annapurna Kirana & Provision", "Sri Sai Super Mart", "Nandini General Stores", "Bharath Provision Bazaar",
            "Cauvery Kirana Mart", "Lakshmi Ganesh Stores", "Metro Corner Grocers", "Vidya Stationery & Provisions",
            "Balaji Departmental", "Venkateshwara Kirana", "Surya Mini Supermarket", "Nagaraj Traders",
        ],
    },
    "Hyderabad": {
        "code": "HYD",
        "region": "South Branch · Telangana",
        "center": (17.4126, 78.4482),
        "wds": [
            {"wd_id": "HYD-WD-01", "name": "Deccan Value Chain Distributors", "hub": "Madhapur", "lat": 17.4483, "lng": 78.3915, "fill_rate_base": 0.86},
            {"wd_id": "HYD-WD-02", "name": "Bhagyanagar Trade Links", "hub": "Banjara Hills", "lat": 17.4156, "lng": 78.4347, "fill_rate_base": 0.92},
            {"wd_id": "HYD-WD-03", "name": "Charminar General Agencies", "hub": "Secunderabad", "lat": 17.4399, "lng": 78.4983, "fill_rate_base": 0.89},
        ],
        "zones": [
            ("Madhapur Ayyappa Society", 17.4495, 78.3912, "HYD-WD-01", "HYD-B01", "Srinivas Reddy"),
            ("Gachibowli DLF Road", 17.4401, 78.3489, "HYD-WD-01", "HYD-B02", "Mahesh Babu V"),
            ("Banjara Hills Rd No 12", 17.4123, 78.4384, "HYD-WD-02", "HYD-B03", "Imran Khan"),
            ("Kukatpally KPHB Phase 3", 17.4948, 78.3996, "HYD-WD-02", "HYD-B04", "Ravi Teja K"),
            ("Secunderabad PG Road", 17.4412, 78.4951, "HYD-WD-03", "HYD-B05", "Anil Kumar G"),
            ("Jubilee Hills Checkpost", 17.4288, 78.4071, "HYD-WD-03", "HYD-B06", "Harish Sharma"),
        ],
        "dark_stores": [
            {"poi_id": "HYD-QC-01", "name": "Zepto Pod · Madhapur", "lat": 17.4472, "lng": 78.3888, "intensity": 0.90},
            {"poi_id": "HYD-QC-02", "name": "Blinkit Hub · Gachibowli", "lat": 17.4425, "lng": 78.3522, "intensity": 0.87},
            {"poi_id": "HYD-QC-03", "name": "Instamart Dark · KPHB", "lat": 17.4910, "lng": 78.4025, "intensity": 0.82},
        ],
        "store_names": [
            "Kakatiya Super Kirana", "Deccan Provision Stores", "Sri Kanaka Durga Mart", "Nizamabad General Traders",
            "Telangana Kirana Bazaar", "Padmavathi Super Market", "Banjara Mini Mart", "Jubilee Everyday Stores",
            "Secunderabad Provision Hub", "Vijaya Lakshmi Kirana", "Golkonda General Store", "Sai Ram Traders",
        ],
    },
    "Chennai": {
        "code": "CHN",
        "region": "South Branch · Tamil Nadu",
        "center": (13.0475, 80.2290),
        "wds": [
            {"wd_id": "CHN-WD-01", "name": "Coromandel Merchandising Corp", "hub": "T. Nagar", "lat": 13.0418, "lng": 80.2341, "fill_rate_base": 0.93},
            {"wd_id": "CHN-WD-02", "name": "Marina FMCG Stockists", "hub": "Velachery", "lat": 12.9815, "lng": 80.2180, "fill_rate_base": 0.85},
            {"wd_id": "CHN-WD-03", "name": "Madras Retail Network", "hub": "Anna Nagar", "lat": 13.0850, "lng": 80.2101, "fill_rate_base": 0.90},
        ],
        "zones": [
            ("T. Nagar Usman Road", 13.0408, 80.2337, "CHN-WD-01", "CHN-B01", "Murugan S"),
            ("Adyar LB Road", 13.0067, 80.2571, "CHN-WD-01", "CHN-B02", "Karthikeyan R"),
            ("Velachery Bypass Rd", 12.9801, 80.2212, "CHN-WD-02", "CHN-B03", "Senthil Kumar"),
            ("OMR Thoraipakkam", 12.9416, 80.2362, "CHN-WD-02", "CHN-B04", "Aravindhan P"),
            ("Anna Nagar 2nd Ave", 13.0846, 80.2136, "CHN-WD-03", "CHN-B05", "Balaji Narayanan"),
            ("Porur Trunk Road", 13.0382, 80.1565, "CHN-WD-03", "CHN-B06", "Vignesh M"),
        ],
        "dark_stores": [
            {"poi_id": "CHN-QC-01", "name": "Blinkit Hub · Velachery", "lat": 12.9788, "lng": 80.2194, "intensity": 0.89},
            {"poi_id": "CHN-QC-02", "name": "Zepto Pod · OMR", "lat": 12.9455, "lng": 80.2331, "intensity": 0.91},
            {"poi_id": "CHN-QC-03", "name": "Instamart Dark · T. Nagar", "lat": 13.0439, "lng": 80.2375, "intensity": 0.79},
        ],
        "store_names": [
            "Murugan Maligai & Provision", "Sri Karpagam Super Store", "Chola Departmental Mart", "Adyar Annai Kirana",
            "Vellalar Provision Stores", "Thirumalai General Store", "Marina Corner Mart", "Kaveri Maligai Kadai",
            "Anbu Traders & Stationery", "Pallava Super Market", "Saravana Mini Bazaar", "Nila Consumer Stores",
        ],
    },
}

CHANNEL_TYPES = ["Urban Kirana", "Modern Mini-Mart", "Cosmetic & Chemist", "Stationery & Impulse", "Top-Tier Grocer"]
ARCHETYPES = ["healthy_core", "attention_erosion", "critical_zero_billing"]

ROOT_CAUSE_PROFILES = [
    "hero_sku_stockout",        # Supply Chain / WD fill rate drop on Aashirvaad / Sunfeast
    "qcommerce_spillover",      # Zepto/Blinkit dark store discounting within 1.0km
    "beat_coverage_fatigue",    # Overloaded beat / rushed <4 min salesman calls
    "credit_margin_squeeze",    # Overdue DSO blocking invoice release / lower trade scheme
    "assortment_tier_mismatch", # Missing Personal Care / Classmate bundles (storefront potential mismatch)
]


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def generate_dataset(output_dir: Path | None = None, seed: int = 2026) -> dict[str, pd.DataFrame]:
    """Generate and persist synthetic ITC TM&D tables under LANDING_DIR."""
    rng = np.random.default_rng(seed)
    out_dir = output_dir or settings.LANDING_DIR
    out_dir.mkdir(parents=True, exist_ok=True)

    wd_rows: list[dict[str, Any]] = []
    poi_rows: list[dict[str, Any]] = []
    beat_rows: list[dict[str, Any]] = []
    outlet_rows: list[dict[str, Any]] = []
    weekly_rows: list[dict[str, Any]] = []
    intervention_rows: list[dict[str, Any]] = []

    weeks = [settings.AS_OF - timedelta(weeks=23 - i) for i in range(24)]

    for city, cfg in CITY_CONFIG.items():
        code = cfg["code"]
        wd_lookup = {w["wd_id"]: w for w in cfg["wds"]}
        for w in cfg["wds"]:
            wd_rows.append({"city": city, **w})
        for p in cfg["dark_stores"]:
            poi_rows.append({"city": city, **p})

        outlet_seq = 101
        for z_idx, (zone_name, zlat, zlng, wd_id, beat_id, salesman) in enumerate(cfg["zones"]):
            # Determine beat congestion character: beats B02, B04 tend to be overloaded in traffic
            overloaded = beat_id.endswith(("B02", "B04"))
            beat_rows.append(
                {
                    "beat_id": beat_id,
                    "city": city,
                    "wd_id": wd_id,
                    "wd_name": wd_lookup[wd_id]["name"],
                    "zone": zone_name,
                    "salesman_name": salesman,
                    "visit_day": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][z_idx % 6],
                    "planned_outlets": 6,
                    "planned_distance_km": round(16.5 if overloaded else 11.2, 1),
                    "actual_distance_km": round(24.8 if overloaded else 12.6, 1),
                    "beat_load_index": round(1.36 if overloaded else 0.94, 2),
                }
            )

            # 6 outlets per beat = 36 per city, 108 total
            for local_i in range(6):
                oid = f"{code}-{outlet_seq:03d}"
                outlet_seq += 1

                # Deterministic + realistic mix (~45% healthy, ~30% attention, ~25% critical)
                roll = rng.random()
                if overloaded and local_i in (1, 4):
                    archetype = "critical_zero_billing"
                elif roll < 0.44:
                    archetype = "healthy_core"
                elif roll < 0.75:
                    archetype = "attention_erosion"
                else:
                    archetype = "critical_zero_billing"

                # Coordinates clustered realistically around the neighborhood zone
                angle = (local_i * 1.05) + rng.uniform(-0.35, 0.35)
                radius_deg = rng.uniform(0.0025, 0.0115)
                olat = round(zlat + radius_deg * math.sin(angle), 6)
                olng = round(zlng + radius_deg * math.cos(angle), 6)

                nearest_qc = min(
                    cfg["dark_stores"],
                    key=lambda ds: _haversine_km(olat, olng, ds["lat"], ds["lng"]),
                )
                qc_dist_km = round(_haversine_km(olat, olng, nearest_qc["lat"], nearest_qc["lng"]), 2)
                wd_dist_km = round(_haversine_km(olat, olng, wd_lookup[wd_id]["lat"], wd_lookup[wd_id]["lng"]), 2)

                # Assign dominant root cause when unhealthy
                if archetype == "healthy_core":
                    dominant_cause = "none"
                else:
                    if qc_dist_km < 1.15 and rng.random() < 0.55:
                        dominant_cause = "qcommerce_spillover"
                    elif overloaded and rng.random() < 0.5:
                        dominant_cause = "beat_coverage_fatigue"
                    elif wd_lookup[wd_id]["fill_rate_base"] < 0.87 and rng.random() < 0.55:
                        dominant_cause = "hero_sku_stockout"
                    else:
                        dominant_cause = ROOT_CAUSE_PROFILES[int(rng.integers(0, len(ROOT_CAUSE_PROFILES)))]

                channel = CHANNEL_TYPES[(z_idx + local_i) % len(CHANNEL_TYPES)]
                tier = "Platinum" if (local_i % 4 == 0) else ("Gold" if (local_i % 2 == 0) else "Silver")
                base_nsv = {"Platinum": 42000.0, "Gold": 26500.0, "Silver": 15200.0}[tier] * rng.uniform(0.88, 1.18)
                target_lspc = {"Platinum": 11.0, "Gold": 8.0, "Silver": 6.0}[tier]

                # Feature baselines shaped by archetype & dominant cause
                fill_rate = wd_lookup[wd_id]["fill_rate_base"] - (0.21 if dominant_cause == "hero_sku_stockout" else 0.02)
                fill_rate = float(np.clip(fill_rate + rng.normal(0, 0.025), 0.52, 0.98))

                visit_dur_min = 9.2 if archetype == "healthy_core" else (5.1 if archetype == "attention_erosion" else 2.8)
                if dominant_cause == "beat_coverage_fatigue":
                    visit_dur_min = min(visit_dur_min, float(rng.uniform(1.8, 3.4)))
                visit_dur_min = round(float(np.clip(visit_dur_min + rng.normal(0, 0.6), 1.4, 14.0)), 1)

                credit_overdue_days = 4 if archetype == "healthy_core" else int(rng.integers(9, 28))
                if dominant_cause == "credit_margin_squeeze":
                    credit_overdue_days = int(rng.integers(24, 48))

                vision_shelf_gap = 0.08 if archetype == "healthy_core" else float(rng.uniform(0.22, 0.45))
                if dominant_cause == "assortment_tier_mismatch":
                    vision_shelf_gap = float(rng.uniform(0.48, 0.72))

                store_base = cfg["store_names"][(z_idx * 2 + local_i) % len(cfg["store_names"])]
                outlet_name = f"{store_base} #{outlet_seq}"

                # Build 24-week telemetry time series
                zero_bill_streak = 0
                latest_nsv = 0.0
                latest_lspc = 0.0
                baseline_4w_nsv = 0.0
                w_records = []

                for wi, wk_date in enumerate(weeks):
                    t = wi / 23.0
                    festival_boost = 1.14 if wi in (18, 19, 20) else 1.0  # festive pre-stocking lift in Q4

                    if archetype == "healthy_core":
                        decay = 1.0 + 0.04 * math.sin(wi / 3.0)
                    elif archetype == "attention_erosion":
                        # Steady LSPC erosion starting week 12
                        decay = 1.0 - max(0.0, (wi - 10) / 14.0) * rng.uniform(0.32, 0.48)
                    else:
                        # Sharp drop into zero-billing or near-zero-billing over recent 4 weeks
                        decay = 1.0 - max(0.0, (wi - 12) / 9.0) * rng.uniform(0.68, 0.92)
                        decay = max(0.0, decay)

                    wk_nsv = round(max(0.0, base_nsv * decay * festival_boost * rng.uniform(0.92, 1.08)), 0)
                    if archetype == "critical_zero_billing" and wi >= 21 and rng.random() < 0.78:
                        wk_nsv = 0.0
                    wk_lspc = round(max(0.0, target_lspc * (0.45 + 0.55 * decay) + rng.normal(0, 0.4)), 1)
                    if wk_nsv == 0.0:
                        wk_lspc = 0.0

                    # Category mix split
                    foods_share = 0.58
                    pc_share = 0.19 if dominant_cause != "assortment_tier_mismatch" else 0.07
                    stat_share = 0.12 if dominant_cause != "assortment_tier_mismatch" else 0.05
                    other_share = max(0.05, 1.0 - (foods_share + pc_share + stat_share))

                    wk_fill = round(float(np.clip(fill_rate - (0.08 if (wi >= 16 and dominant_cause == "hero_sku_stockout") else 0.0) + rng.normal(0, 0.02), 0.45, 0.99)), 3)

                    w_records.append(
                        {
                            "outlet_id": oid,
                            "city": city,
                            "beat_id": beat_id,
                            "week_date": wk_date.isoformat(),
                            "week_index": wi + 1,
                            "nsv_inr": wk_nsv,
                            "baseline_nsv_inr": round(base_nsv, 0),
                            "lspc": wk_lspc,
                            "target_lspc": target_lspc,
                            "fill_rate": wk_fill,
                            "visit_duration_min": round(max(1.2, visit_dur_min * (0.85 + 0.15 * decay)), 1),
                            "foods_inr": round(wk_nsv * foods_share, 0),
                            "personal_care_inr": round(wk_nsv * pc_share, 0),
                            "stationery_inr": round(wk_nsv * stat_share, 0),
                            "agarbatti_matches_inr": round(wk_nsv * other_share, 0),
                            "oos_hero_skus": int(round((1.0 - wk_fill) * 12)),
                        }
                    )

                weekly_rows.extend(w_records)

                # Summaries over first 8w (baseline) vs last 4w (current)
                baseline_4w_nsv = float(np.mean([r["nsv_inr"] for r in w_records[:6]]))
                current_4w_nsv = float(np.mean([r["nsv_inr"] for r in w_records[-4:]]))
                current_4w_lspc = float(np.mean([r["lspc"] for r in w_records[-4:]]))
                latest_nsv = w_records[-1]["nsv_inr"]
                latest_lspc = w_records[-1]["lspc"]
                for r in reversed(w_records[-4:]):
                    if r["nsv_inr"] == 0:
                        zero_bill_streak += 1
                    else:
                        break

                revenue_at_risk_monthly = round(max(0.0, (baseline_4w_nsv - current_4w_nsv) * 4.0), 0)
                if zero_bill_streak >= 2 or current_4w_lspc < 3.4 or current_4w_nsv < baseline_4w_nsv * 0.35:
                    health_status = "critical"
                elif current_4w_lspc < target_lspc * 0.72 or current_4w_nsv < baseline_4w_nsv * 0.72:
                    health_status = "warning"
                else:
                    health_status = "healthy"

                outlet_rows.append(
                    {
                        "outlet_id": oid,
                        "name": outlet_name,
                        "city": city,
                        "region": cfg["region"],
                        "zone": zone_name,
                        "wd_id": wd_id,
                        "wd_name": wd_lookup[wd_id]["name"],
                        "beat_id": beat_id,
                        "salesman_name": salesman,
                        "channel_type": channel,
                        "tier": tier,
                        "lat": olat,
                        "lng": olng,
                        "health_status": health_status,
                        "archetype": archetype,
                        "dominant_cause": dominant_cause,
                        "baseline_weekly_nsv_inr": round(baseline_4w_nsv, 0),
                        "current_weekly_nsv_inr": round(current_4w_nsv, 0),
                        "latest_weekly_nsv_inr": latest_nsv,
                        "revenue_leakage_monthly_inr": revenue_at_risk_monthly,
                        "target_lspc": target_lspc,
                        "current_lspc": round(current_4w_lspc, 1),
                        "latest_lspc": latest_lspc,
                        "zero_bill_weeks": zero_bill_streak,
                        "wd_fill_rate": round(fill_rate, 3),
                        "avg_visit_duration_min": visit_dur_min,
                        "credit_overdue_days": credit_overdue_days,
                        "qc_dark_store_dist_km": qc_dist_km,
                        "nearest_qc_hub": nearest_qc["name"],
                        "wd_distance_km": wd_dist_km,
                        "vision_shelf_gap_score": round(vision_shelf_gap, 2),
                        "storefront_vision_note": (
                            f"Facade audit: {tier} footprint, detected high rival biscuit/snack facings; "
                            f"{'missing Classmate/Savlon hanger visibility' if dominant_cause == 'assortment_tier_mismatch' else 'Aashirvaad front-bay presence'}"
                        ),
                    }
                )

                # Historical intervention logs (~40% of outlets have prior intervention results)
                if rng.random() < 0.45:
                    action_code = rng.choice(["REPLENISH_BUFFER", "BEAT_SPLIT", "QCOM_COUNTER_SCHEME", "CROSS_SELL_BUNDLE"])
                    succeeded = bool(
                        (action_code == "REPLENISH_BUFFER" and dominant_cause == "hero_sku_stockout")
                        or (action_code == "QCOM_COUNTER_SCHEME" and dominant_cause == "qcommerce_spillover")
                        or (action_code == "BEAT_SPLIT" and dominant_cause == "beat_coverage_fatigue")
                        or (action_code == "CROSS_SELL_BUNDLE" and dominant_cause == "assortment_tier_mismatch")
                        or rng.random() < 0.58
                    )
                    intervention_rows.append(
                        {
                            "intervention_id": f"INT-{oid}-{wi if 'wi' in locals() else 1}",
                            "outlet_id": oid,
                            "city": city,
                            "beat_id": beat_id,
                            "action_code": str(action_code),
                            "dominant_cause": dominant_cause,
                            "wd_fill_rate": round(fill_rate, 3),
                            "qc_dark_store_dist_km": qc_dist_km,
                            "avg_visit_duration_min": visit_dur_min,
                            "credit_overdue_days": credit_overdue_days,
                            "vision_shelf_gap_score": round(vision_shelf_gap, 2),
                            "lspc_before": round(max(1.5, current_4w_lspc), 1),
                            "lspc_uplift": round(float(rng.uniform(2.1, 4.4) if succeeded else rng.uniform(0.2, 1.1)), 1),
                            "nsv_uplift_pct": round(float(rng.uniform(22, 48) if succeeded else rng.uniform(2, 9)), 1),
                            "payback_days": int(rng.integers(10, 26) if succeeded else rng.integers(45, 75)),
                            "recovered": succeeded,
                        }
                    )

    tables = {
        "wd_master": pd.DataFrame(wd_rows),
        "dark_stores": pd.DataFrame(poi_rows),
        "beat_master": pd.DataFrame(beat_rows),
        "outlet_master": pd.DataFrame(outlet_rows),
        "weekly_telemetry": pd.DataFrame(weekly_rows),
        "intervention_history": pd.DataFrame(intervention_rows),
    }
    for name, df in tables.items():
        df.to_parquet(out_dir / f"{name}.parquet", index=False)
    return tables


if __name__ == "__main__":
    generated = generate_dataset()
    for k, v in generated.items():
        print(f"Generated {k}: {len(v)} rows")
