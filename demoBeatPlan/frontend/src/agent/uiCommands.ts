import { useEffect, useRef } from 'react';

export const UI_ACTIONS = {
  map_view: ['south_india', 'city'],
  fullscreen: ['on', 'off'],
  basemap: ['satellite', 'street'],
  beat_trails: ['on', 'off'],
  legend: ['on', 'off'],
  zoom: ['in', 'out'],
  focus_city: ['Bangalore', 'Hyderabad', 'Chennai', 'ALL'],
  focus_outlet: null,
  open_outlet: null,
  open_screen: ['city_compare', 'city_health', 'beat_simulator'],
  panel: ['expand', 'restore', 'close'],
  language: ['english', 'hinglish', 'hindi'],
  report: ['open', 'print', 'close'],
  agent: ['dock', 'undock'],
  health_filter: ['all', 'healthy', 'attention', 'critical'],
} as const;

export type UiAction = keyof typeof UI_ACTIONS;

export interface UiCommand {
  action: UiAction;
  value?: string;
  outlet_id?: string;
  view?: string;
  label?: string;
}

const EVT = 'beatpulse:ui';

const LABELS: Record<string, string> = {
  'map_view:south_india': 'South India overview',
  'map_view:city': 'City drilldown',
  'fullscreen:on': 'Full screen map',
  'fullscreen:off': 'Exit full screen',
  'basemap:satellite': 'Satellite view',
  'basemap:street': 'Street view',
  'beat_trails:on': 'Beat trails shown',
  'beat_trails:off': 'Beat trails hidden',
  'open_screen:city_compare': 'City comparison',
  'open_screen:city_health': 'Health & Priority Queue',
  'open_screen:beat_simulator': 'Beat Rebalance Simulator',
  'health_filter:all': 'All outlets',
  'health_filter:healthy': 'Productive outlets',
  'health_filter:attention': 'At-risk outlets',
  'health_filter:critical': 'Zero-billing outlets',
  'report:open': 'Beat Action Pack opened',
};

export function labelOf(cmd: UiCommand): string {
  const k = `${cmd.action}:${cmd.value ?? ''}`;
  if (LABELS[k]) return LABELS[k];
  if (cmd.action === 'focus_city') return cmd.value === 'ALL' ? 'All 3 Cities' : `${cmd.value} focused`;
  if (cmd.action === 'focus_outlet') return `${cmd.outlet_id} on map`;
  if (cmd.action === 'open_outlet') return `${cmd.outlet_id} opened`;
  return cmd.action;
}

export function dispatchUi(cmd: UiCommand): void {
  if (!cmd || !(cmd.action in UI_ACTIONS)) return;
  window.dispatchEvent(new CustomEvent<UiCommand>(EVT, { detail: { ...cmd, label: cmd.label ?? labelOf(cmd) } }));
}

export function useUiCommands(handler: (cmd: UiCommand) => void): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const fn = (e: Event) => ref.current((e as CustomEvent<UiCommand>).detail);
    window.addEventListener(EVT, fn);
    return () => window.removeEventListener(EVT, fn);
  }, []);
}
