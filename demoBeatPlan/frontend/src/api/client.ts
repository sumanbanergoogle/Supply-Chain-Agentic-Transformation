import type {
  BeatDiagnosisPayload,
  BeatInfo,
  BeatSimulation,
  CityBenchmark,
  CityKPIs,
  CounterfactualResult,
  InfrastructurePayload,
  OutletDetailPayload,
  OutletSummary,
  WeeklyPoint,
} from '../types/tmd';

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const tmdApi = {
  kpis: (city = 'ALL') => getJson<CityKPIs>(`/api/kpis?city=${encodeURIComponent(city)}`),
  compareCities: () => getJson<{ cities: CityBenchmark[]; as_of: string }>('/api/cities/compare'),
  cityHealth: (city = 'ALL') =>
    getJson<{ city: string; summary: CityKPIs; priority_queue: OutletSummary[] }>(
      `/api/cities/${encodeURIComponent(city)}/health`,
    ),
  outlets: (city = 'ALL') => getJson<OutletSummary[]>(`/api/outlets?city=${encodeURIComponent(city)}`),
  outletDetail: (id: string) => getJson<OutletDetailPayload>(`/api/outlets/${encodeURIComponent(id)}`),
  outletHistory: (id: string) => getJson<WeeklyPoint[]>(`/api/outlets/${encodeURIComponent(id)}/history`),
  counterfactual: (id: string, recommended?: string, alternative?: string) => {
    const qs = new URLSearchParams();
    if (recommended) qs.set('recommended', recommended);
    if (alternative) qs.set('alternative', alternative);
    return getJson<CounterfactualResult>(`/api/outlets/${encodeURIComponent(id)}/counterfactual?${qs.toString()}`);
  },
  report: (id: string) => getJson<Record<string, any>>(`/api/outlets/${encodeURIComponent(id)}/report`),
  infrastructure: (city = 'ALL') =>
    getJson<InfrastructurePayload>(`/api/geo/infrastructure?city=${encodeURIComponent(city)}`),
  beats: (city = 'ALL') => getJson<BeatInfo[]>(`/api/beats?city=${encodeURIComponent(city)}`),
  diagnoseBeat: (beatId: string) => getJson<BeatDiagnosisPayload>(`/api/beats/${encodeURIComponent(beatId)}/diagnose`),
  simulateBeat: (beatId: string) =>
    getJson<BeatSimulation>(`/api/beats/${encodeURIComponent(beatId)}/simulate`, { method: 'POST' }),
  dispatchBeat: (beatId: string, note = '') =>
    getJson<{ ticket_id: string; beat_id: string; status: string; summary: string; as_of: string }>(
      `/api/beats/${encodeURIComponent(beatId)}/dispatch`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      },
    ),
  chat: (payload: {
    message: string;
    session_id?: string;
    language?: string;
    city?: string | null;
    outlet_id?: string | null;
    screen?: string | null;
  }) =>
    getJson<{
      session_id: string;
      response: string;
      actions: any[];
      tool_calls: any[];
      status: string;
      engine: string;
    }>('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
};
