export type CityName = 'Bangalore' | 'Hyderabad' | 'Chennai';
export type CityFilter = 'ALL' | CityName;
export type HealthStatus = 'healthy' | 'warning' | 'critical';

export interface CityKPIs {
  city: string;
  total_outlets: number;
  healthy_count: number;
  warning_count: number;
  critical_count: number;
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
  wd_id: string;
  wd_name: string;
  beat_id: string;
  salesman_name: string;
  channel_type: string;
  tier: string;
  lat: number;
  lng: number;
  health_status: HealthStatus;
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
  salesman_name: string;
  visit_day: string;
  planned_outlets: number;
  planned_distance_km: number;
  actual_distance_km: number;
  beat_load_index: number;
}

export interface BeatSimulation {
  beat_id: string;
  city: CityName;
  zone: string;
  salesman_name: string;
  target_transfer_beat: string;
  target_transfer_salesman: string;
  before: {
    distance_km: number;
    avg_visit_duration_min: number;
    beat_load_index: number;
    monthly_leakage_inr: number;
  };
  after: {
    distance_km: number;
    avg_visit_duration_min: number;
    beat_load_index: number;
    projected_monthly_recovery_inr: number;
    projected_lspc_uplift: number;
  };
  reassigned_outlets: { outlet_id: string; name: string; leakage_inr: number }[];
  optimized_waypoints: [number, number][];
}

export interface InfrastructurePayload {
  wds: { wd_id: string; city: string; name: string; hub: string; lat: number; lng: number; fill_rate_base: number }[];
  dark_stores: { poi_id: string; city: string; name: string; lat: number; lng: number; intensity: number }[];
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
