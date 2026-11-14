import { useEffect, useRef } from 'react';

export const UI_ACTIONS = {
  map_view: ['india', 'city'],
  fullscreen: ['on', 'off'],
  basemap: ['satellite', 'street'],
  flowlines: ['on', 'off'],
  legend: ['on', 'off'],
  zoom: ['in', 'out'],
  focus_city: ['Bangalore', 'Hyderabad', 'Chennai', 'ALL'],
  focus_beat: null,
  focus_outlet: null,
  open_outlet: null,
  open_screen: ['beat_history', 'city_compare', 'city_health', 'beat_simulator', 'beat_diagnosis'],
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

export function labelOf(cmd: UiCommand): string {
  if (cmd.action === 'focus_city') return cmd.value === 'ALL' ? 'All Cities' : `${cmd.value} focused`;
  if (cmd.action === 'focus_beat') return `Beat filter: ${cmd.value}`;
  if (cmd.action === 'focus_outlet') return `${cmd.outlet_id} on map`;
  if (cmd.action === 'open_outlet') return `${cmd.outlet_id} opened`;
  if (cmd.action === 'flowlines') return `Planned vs Actual routes ${cmd.value}`;
  if (cmd.action === 'basemap') return cmd.value === 'satellite' ? 'Satellite map' : 'Dark SCADA map';
  if (cmd.action === 'open_screen') return `${cmd.value?.replace('_', ' ')}`;
  if (cmd.action === 'health_filter') return `Showing: ${cmd.value}`;
  if (cmd.action === 'report') return `Action Pack: ${cmd.outlet_id || cmd.value}`;
  return `${cmd.action}:${cmd.value ?? ''}`;
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
