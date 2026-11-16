"""Deterministic synthetic data generator for ITC TM&D (Bangalore, Hyderabad, Chennai).

Models realistic General Trade (GT) outlet master records, Wholesale Distributors (WD),
Salesman Beats with Planned vs. Actual SFA GPS sequences (including Koramangala Beat 4
evening traffic cutoff and HSR Beat 7 95%-compliance stockout/Q-commerce cannibalization),
Lakshmi Super Mart storefront vision profile, 24-week category/LSPC telemetry, and
historical intervention outcomes.
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
        "region": "South Cluster · Bengaluru Metro",
        "center": (12.9480, 77.6240),
        "wds": [
            {"wd_id": "BLR-WD-01", "name": "Sri Lakshmi Venkateshwara Agencies", "hub": "Indiranagar", "lat": 12.9784, "lng": 77.6408, "fill_rate_base": 0.91},
            {"wd_id": "BLR-WD-02", "name": "Kaveri FMCG Distributors (South Cluster)", "hub": "Koramangala", "lat": 12.9332, "lng": 77.6215, "fill_rate_base": 0.72},
            {"wd_id": "BLR-WD-03", "name": "Metro Horizon Stockists", "hub": "Malleswaram", "lat": 13.0031, "lng": 77.5643, "fill_rate_base": 0.94},
        ],
        "zones": [
            ("Indiranagar 100ft Rd", 12.9765, 77.6412, "BLR-WD-01", "BLR-B01", "Raghavendra Rao", "normal"),
            ("Malleswaram 8th Cross", 13.0022, 77.5712, "BLR-WD-03", "BLR-B02", "Manjunath B", "normal"),
            ("Whitefield ITPL Main", 12.9855, 77.7363, "BLR-WD-01", "BLR-B03", "Prashanth K", "normal"),
            ("Koramangala Beat 4 (Sony World)", 12.9345, 77.6266, "BLR-WD-02", "BLR-B04", "Karthik Gowda", "traffic_cutoff"),
            ("Jayanagar 4th Block", 12.9299, 77.5838, "BLR-WD-03", "BLR-B05", "Deepak Shetty", "normal"),
            ("HSR Layout Beat 7 (Sector 2)", 12.9121, 77.6446, "BLR-WD-02", "BLR-B07", "Suresh Naik", "stockout_qcom"),
        ],
        "pois": [
            {"poi_id": "BLR-QC-01", "kind": "qcommerce", "name": "Zepto Pod · HSR Sector 2", "lat": 12.9144, "lng": 77.6420, "intensity": 0.95},
            {"poi_id": "BLR-QC-02", "kind": "qcommerce", "name": "Blinkit Hub · HSR 27th Main", "lat": 12.9102, "lng": 77.6478, "intensity": 0.93},
            {"poi_id": "BLR-QC-03", "kind": "qcommerce", "name": "Instamart Dark · Koramangala", "lat": 12.9368, "lng": 77.6215, "intensity": 0.89},
            {"poi_id": "BLR-EDU-01", "kind": "college", "name": "Oxford / NIFT Campus Cluster · HSR", "lat": 12.9130, "lng": 77.6458, "intensity": 0.90},
            {"poi_id": "BLR-TRF-01", "kind": "traffic", "name": "Sony World Junction Bottleneck (4:15 PM)", "lat": 12.9372, "lng": 77.6279, "intensity": 0.96},
        ],
        "store_names": [
            "Annapurna Kirana & Provision", "Sri Sai Super Mart", "Nandini General Stores", "Bharath Provision Bazaar",
            "Cauvery Kirana Mart", "Lakshmi Ganesh Stores", "Metro Corner Grocers", "Vidya Stationery & Provisions",
            "Balaji Departmental", "Venkateshwara Kirana", "Surya Mini Supermarket", "Nagaraj Traders",
        ],
    },
    "Hyderabad": {
        "code": "HYD",
        "region": "South Cluster · Hyderabad Metro",
        "center": (17.4326, 78.4282),
        "wds": [
            {"wd_id": "HYD-WD-01", "name": "Deccan Value Chain Distributors", "hub": "Madhapur", "lat": 17.4483, "lng": 78.3915, "fill_rate_base": 0.82},
            {"wd_id": "HYD-WD-02", "name": "Bhagyanagar Trade Links", "hub": "Banjara Hills", "lat": 17.4156, "lng": 78.4347, "fill_rate_base": 0.92},
            {"wd_id": "HYD-WD-03", "name": "Charminar General Agencies", "hub": "Secunderabad", "lat": 17.4399, "lng": 78.4983, "fill_rate_base": 0.89},
        ],
        "zones": [
            ("Madhapur Ayyappa Society", 17.4495, 78.3912, "HYD-WD-01", "HYD-B01", "Srinivas Reddy", "stockout_qcom"),
            ("Gachibowli DLF Road", 17.4401, 78.3489, "HYD-WD-01", "HYD-B02", "Mahesh Babu V", "traffic_cutoff"),
            ("Banjara Hills Rd No 12", 17.4123, 78.4384, "HYD-WD-02", "HYD-B03", "Imran Khan", "normal"),
            ("Kukatpally KPHB Phase 3", 17.4948, 78.3996, "HYD-WD-02", "HYD-B04", "Ravi Teja K", "traffic_cutoff"),
            ("Secunderabad PG Road", 17.4412, 78.4951, "HYD-WD-03", "HYD-B05", "Anil Kumar G", "normal"),
            ("Jubilee Hills Checkpost", 17.4288, 78.4071, "HYD-WD-03", "HYD-B06", "Harish Sharma", "normal"),
        ],
        "pois": [
            {"poi_id": "HYD-QC-01", "kind": "qcommerce", "name": "Zepto Pod · Madhapur", "lat": 17.4472, "lng": 78.3888, "intensity": 0.91},
            {"poi_id": "HYD-QC-02", "kind": "qcommerce", "name": "Blinkit Hub · Gachibowli", "lat": 17.4425, "lng": 78.3522, "intensity": 0.87},
            {"poi_id": "HYD-TRF-01", "kind": "traffic", "name": "Cyber Towers Signal Chokepoint", "lat": 17.4490, "lng": 78.3812, "intensity": 0.90},
        ],
        "store_names": [
            "Kakatiya Super Kirana", "Deccan Provision Stores", "Sri Kanaka Durga Mart", "Nizamabad General Traders",
            "Telangana Kirana Bazaar", "Padmavathi Super Market", "Banjara Mini Mart", "Jubilee Everyday Stores",
            "Secunderabad Provision Hub", "Vijaya Lakshmi Kirana", "Golkonda General Store", "Sai Ram Traders",
        ],
    },
    "Chennai": {
        "code": "CHN",
        "region": "South Cluster · Chennai Metro",
        "center": (13.0275, 80.2290),
        "wds": [
            {"wd_id": "CHN-WD-01", "name": "Coromandel Merchandising Corp", "hub": "T. Nagar", "lat": 13.0418, "lng": 80.2341, "fill_rate_base": 0.93},
            {"wd_id": "CHN-WD-02", "name": "Marina FMCG Stockists", "hub": "Velachery", "lat": 12.9815, "lng": 80.2180, "fill_rate_base": 0.81},
            {"wd_id": "CHN-WD-03", "name": "Madras Retail Network", "hub": "Anna Nagar", "lat": 13.0850, "lng": 80.2101, "fill_rate_base": 0.90},
        ],
        "zones": [
            ("T. Nagar Usman Road", 13.0408, 80.2337, "CHN-WD-01", "CHN-B01", "Murugan S", "normal"),
            ("Adyar LB Road", 13.0067, 80.2571, "CHN-WD-01", "CHN-B02", "Karthikeyan R", "traffic_cutoff"),
            ("Velachery Bypass Rd", 12.9801, 80.2212, "CHN-WD-02", "CHN-B03", "Senthil Kumar", "stockout_qcom"),
            ("OMR Thoraipakkam", 12.9416, 80.2362, "CHN-WD-02", "CHN-B04", "Aravindhan P", "traffic_cutoff"),
            ("Anna Nagar 2nd Ave", 13.0846, 80.2136, "CHN-WD-03", "CHN-B05", "Balaji Narayanan", "normal"),
            ("Porur Trunk Road", 13.0382, 80.1565, "CHN-WD-03", "CHN-B06", "Vignesh M", "normal"),
        ],
        "pois": [
            {"poi_id": "CHN-QC-01", "kind": "qcommerce", "name": "Blinkit Hub · Velachery", "lat": 12.9788, "lng": 80.2194, "intensity": 0.89},
            {"poi_id": "CHN-QC-02", "kind": "qcommerce", "name": "Zepto Pod · OMR", "lat": 12.9455, "lng": 80.2331, "intensity": 0.91},
            {"poi_id": "CHN-TRF-01", "kind": "traffic", "name": "Velachery Vijayanagar Bottleneck", "lat": 12.9780, "lng": 80.2205, "intensity": 0.88},
        ],
        "store_names": [
            "Murugan Maligai & Provision", "Sri Karpagam Super Store", "Chola Departmental Mart", "Adyar Annai Kirana",
            "Vellalar Provision Stores", "Thirumalai General Store", "Marina Corner Mart", "Kaveri Maligai Kadai",
            "Anbu Traders & Stationery", "Pallava Super Market", "Saravana Mini Bazaar", "Nila Consumer Stores",
        ],
    },
}

CHANNEL_TYPES = ["Urban Kirana", "Modern Mini-Mart", "Cosmetic & Chemist", "Stationery & Impulse", "Top-Tier Grocer"]
ROOT_CAUSE_PROFILES = [
    "hero_sku_stockout",
    "qcommerce_spillover",
    "beat_coverage_fatigue",
    "credit_margin_squeeze",
    "assortment_tier_mismatch",
]


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def generate_dataset(output_dir: Path | None = None, seed: int = 2026) -> dict[str, pd.DataFrame]:
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
        for p in cfg["pois"]:
            poi_rows.append({"city": city, **p})

        qcom_pois = [p for p in cfg["pois"] if p["kind"] == "qcommerce"]
        outlet_seq = 101

        for z_idx, (zone_name, zlat, zlng, wd_id, beat_id, salesman, beat_mode) in enumerate(cfg["zones"]):
            # Make Koramangala Beat 4 & HSR Beat 7 slightly larger (8 outlets each in BLR, 6 elsewhere)
            outlets_in_beat = 8 if beat_id in ("BLR-B04", "BLR-B07") else 6
            overloaded = beat_mode == "traffic_cutoff"
            visit_compliance = 0.62 if overloaded else (0.95 if beat_mode == "stockout_qcom" else 0.96)
            if beat_mode == "traffic_cutoff":
                sbu_line = "Foods & Snacks (Dedicated DS Beat)"
            elif beat_mode == "stockout_qcom":
                sbu_line = "Composite GT Beat (Foods + PCPB + ESPB)"
            else:
                sbu_line = [
                    "Foods & Impulse (DS Beat)",
                    "PCPB & Stationery (ESPB Beat)",
                    "Composite GT Beat (Foods + PCPB + ESPB)",
                ][z_idx % 3]

            beat_rows.append(
                {
                    "beat_id": beat_id,
                    "city": city,
                    "wd_id": wd_id,
                    "wd_name": wd_lookup[wd_id]["name"],
                    "zone": zone_name,
                    "sbu_line": sbu_line,
                    "salesman_name": salesman,
                    "visit_day": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][z_idx % 6],
                    "planned_outlets": outlets_in_beat,
                    "visit_compliance_pct": round(visit_compliance * 100.0, 1),
                    "planned_distance_km": round(18.4 if overloaded else 11.4, 1),
                    "actual_distance_km": round(26.5 if overloaded else 12.2, 1),
                    "beat_load_index": round(1.38 if overloaded else (1.02 if beat_mode == "stockout_qcom" else 0.91), 2),
                    "beat_mode": beat_mode,
                }
            )

            for local_i in range(outlets_in_beat):
                is_lakshmi_mart = beat_id == "BLR-B07" and local_i == 0
                oid = "BLR-701" if is_lakshmi_mart else f"{code}-{outlet_seq:03d}"
                if not is_lakshmi_mart:
                    outlet_seq += 1

                # Tail-end outlets on traffic-cutoff beats get skipped after 4:15 PM!
                cutoff_tail = 3 if beat_id == "BLR-B04" else 1
                tail_skipped = overloaded and local_i >= (outlets_in_beat - cutoff_tail)
                if is_lakshmi_mart:
                    archetype = "attention_erosion"
                    dominant_cause = "assortment_tier_mismatch"
                elif tail_skipped:
                    archetype = "critical_zero_billing"
                    dominant_cause = "beat_coverage_fatigue"
                elif beat_mode == "stockout_qcom":
                    stockout_indices = (1, 2) if beat_id == "BLR-B07" else (0,)
                    qcom_indices = (3, 4) if beat_id == "BLR-B07" else (1,)
                    assort_indices = (5,) if beat_id == "BLR-B07" else (2,)
                    if local_i in stockout_indices:
                        archetype = "critical_zero_billing"
                        dominant_cause = "hero_sku_stockout"
                    elif local_i in qcom_indices:
                        archetype = "attention_erosion"
                        dominant_cause = "qcommerce_spillover"
                    elif local_i in assort_indices:
                        archetype = "attention_erosion"
                        dominant_cause = "assortment_tier_mismatch"
                    else:
                        archetype = "healthy_core"
                        dominant_cause = "none"
                else:
                    roll = rng.random()
                    if roll < 0.78:
                        archetype = "healthy_core"
                        dominant_cause = "none"
                    elif roll < 0.93:
                        archetype = "attention_erosion"
                        dominant_cause = ROOT_CAUSE_PROFILES[int(rng.integers(0, len(ROOT_CAUSE_PROFILES)))]
                    else:
                        archetype = "critical_zero_billing"
                        dominant_cause = ROOT_CAUSE_PROFILES[int(rng.integers(0, len(ROOT_CAUSE_PROFILES)))]

                # Position along structured beat path so map trail shows planned -> green covered -> dashed skipped!
                if is_lakshmi_mart:
                    olat, olng = 12.9134, 77.6451
                elif beat_id == "BLR-B04":
                    step = local_i * 0.0024
                    olat = round(12.9310 + step * (1.1 if tail_skipped else 0.7), 6)
                    olng = round(77.6210 + step * (1.3 if tail_skipped else 0.9), 6)
                elif beat_id == "BLR-B07":
                    angle = (local_i * 0.8) + 0.2
                    rad = 0.0028 + 0.0008 * local_i
                    olat = round(zlat + rad * math.sin(angle), 6)
                    olng = round(zlng + rad * math.cos(angle), 6)
                else:
                    angle = (local_i * 1.05) + rng.uniform(-0.25, 0.25)
                    rad = 0.003 + 0.0012 * local_i
                    olat = round(zlat + rad * math.sin(angle), 6)
                    olng = round(zlng + rad * math.cos(angle), 6)

                nearest_qc = min(qcom_pois, key=lambda ds: _haversine_km(olat, olng, ds["lat"], ds["lng"]))
                qc_dist_km = round(_haversine_km(olat, olng, nearest_qc["lat"], nearest_qc["lng"]), 2)
                wd_dist_km = round(_haversine_km(olat, olng, wd_lookup[wd_id]["lat"], wd_lookup[wd_id]["lng"]), 2)

                channel = "Modern Mini-Mart" if is_lakshmi_mart else CHANNEL_TYPES[(z_idx + local_i) % len(CHANNEL_TYPES)]
                tier = "Tier-C (Legacy) → Modern Self-Service" if is_lakshmi_mart else ("Platinum" if local_i % 4 == 0 else ("Gold" if local_i % 2 == 0 else "Silver"))
                base_nsv = 21500.0 if is_lakshmi_mart else ({"Platinum": 18500.0, "Gold": 10500.0, "Silver": 5500.0}[tier] * rng.uniform(0.9, 1.15))
                target_lspc = 8.0 if is_lakshmi_mart else (10.0 if "Platinum" in tier else (8.0 if "Gold" in tier else 5.0))

                fill_rate = 0.89 if is_lakshmi_mart else (0.69 if dominant_cause == "hero_sku_stockout" else (wd_lookup[wd_id]["fill_rate_base"] - 0.02))
                fill_rate = round(float(np.clip(fill_rate + rng.normal(0, 0.02), 0.55, 0.98)), 3)

                visit_dur_min = 8.4 if is_lakshmi_mart else (1.8 if tail_skipped else (8.6 if beat_mode == "stockout_qcom" else (9.1 if archetype == "healthy_core" else 5.2)))
                visit_dur_min = round(float(np.clip(visit_dur_min + rng.normal(0, 0.4), 1.2, 13.5)), 1)

                credit_overdue_days = 5 if is_lakshmi_mart else (32 if dominant_cause == "credit_margin_squeeze" else (5 if archetype == "healthy_core" else int(rng.integers(6, 18))))
                vision_shelf_gap = 0.68 if is_lakshmi_mart or dominant_cause == "assortment_tier_mismatch" else (0.10 if archetype == "healthy_core" else float(rng.uniform(0.22, 0.44)))

                if is_lakshmi_mart:
                    outlet_name = "Lakshmi Super Mart (Near Campus)"
                else:
                    store_base = cfg["store_names"][(z_idx * 2 + local_i) % len(cfg["store_names"])]
                    outlet_name = f"{store_base} #{oid.split('-')[1]}"

                # Planned vs Actual SFA timestamps
                visit_hour = 9 + int(local_i * 0.9)
                planned_time = f"{visit_hour:02d}:{(local_i * 17) % 60:02d}"
                actual_gps_time = "SKIPPED (>4:15 PM Traffic Cutoff)" if tail_skipped else f"{visit_hour:02d}:{((local_i * 17) + 12) % 60:02d}"
                visited_on_time = not tail_skipped
                skipped_weeks = 3 if tail_skipped else 0

                w_records = []
                for wi, wk_date in enumerate(weeks):
                    festival_boost = 1.12 if wi in (18, 19, 20) else 1.0
                    if archetype == "healthy_core":
                        decay = 1.0 + 0.04 * math.sin(wi / 3.0)
                    elif archetype == "attention_erosion":
                        decay = 1.0 - max(0.0, (wi - 10) / 14.0) * rng.uniform(0.32, 0.45)
                    else:
                        decay = max(0.0, 1.0 - max(0.0, (wi - 12) / 9.0) * rng.uniform(0.68, 0.90))

                    wk_nsv = round(max(0.0, base_nsv * decay * festival_boost * rng.uniform(0.93, 1.07)), 0)
                    if (tail_skipped or (archetype == "critical_zero_billing" and not is_lakshmi_mart)) and wi >= 21:
                        wk_nsv = 0.0
                    wk_lspc = 2.0 if is_lakshmi_mart and wi >= 18 else round(max(0.0, target_lspc * (0.42 + 0.58 * decay) + rng.normal(0, 0.3)), 1)
                    if wk_nsv == 0.0:
                        wk_lspc = 0.0

                    foods_share = 0.72 if is_lakshmi_mart else 0.56
                    pc_share = 0.06 if (is_lakshmi_mart or dominant_cause == "assortment_tier_mismatch") else 0.21
                    stat_share = 0.04 if (is_lakshmi_mart or dominant_cause == "assortment_tier_mismatch") else 0.13
                    other_share = max(0.05, 1.0 - (foods_share + pc_share + stat_share))

                    wk_fill = round(float(np.clip(fill_rate - (0.09 if (wi >= 17 and dominant_cause == "hero_sku_stockout") else 0.0), 0.48, 0.99)), 3)
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
                            "visit_duration_min": visit_dur_min,
                            "foods_inr": round(wk_nsv * foods_share, 0),
                            "personal_care_inr": round(wk_nsv * pc_share, 0),
                            "stationery_inr": round(wk_nsv * stat_share, 0),
                            "agarbatti_matches_inr": round(wk_nsv * other_share, 0),
                            "oos_hero_skus": int(round((1.0 - wk_fill) * 12)),
                        }
                    )
                weekly_rows.extend(w_records)

                baseline_4w_nsv = float(np.mean([r["nsv_inr"] for r in w_records[:6]]))
                current_4w_nsv = float(np.mean([r["nsv_inr"] for r in w_records[-4:]]))
                current_4w_lspc = float(np.mean([r["lspc"] for r in w_records[-4:]]))
                zero_bill_streak = sum(1 for r in w_records[-4:] if r["nsv_inr"] == 0)
                if is_lakshmi_mart:
                    revenue_at_risk_monthly = 48000.0
                    health_status = "warning"
                else:
                    revenue_at_risk_monthly = round(max(0.0, (baseline_4w_nsv - current_4w_nsv) * 4.0), 0)
                    if zero_bill_streak >= 2 or tail_skipped:
                        health_status = "critical"
                    elif current_4w_lspc < target_lspc * 0.78 or current_4w_nsv < baseline_4w_nsv * 0.78 or archetype == "attention_erosion":
                        health_status = "warning"
                    else:
                        health_status = "healthy"

                vision_note = (
                    "Multimodal Storefront Audit: Tagged Tier-C two years ago, but recent facade/shelf photo shows newly renovated self-service bays near Oxford/NIFT campus. "
                    "Competitors occupy eye-level personal care rack; buying only 2 categories (Foods/Matches). High-confidence uplift for Savlon, Fiama & Classmate multipacks."
                    if is_lakshmi_mart
                    else f"Facade audit: {channel} ({tier}); {'Classmate/Personal Care rack under-indexed' if dominant_cause == 'assortment_tier_mismatch' else 'Standard ITC front-bay visibility'}"
                )

                if not visited_on_time:
                    zero_billing_type = "Coverage Miss (Not Visited)"
                elif health_status == "critical":
                    zero_billing_type = "Zero-Order Visit (Fill / Credit)"
                elif health_status == "warning":
                    zero_billing_type = "Low LSPC (Category Dormant)"
                else:
                    zero_billing_type = "Productive Core"

                outlet_rows.append(
                    {
                        "outlet_id": oid,
                        "name": outlet_name,
                        "city": city,
                        "region": cfg["region"],
                        "zone": zone_name,
                        "sbu_line": sbu_line,
                        "wd_id": wd_id,
                        "wd_name": wd_lookup[wd_id]["name"],
                        "beat_id": beat_id,
                        "beat_seq": local_i + 1,
                        "salesman_name": salesman,
                        "planned_visit_time": planned_time,
                        "actual_gps_time": actual_gps_time,
                        "visited_on_time": visited_on_time,
                        "skipped_weeks": skipped_weeks,
                        "channel_type": channel,
                        "tier": tier,
                        "lat": olat,
                        "lng": olng,
                        "health_status": health_status,
                        "zero_billing_type": zero_billing_type,
                        "archetype": archetype,
                        "dominant_cause": dominant_cause,
                        "baseline_weekly_nsv_inr": round(baseline_4w_nsv, 0),
                        "current_weekly_nsv_inr": round(current_4w_nsv, 0),
                        "latest_weekly_nsv_inr": w_records[-1]["nsv_inr"],
                        "revenue_leakage_monthly_inr": revenue_at_risk_monthly,
                        "target_lspc": target_lspc,
                        "current_lspc": round(current_4w_lspc, 1),
                        "latest_lspc": w_records[-1]["lspc"],
                        "zero_bill_weeks": zero_bill_streak,
                        "wd_fill_rate": fill_rate,
                        "avg_visit_duration_min": visit_dur_min,
                        "credit_overdue_days": credit_overdue_days,
                        "qc_dark_store_dist_km": qc_dist_km,
                        "nearest_qc_hub": nearest_qc["name"],
                        "wd_distance_km": wd_dist_km,
                        "vision_shelf_gap_score": round(vision_shelf_gap, 2),
                        "storefront_vision_note": vision_note,
                    }
                )

                if rng.random() < 0.45:
                    action_code = str(rng.choice(["REPLENISH_BUFFER", "BEAT_SPLIT", "QCOM_COUNTER_SCHEME", "CROSS_SELL_BUNDLE"]))
                    succeeded = bool(rng.random() < 0.72)
                    intervention_rows.append(
                        {
                            "intervention_id": f"INT-{oid}",
                            "outlet_id": oid,
                            "city": city,
                            "beat_id": beat_id,
                            "action_code": action_code,
                            "dominant_cause": dominant_cause,
                            "wd_fill_rate": fill_rate,
                            "qc_dark_store_dist_km": qc_dist_km,
                            "avg_visit_duration_min": visit_dur_min,
                            "credit_overdue_days": credit_overdue_days,
                            "vision_shelf_gap_score": round(vision_shelf_gap, 2),
                            "lspc_before": round(max(1.5, current_4w_lspc), 1),
                            "lspc_uplift": round(float(rng.uniform(2.0, 4.2) if succeeded else rng.uniform(0.3, 1.0)), 1),
                            "nsv_uplift_pct": round(float(rng.uniform(24, 46) if succeeded else rng.uniform(3, 8)), 1),
                            "payback_days": int(rng.integers(10, 24) if succeeded else rng.integers(45, 70)),
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
