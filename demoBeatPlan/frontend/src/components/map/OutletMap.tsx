import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { Globe, Layers, Maximize2, Minimize2, Network } from 'lucide-react';
import { BeatSimulation, CityFilter, InfrastructurePayload, OutletSummary } from '../../types/tmd';
import { dispatchUi, useUiCommands } from '../../agent/uiCommands';

const CITY_CENTERS: Record<string, { lat: number; lng: number; zoom: number }> = {
  ALL: { lat: 14.55, lng: 78.6, zoom: 6 },
  Bangalore: { lat: 12.946, lng: 77.63, zoom: 12 },
  Hyderabad: { lat: 17.44, lng: 78.42, zoom: 12 },
  Chennai: { lat: 13.025, lng: 80.215, zoom: 12 },
};

const HEALTH_COLOR = {
  healthy: '#2ea043',
  warning: '#d29922',
  critical: '#f85149',
} as const;

interface OutletMapProps {
  outlets: OutletSummary[];
  allOutletsCountByHealth: { healthy: number; warning: number; critical: number };
  selectedOutletId: string | null;
  cityFilter: CityFilter;
  beatFilter: string | null;
  healthFilter: string;
  infrastructure: InfrastructurePayload | null;
  simulatedBeat: BeatSimulation | null;
  onSelectOutlet: (id: string) => void;
  onSelectCity: (c: CityFilter) => void;
  onFullscreenChange?: (fs: boolean) => void;
  fullscreenRightInset?: string;
}

export const OutletMap: React.FC<OutletMapProps> = ({
  outlets,
  allOutletsCountByHealth,
  selectedOutletId,
  cityFilter,
  beatFilter,
  healthFilter,
  infrastructure,
  simulatedBeat,
  onSelectOutlet,
  onSelectCity,
  onFullscreenChange,
  fullscreenRightInset,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.LayerGroup | null>(null);
  const dataLayerRef = useRef<L.LayerGroup | null>(null);

  const [mapStyle, setMapStyle] = useState<'satellite' | 'dark'>('satellite');
  const [showFlowlines, setShowFlowlines] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [legendOpen, setLegendOpen] = useState<boolean>(true);
  const [indiaView, setIndiaView] = useState<boolean>(true);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [CITY_CENTERS.ALL.lat, CITY_CENTERS.ALL.lng],
      zoom: CITY_CENTERS.ALL.zoom,
      zoomControl: false,
    });
    L.control.zoom({ position: 'bottomleft' }).addTo(map);
    tileRef.current = L.layerGroup().addTo(map);
    dataLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const group = tileRef.current;
    if (!group) return;
    group.clearLayers();
    if (mapStyle === 'satellite') {
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 18,
        attribution: 'Esri World Imagery',
      }).addTo(group);
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 18,
      }).addTo(group);
    } else {
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16,
        attribution: 'Esri, DeLorme, NAVTEQ',
      }).addTo(group);
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16,
      }).addTo(group);
    }
  }, [mapStyle]);

  useEffect(() => {
    setIndiaView(cityFilter === 'ALL');
    const map = mapRef.current;
    if (!map) return;
    if (beatFilter) {
      const beatOutlets = outlets.filter((o) => beatFilter.split(',').includes(o.beat_id));
      if (beatOutlets.length > 0) {
        const bounds = L.latLngBounds(beatOutlets.map((o) => [o.lat, o.lng] as [number, number]));
        map.flyToBounds(bounds.pad(0.28), { duration: 0.7 });
        return;
      }
    }
    const target = CITY_CENTERS[cityFilter] || CITY_CENTERS.ALL;
    map.flyTo([target.lat, target.lng], target.zoom, { duration: 0.7 });
  }, [cityFilter, beatFilter]);

  useEffect(() => {
    const group = dataLayerRef.current;
    const map = mapRef.current;
    if (!group || !map) return;
    group.clearLayers();

    if (cityFilter === 'ALL') {
      (['Bangalore', 'Hyderabad', 'Chennai'] as const).forEach((cname) => {
        const co = outlets.filter((o) => o.city === cname);
        const crit = co.filter((o) => o.health_status === 'critical').length;
        const c = CITY_CENTERS[cname];
        const isBlr = cname === 'Bangalore';
        const icon = L.divIcon({
          className: '',
          html: `<div style="transform:translate(-50%,-50%);min-width:168px" class="bg-[#161b22]/95 border ${
            isBlr ? 'border-rose-500 ring-2 ring-rose-500/30' : 'border-[#58a6ff]/70'
          } rounded-xl px-3 py-2 shadow-2xl text-xs cursor-pointer">
            <div class="font-bold text-white flex items-center justify-between gap-2">
              <span>${cname}</span>
              <span style="color:#f85149;font-family:monospace">${crit} Zero-Bill</span>
            </div>
            <div class="text-[10px] text-[#8b949e] font-mono mt-0.5">${co.length} outlets${
              isBlr ? ' · South Cluster -14%' : ''
            }</div>
          </div>`,
        });
        L.marker([c.lat, c.lng], { icon })
          .on('click', () => onSelectCity(cname))
          .addTo(group);
      });
    }

    // POIs: Q-Commerce Dark Stores (600m cannibalization rings), College Campus, Traffic Bottleneck
    const allPois = infrastructure?.pois || infrastructure?.dark_stores || [];
    allPois.forEach((p) => {
      if (p.kind === 'qcommerce' || !p.kind) {
        L.circle([p.lat, p.lng], {
          radius: 600,
          color: '#a371f7',
          weight: 1.5,
          dashArray: '4 4',
          fillColor: '#a371f7',
          fillOpacity: 0.12,
        }).addTo(group);
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:14px;height:14px;transform:translate(-50%,-50%);background:#a371f7;border:2px solid #fff;border-radius:3px;"></div>`,
        });
        L.marker([p.lat, p.lng], { icon })
          .bindTooltip(`Q-Commerce Dark Store: ${p.name} (600m impact zone)`, { direction: 'top' })
          .addTo(group);
      } else if (p.kind === 'college') {
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:15px;height:15px;transform:translate(-50%,-50%);background:#388bfd;border:2px solid #fff;border-radius:999px;"></div>`,
        });
        L.marker([p.lat, p.lng], { icon })
          .bindTooltip(`POI: ${p.name} (High Classmate & YiPPee! demand)`, { direction: 'top' })
          .addTo(group);
      } else if (p.kind === 'traffic') {
        const icon = L.divIcon({
          className: '',
          html: `<div style="transform:translate(-50%,-50%);" class="px-2 py-0.5 rounded bg-amber-950/95 border border-amber-400 text-amber-200 text-[10px] font-mono whitespace-nowrap shadow-lg">⚠ ${p.name}</div>`,
        });
        L.marker([p.lat, p.lng], { icon }).addTo(group);
      }
    });

    // Wholesale Distributor Hubs (WD)
    infrastructure?.wds.forEach((wd) => {
      const wdIcon = L.divIcon({
        className: '',
        html: `<div style="width:15px;height:15px;transform:translate(-50%,-50%) rotate(45deg);background:#f59e0b;border:2px solid #0d1117;box-shadow:0 0 10px rgba(245,158,11,0.6);"></div>`,
      });
      L.marker([wd.lat, wd.lng], { icon: wdIcon })
        .bindTooltip(`WD Hub: ${wd.name} (Fill ${(wd.fill_rate_base * 100).toFixed(0)}%)`, { direction: 'top' })
        .addTo(group);
    });

    // Planned vs Actual Beat Flowlines (Green Covered vs Dashed Skipped Tail)
    if (showFlowlines && cityFilter !== 'ALL') {
      const byBeat = new Map<string, OutletSummary[]>();
      outlets.forEach((o) => {
        const list = byBeat.get(o.beat_id) || [];
        list.push(o);
        byBeat.set(o.beat_id, list);
      });
      byBeat.forEach((list) => {
        const sorted = [...list].sort((a, b) => (a.beat_seq ?? 0) - (b.beat_seq ?? 0));
        if (sorted.length < 2) return;
        const visited = sorted.filter((o) => o.visited_on_time !== false);
        const skipped = sorted.filter((o) => o.visited_on_time === false);
        if (visited.length >= 2) {
          L.polyline(
            visited.map((o) => [o.lat, o.lng] as [number, number]),
            { color: '#2ea043', weight: 2.6, opacity: 0.78 },
          ).addTo(group);
        }
        if (skipped.length >= 1 && visited.length >= 1) {
          const tail = [visited[visited.length - 1], ...skipped];
          L.polyline(
            tail.map((o) => [o.lat, o.lng] as [number, number]),
            { color: '#f85149', weight: 2.6, opacity: 0.85, dashArray: '6 6' },
          )
            .bindTooltip('Traffic cutoff after 4:15 PM · Tail outlets skipped 3w in a row')
            .addTo(group);
        }
      });
    }

    // Rebalanced Split Polygons (Step 5 Simulation)
    if (simulatedBeat && simulatedBeat.polygon_a && simulatedBeat.polygon_b) {
      if (simulatedBeat.polygon_a.length >= 3) {
        L.polygon(simulatedBeat.polygon_a, {
          color: '#2ea043',
          weight: 2,
          fillColor: '#2ea043',
          fillOpacity: 0.16,
        })
          .bindTooltip(`${simulatedBeat.beat_id}A (Rebalanced Route · finishes 4:20 PM)`)
          .addTo(group);
      }
      if (simulatedBeat.polygon_b.length >= 2) {
        L.polyline(simulatedBeat.polygon_b, {
          color: '#58a6ff',
          weight: 3.5,
          dashArray: '4 2',
        })
          .bindTooltip(`${simulatedBeat.target_transfer_beat} · -28% travel time`)
          .addTo(group);
      }
    }

    // Outlet pins
    outlets.forEach((o) => {
      const color = HEALTH_COLOR[o.health_status];
      const isSelected = o.outlet_id === selectedOutletId;
      const pulseClass =
        o.health_status === 'critical' ? 'pin-pulse-critical' : o.health_status === 'warning' ? 'pin-pulse-warning' : '';
      const size = isSelected ? 16 : o.health_status === 'critical' ? 13 : 10;
      const icon = L.divIcon({
        className: '',
        html: `<div class="${pulseClass}" style="width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:${
          isSelected ? '3px solid #ffffff' : '2px solid #0d1117'
        };transform:translate(-50%,-50%);cursor:pointer;"></div>`,
      });
      L.marker([o.lat, o.lng], { icon })
        .bindTooltip(
          `<div class="text-xs font-sans"><strong>${o.outlet_id} · ${o.name}</strong><br/>Beat ${o.beat_id} · LSPC ${o.current_lspc}/${o.target_lspc}<br/>GPS: ${
            o.actual_gps_time || 'Verified'
          } · Risk ₹${o.revenue_leakage_monthly_inr.toLocaleString()}/mo</div>`,
          { direction: 'top' },
        )
        .on('click', () => onSelectOutlet(o.outlet_id))
        .addTo(group);
    });
  }, [outlets, selectedOutletId, cityFilter, infrastructure, showFlowlines, simulatedBeat, onSelectOutlet, onSelectCity]);

  useUiCommands((cmd) => {
    const map = mapRef.current;
    if (!map) return;
    if (cmd.action === 'basemap') setMapStyle(cmd.value === 'satellite' ? 'satellite' : 'dark');
    else if (cmd.action === 'flowlines') setShowFlowlines(cmd.value !== 'off');
    else if (cmd.action === 'legend') setLegendOpen(cmd.value !== 'off');
    else if (cmd.action === 'zoom') cmd.value === 'out' ? map.zoomOut() : map.zoomIn();
    else if (cmd.action === 'focus_outlet' && cmd.outlet_id) {
      const f = outlets.find((o) => o.outlet_id === cmd.outlet_id);
      if (f) map.flyTo([f.lat, f.lng], 15, { duration: 0.7 });
    } else if (cmd.action === 'fullscreen') {
      const next = cmd.value === 'on';
      setIsFullscreen(next);
      onFullscreenChange?.(next);
      setTimeout(() => map.invalidateSize(), 200);
    }
  });

  const toggleFullscreen = () => {
    const next = !isFullscreen;
    setIsFullscreen(next);
    onFullscreenChange?.(next);
    setTimeout(() => mapRef.current?.invalidateSize(), 200);
  };

  const cityLabel = useMemo(() => (cityFilter === 'ALL' ? 'South India' : cityFilter), [cityFilter]);

  return (
    <div
      style={isFullscreen && fullscreenRightInset ? { right: fullscreenRightInset } : undefined}
      className={isFullscreen ? 'fixed inset-y-0 left-0 right-0 z-[900] bg-background' : 'relative w-full h-full'}
    >
      <div ref={containerRef} className="w-full h-full" />

      {/* Top-Right Single Pill Map Switcher (matches WellMap.tsx) */}
      <div className="absolute top-3 right-3 z-[500] flex items-center gap-1 bg-[#12161c]/90 backdrop-blur-md p-1 rounded-lg border border-border shadow-xl text-xs font-mono">
        <button
          type="button"
          onClick={() => onSelectCity('ALL')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
            indiaView ? 'bg-accent text-[#0d1117] font-bold' : 'text-textMuted hover:text-white'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>India</span>
        </button>
        <button
          type="button"
          onClick={() => setMapStyle((s) => (s === 'satellite' ? 'dark' : 'satellite'))}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-textMuted hover:text-white transition-colors"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{mapStyle === 'satellite' ? 'Satellite' : 'Dark Map'}</span>
        </button>
        <button
          type="button"
          onClick={() => setShowFlowlines((v) => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
            showFlowlines ? 'bg-sky-950/80 text-sky-300 border border-sky-700/50' : 'text-textMuted hover:text-white'
          }`}
        >
          <Network className="w-3.5 h-3.5" />
          <span>Beat Routes</span>
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-textMuted hover:text-white transition-colors"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          <span>{isFullscreen ? 'Normal View' : 'Fullscreen'}</span>
        </button>
      </div>

      {/* Bottom-Right Synthetic Data Label (matches WellMap.tsx) */}
      <div className="absolute bottom-4 right-4 z-[400] bg-amber-950/80 border border-amber-700/60 text-amber-200 px-2 py-1 rounded text-[10px] font-mono shadow-xl">
        ⚠ Synthetic ITC TM&amp;D dataset (demo)
      </div>

      {/* Bottom-Left Collapsible See-Through Health & Overlay Legend (matches WellMap.tsx) */}
      <div className="absolute bottom-3 left-14 z-[400] flex items-center gap-3 flex-wrap rounded-md bg-black/45 backdrop-blur-sm border border-white/10 px-2.5 py-1 text-[10px] font-mono text-white/85 max-w-[calc(100%-17rem)]">
        <button
          type="button"
          onClick={() => setLegendOpen((v) => !v)}
          className="text-white/70 hover:text-white uppercase tracking-wider font-bold"
        >
          {cityLabel} {legendOpen ? '▾' : '▸'}
        </button>
        {legendOpen && (
          <>
            <button
              type="button"
              onClick={() => dispatchUi({ action: 'health_filter', value: healthFilter === 'healthy' ? 'all' : 'healthy' })}
              className={`flex items-center gap-1 rounded px-1 ${healthFilter === 'healthy' ? 'bg-white/15 ring-1 ring-white/40' : ''}`}
            >
              <span className="w-2 h-2 rounded-full bg-healthy" />
              <span className="text-white/75">Healthy</span>
              <strong className="text-white">{allOutletsCountByHealth.healthy}</strong>
            </button>
            <button
              type="button"
              onClick={() => dispatchUi({ action: 'health_filter', value: healthFilter === 'attention' ? 'all' : 'attention' })}
              className={`flex items-center gap-1 rounded px-1 ${healthFilter === 'attention' ? 'bg-white/15 ring-1 ring-white/40' : ''}`}
            >
              <span className="w-2 h-2 rounded-full bg-warning" />
              <span className="text-white/75">Attention</span>
              <strong className="text-white">{allOutletsCountByHealth.warning}</strong>
            </button>
            <button
              type="button"
              onClick={() => dispatchUi({ action: 'health_filter', value: healthFilter === 'critical' ? 'all' : 'critical' })}
              className={`flex items-center gap-1 rounded px-1 ${healthFilter === 'critical' ? 'bg-white/15 ring-1 ring-white/40' : ''}`}
            >
              <span className="w-2 h-2 rounded-full bg-critical" />
              <span className="text-white/75">Zero-billing</span>
              <strong className="text-white">{allOutletsCountByHealth.critical}</strong>
            </button>
            <span className="text-white/20">|</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500" />WD</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-purple-400" />Q-Com Pod</span>
            <span className="flex items-center gap-1"><span className="w-3 border-t-2 border-healthy" />Covered</span>
            <span className="flex items-center gap-1"><span className="w-3 border-t-2 border-dashed border-critical" />Skipped</span>
          </>
        )}
      </div>
    </div>
  );
};
