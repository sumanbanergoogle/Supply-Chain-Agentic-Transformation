import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Globe, Layers, Maximize2, Minimize2, Route } from 'lucide-react';
import { CityFilter, InfrastructurePayload, OutletSummary } from '../../types/tmd';
import { useUiCommands } from '../../agent/uiCommands';

const CITY_CENTERS: Record<string, { lat: number; lng: number; zoom: number }> = {
  ALL: { lat: 14.55, lng: 78.6, zoom: 6 },
  Bangalore: { lat: 12.965, lng: 77.63, zoom: 12 },
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
  selectedOutletId: string | null;
  cityFilter: CityFilter;
  infrastructure: InfrastructurePayload | null;
  onSelectOutlet: (id: string) => void;
  onSelectCity: (c: CityFilter) => void;
  onFullscreenChange?: (fs: boolean) => void;
}

export const OutletMap: React.FC<OutletMapProps> = ({
  outlets,
  selectedOutletId,
  cityFilter,
  infrastructure,
  onSelectOutlet,
  onSelectCity,
  onFullscreenChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.LayerGroup | null>(null);
  const dataLayerRef = useRef<L.LayerGroup | null>(null);
  const [basemap, setBasemap] = useState<'satellite' | 'street'>('satellite');
  const [showTrails, setShowTrails] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Initialize Leaflet map once
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

  // Update tiles when basemap switches
  useEffect(() => {
    const group = tileRef.current;
    if (!group) return;
    group.clearLayers();
    if (basemap === 'satellite') {
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Esri World Imagery',
      }).addTo(group);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(group);
    } else {
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: 'Carto Dark',
      }).addTo(group);
    }
  }, [basemap]);

  // Pan/zoom when cityFilter changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const target = CITY_CENTERS[cityFilter] || CITY_CENTERS.ALL;
    map.flyTo([target.lat, target.lng], target.zoom, { duration: 0.7 });
  }, [cityFilter]);

  // Render markers, WDs, Q-commerce dark store pressure circles, and beat trails
  useEffect(() => {
    const group = dataLayerRef.current;
    const map = mapRef.current;
    if (!group || !map) return;
    group.clearLayers();

    if (cityFilter === 'ALL') {
      // Macro South India city hubs when in ALL mode
      (['Bangalore', 'Hyderabad', 'Chennai'] as const).forEach((cname) => {
        const cityOutlets = outlets.filter((o) => o.city === cname);
        const crit = cityOutlets.filter((o) => o.health_status === 'critical').length;
        const warn = cityOutlets.filter((o) => o.health_status === 'warning').length;
        const leakL = (cityOutlets.reduce((s, o) => s + o.revenue_leakage_monthly_inr, 0) / 100000).toFixed(2);
        const c = CITY_CENTERS[cname];
        const icon = L.divIcon({
          className: '',
          html: `<div style="transform:translate(-50%,-50%);min-width:148px" class="bg-[#161b22]/95 border border-[#58a6ff]/70 rounded-xl px-3 py-2 shadow-2xl text-xs cursor-pointer">
            <div class="font-bold text-white flex items-center justify-between gap-2">
              <span>${cname}</span>
              <span style="color:#f85149;font-family:monospace">🔴 ${crit}</span>
            </div>
            <div class="text-[10px] text-[#8b949e] font-mono mt-0.5">${cityOutlets.length} outlets · 🟡 ${warn}</div>
            <div class="text-[11px] text-rose-300 font-mono mt-1">₹${leakL}L / mo risk</div>
          </div>`,
        });
        const m = L.marker([c.lat, c.lng], { icon }).addTo(group);
        m.on('click', () => onSelectCity(cname));
      });
    }

    // Q-Commerce Dark Store pressure rings & pins
    infrastructure?.dark_stores.forEach((ds) => {
      L.circle([ds.lat, ds.lng], {
        radius: 950,
        color: '#a371f7',
        weight: 1,
        dashArray: '4 4',
        fillColor: '#a371f7',
        fillOpacity: 0.08,
      }).addTo(group);

      const qcIcon = L.divIcon({
        className: '',
        html: `<div title="${ds.name}" style="width:14px;height:14px;transform:translate(-50%,-50%);background:#a371f7;border:2px solid #fff;border-radius:3px;"></div>`,
      });
      L.marker([ds.lat, ds.lng], { icon: qcIcon })
        .bindTooltip(`Q-Com Pod: ${ds.name} (1km pressure)`, { direction: 'top' })
        .addTo(group);
    });

    // Wholesale Distributor Hubs (WD)
    infrastructure?.wds.forEach((wd) => {
      const wdIcon = L.divIcon({
        className: '',
        html: `<div title="${wd.name}" style="width:16px;height:16px;transform:translate(-50%,-50%) rotate(45deg);background:#58a6ff;border:2px solid #0d1117;box-shadow:0 0 10px rgba(88,166,255,0.6);"></div>`,
      });
      L.marker([wd.lat, wd.lng], { icon: wdIcon })
        .bindTooltip(`WD Hub: ${wd.name} (Fill ${(wd.fill_rate_base * 100).toFixed(0)}%)`, { direction: 'top' })
        .addTo(group);
    });

    // Beat route polylines
    if (showTrails && cityFilter !== 'ALL') {
      const byBeat = new Map<string, OutletSummary[]>();
      outlets.forEach((o) => {
        const list = byBeat.get(o.beat_id) || [];
        list.push(o);
        byBeat.set(o.beat_id, list);
      });
      byBeat.forEach((list, beatId) => {
        if (list.length < 2) return;
        const overloaded = beatId.endsWith('B02') || beatId.endsWith('B04');
        L.polyline(
          list.map((o) => [o.lat, o.lng] as [number, number]),
          {
            color: overloaded ? '#f85149' : '#58a6ff',
            weight: overloaded ? 2.2 : 1.5,
            opacity: 0.55,
            dashArray: overloaded ? '6 5' : undefined,
          },
        ).addTo(group);
      });
    }

    // Outlet pins
    outlets.forEach((o) => {
      const color = HEALTH_COLOR[o.health_status];
      const isSelected = o.outlet_id === selectedOutletId;
      const pulseClass =
        o.health_status === 'critical'
          ? 'pin-pulse-critical'
          : o.health_status === 'warning'
            ? 'pin-pulse-warning'
            : '';
      const size = isSelected ? 16 : o.health_status === 'critical' ? 13 : 10;
      const icon = L.divIcon({
        className: '',
        html: `<div class="${pulseClass}" style="width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:${isSelected ? '3px solid #ffffff' : '2px solid #0d1117'};transform:translate(-50%,-50%);cursor:pointer;"></div>`,
      });
      const marker = L.marker([o.lat, o.lng], { icon }).addTo(group);
      marker.bindTooltip(
        `<div class="text-xs font-sans"><strong>${o.outlet_id} · ${o.name}</strong><br/>Beat ${o.beat_id} · LSPC ${o.current_lspc}/${o.target_lspc} · ₹${o.revenue_leakage_monthly_inr.toLocaleString()} risk</div>`,
        { direction: 'top' },
      );
      marker.on('click', () => onSelectOutlet(o.outlet_id));
    });
  }, [outlets, selectedOutletId, cityFilter, infrastructure, showTrails, onSelectOutlet, onSelectCity]);

  // Listen for voice / agent UI commands
  useUiCommands((cmd) => {
    const map = mapRef.current;
    if (!map) return;
    if (cmd.action === 'basemap' && (cmd.value === 'satellite' || cmd.value === 'street')) setBasemap(cmd.value);
    else if (cmd.action === 'beat_trails') setShowTrails(cmd.value !== 'off');
    else if (cmd.action === 'zoom') cmd.value === 'out' ? map.zoomOut() : map.zoomIn();
    else if (cmd.action === 'focus_outlet' && cmd.outlet_id) {
      const found = outlets.find((o) => o.outlet_id === cmd.outlet_id);
      if (found) map.flyTo([found.lat, found.lng], 15, { duration: 0.7 });
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

  return (
    <div className={isFullscreen ? 'fixed inset-0 z-[900] bg-background' : 'relative w-full h-full'}>
      <div ref={containerRef} className="w-full h-full" />

      {/* Top-Right Map Toolbar */}
      <div className="absolute top-3 right-3 z-[500] flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onSelectCity('ALL')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono backdrop-blur-md transition-colors ${
            cityFilter === 'ALL'
              ? 'bg-accent/20 border-accent text-white'
              : 'bg-[#12161c]/90 border-border text-textMuted hover:text-white'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>South India</span>
        </button>

        <button
          type="button"
          onClick={() => setBasemap((b) => (b === 'satellite' ? 'street' : 'satellite'))}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-[#12161c]/90 text-xs font-mono text-textMuted hover:text-white backdrop-blur-md"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{basemap === 'satellite' ? 'Satellite' : 'Dark Map'}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowTrails((v) => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono backdrop-blur-md ${
            showTrails
              ? 'bg-sky-950/70 border-sky-700/60 text-sky-300'
              : 'bg-[#12161c]/90 border-border text-textMuted'
          }`}
        >
          <Route className="w-3.5 h-3.5" />
          <span>Beat Trails</span>
        </button>

        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-1.5 rounded-lg border border-border bg-[#12161c]/90 text-textMuted hover:text-white backdrop-blur-md"
          title="Toggle map fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Bottom-Right Map Legend */}
      <div className="absolute bottom-4 right-3 z-[500] bg-[#12161c]/90 backdrop-blur-md border border-border rounded-lg p-2.5 text-[11px] font-mono space-y-1.5">
        <div className="text-[10px] uppercase tracking-wider text-textMuted">Geospatial Legend</div>
        <div className="flex items-center gap-2 text-emerald-300">
          <span className="w-2.5 h-2.5 rounded-full bg-healthy inline-block" /> Productive Kirana
        </div>
        <div className="flex items-center gap-2 text-amber-300">
          <span className="w-2.5 h-2.5 rounded-full bg-warning inline-block" /> At-Risk (LSPC Drop)
        </div>
        <div className="flex items-center gap-2 text-rose-300">
          <span className="w-2.5 h-2.5 rounded-full bg-critical inline-block" /> Zero-Billing (&gt;2w)
        </div>
        <div className="flex items-center gap-2 text-sky-300 pt-0.5 border-t border-border/50">
          <span className="w-2.5 h-2.5 bg-accent rotate-45 inline-block" /> ITC WD Stockist
        </div>
        <div className="flex items-center gap-2 text-purple-300">
          <span className="w-2.5 h-2.5 bg-[#a371f7] rounded-sm inline-block" /> Q-Com Dark Store
        </div>
      </div>
    </div>
  );
};
