export type CityName = 'Bangalore' | 'Hyderabad' | 'Chennai';
export type CityFilter = 'ALL' | CityName;
export type HealthStatus = 'healthy' | 'warning' | 'critical';

export interface CityKPIs {
  city: string;
  total_outlets: number;
  healthy_count: number;
  warning_count: number;
  critical_count: number;
  coverage_miss_count?: number;
  zero_order_visit_count?: number;
  eco_pct?: number;
  strike_rate_pct?: number;
  avg_drop_size_inr?: number;
  monthly_leakage_inr: number;
  avg_lspc: number;
  target_lspc: number;
  avg_wd_fill_rate: number;
  as_of: string;
}

export interface CityBenchmark extends CityKPIs {
  top_root_cause: string;
  zero_billing_pct: number;
  avg_gnn_spillover: number;
  total_monthly_nsv_inr: number;
}

export interface OutletSummary {
  outlet_id: string;
  name: string;
  city: CityName;
  region: string;
  zone: string;
  sbu_line?: string;
  wd_id: string;
  wd_name: string;
  beat_id: string;
  beat_seq?: number;
  salesman_name: string;
  planned_visit_time?: string;
  actual_gps_time?: string;
  visited_on_time?: boolean;
  skipped_weeks?: number;
  channel_type: string;
  tier: string;
  lat: number;
  lng: number;
  health_status: HealthStatus;
  zero_billing_type?: string;
  dominant_cause: string;
  baseline_weekly_nsv_inr: number;
  current_weekly_nsv_inr: number;
  latest_weekly_nsv_inr: number;
  revenue_leakage_monthly_inr: number;
  target_lspc: number;
  current_lspc: number;
  latest_lspc: number;
  zero_bill_weeks: number;
  wd_fill_rate: number;
  avg_visit_duration_min: number;
  credit_overdue_days: number;
  qc_dark_store_dist_km: number;
  nearest_qc_hub: string;
  wd_distance_km: number;
  vision_shelf_gap_score: number;
  storefront_vision_note: string;
  churn_prob: number;
  gnn_spillover_risk: number;
}

export interface AttributionFactor {
  factor_key: string;
  label: string;
  responsible_function: string;
  color: string;
  share_pct: number;
  leakage_inr: number;
  lspc_impact: number;
  controllable: boolean;
}

export interface AttributionResult {
  outlet_id: string;
  name: string;
  city: string;
  health_status: HealthStatus;
  churn_prob: number;
  gnn_spillover_risk: number;
  monthly_leakage_inr: number;
  lspc_gap: number;
  dominant_cause: string;
  factors: AttributionFactor[];
  model_info: {
    churn_model: string;
    spillover_model: string;
    vision_audit: string;
  };
}

export interface RecommendationItem {
  code: string;
  title: string;
  owner: string;
  sla_days: number;
  cost_band: string;
  fit_label: string;
  fit_score: number;
  p_recovery: number;
  expected_monthly_uplift_inr: number;
  expected_lspc_gain: number;
  payback_days: number;
  driver_share_pct: number;
  rationale: string;
  sop_steps: string[];
}

export interface AnalogOutcome {
  intervention_id: string;
  outlet_id: string;
  city: string;
  beat_id: string;
  action_code: string;
  lspc_uplift: number;
  nsv_uplift_pct: number;
  payback_days: number;
  recovered: boolean;
}

export interface OutletDetailPayload {
  outlet: OutletSummary;
  attribution: AttributionResult;
  recommendations: {
    recommendations: RecommendationItem[];
    all_options: RecommendationItem[];
    similar_analogs: AnalogOutcome[];
  };
  nearby: {
    neighbors: (OutletSummary & { distance_km: number })[];
  };
}

export interface WeeklyPoint {
  week_date: string;
  week_index: number;
  nsv_inr: number;
  baseline_nsv_inr: number;
  lspc: number;
  target_lspc: number;
  fill_rate: number;
  visit_duration_min: number;
  foods_inr: number;
  personal_care_inr: number;
  stationery_inr: number;
  agarbatti_matches_inr: number;
  oos_hero_skus: number;
}

export interface CounterfactualResult {
  outlet_id: string;
  recommended: RecommendationItem;
  alternative: RecommendationItem;
  verdict: 'RECOMMENDED_PREFERRED' | 'CLOSE' | 'ALTERNATIVE_PREFERRED';
  net_advantage_inr: number;
  rows: {
    metric: string;
    recommended: { symbol: string; summary: string };
    alternative: { symbol: string; summary: string };
  }[];
}

export interface BeatInfo {
  beat_id: string;
  city: CityName;
  wd_id: string;
  wd_name: string;
  zone: string;
  sbu_line?: string;
  salesman_name: string;
  visit_day: string;
  planned_outlets: number;
  visit_compliance_pct?: number;
  planned_distance_km: number;
  actual_distance_km: number;
  beat_load_index: number;
  beat_mode?: string;
}

export interface BeatDiagnosisPayload {
  beat: BeatInfo;
  outlets: OutletSummary[];
  zero_billing_count: number;
  skipped_count: number;
  eco_pct?: number;
  strike_rate_pct?: number;
  avg_drop_size_inr?: number;
  total_monthly_leakage_inr: number;
  avg_lspc: number;
  avg_gnn_spillover: number;
  factors: { factor_key: string; label: string; share_pct: number; color: string }[];
}

export interface BeatSimulation {
  beat_id: string;
  city: CityName;
  zone: string;
  sbu_line?: string;
  salesman_name: string;
  target_transfer_beat: string;
  target_transfer_salesman: string;
  capacity_source?: string;
  before: {
    distance_km: number;
    avg_visit_duration_min: number;
    beat_load_index: number;
    monthly_leakage_inr: number;
    finish_time?: string;
  };
  after: {
    distance_km: number;
    travel_time_reduction_pct?: number;
    avg_visit_duration_min: number;
    beat_load_index: number;
    finish_time?: string;
    reactivated_zero_billing_outlets?: number;
    projected_monthly_recovery_inr: number;
    projected_lspc_uplift: number;
  };
  reassigned_outlets: { outlet_id: string; name: string; leakage_inr: number }[];
  polygon_a?: [number, number][];
  polygon_b?: [number, number][];
}

export interface PoiItem {
  poi_id: string;
  kind: 'qcommerce' | 'college' | 'traffic';
  city: string;
  name: string;
  lat: number;
  lng: number;
  intensity: number;
}

export interface InfrastructurePayload {
  wds: { wd_id: string; city: string; name: string; hub: string; lat: number; lng: number; fill_rate_base: number }[];
  dark_stores: PoiItem[];
  pois?: PoiItem[];
  beats: BeatInfo[];
}

export interface ChatAction {
  kind: 'navigate' | 'ui';
  screen?: string;
  view?: string;
  city?: string | null;
  outlet_id?: string | null;
  beat_id?: string | null;
  source_tool?: string;
  command?: { action: string; value?: string; outlet_id?: string; view?: string };
}
