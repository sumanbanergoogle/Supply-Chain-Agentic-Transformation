import React, { useEffect, useMemo, useState } from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { Header } from './components/common/Header';
import { OutletMap } from './components/map/OutletMap';
import { CityComparisonView, CityHealthPriorityView, BeatSimulatorView } from './components/decision/CityViews';
import { OutletDeepDiveDrawer, CanvasView } from './components/outlet/OutletDeepDiveDrawer';
import { FieldReportOverlay } from './components/outlet/FieldReportOverlay';
import { FloatingAgent, AGENT_DOCK_WIDTH } from './components/agent/FloatingAgent';
import { tmdApi } from './api/client';
import { ChatAction, CityFilter, CityKPIs, InfrastructurePayload, OutletSummary } from './types/tmd';
import { dispatchUi, useUiCommands } from './agent/uiCommands';

type ScreenTab = 'map' | 'city_compare' | 'city_health' | 'beat_simulator';

export function App() {
  const [outlets, setOutlets] = useState<OutletSummary[]>([]);
  const [kpis, setKpis] = useState<CityKPIs | null>(null);
  const [infra, setInfra] = useState<InfrastructurePayload | null>(null);
  const [cityFilter, setCityFilter] = useState<CityFilter>('ALL');
  const [healthFilter, setHealthFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOutletId, setSelectedOutletId] = useState<string | null>(null);
  const [drawerOutletId, setDrawerOutletId] = useState<string | null>(null);
  const [canvasView, setCanvasView] = useState<CanvasView>('overview');
  const [screenTab, setScreenTab] = useState<ScreenTab>('map');
  const [selectedBeatId, setSelectedBeatId] = useState<string | null>(null);
  const [middleExpanded, setMiddleExpanded] = useState(false);
  const [agentDocked, setAgentDocked] = useState(true);
  const [reportOutletId, setReportOutletId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([tmdApi.outlets('ALL'), tmdApi.kpis('ALL'), tmdApi.infrastructure('ALL')])
      .then(([o, k, inf]) => {
        setOutlets(o);
        setKpis(k);
        setInfra(inf);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading) return;
    tmdApi.kpis(cityFilter).then(setKpis).catch(() => {});
  }, [cityFilter, loading]);

  const filteredOutlets = useMemo(() => {
    return outlets.filter((o) => {
      const matchCity = cityFilter === 'ALL' || o.city === cityFilter;
      const matchHealth = healthFilter === 'all' || o.health_status === healthFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        o.outlet_id.toLowerCase().includes(q) ||
        o.name.toLowerCase().includes(q) ||
        o.beat_id.toLowerCase().includes(q) ||
        o.zone.toLowerCase().includes(q) ||
        o.wd_name.toLowerCase().includes(q);
      return matchCity && matchHealth && matchSearch;
    });
  }, [outlets, cityFilter, healthFilter, searchQuery]);

  const filteredInfra = useMemo<InfrastructurePayload | null>(() => {
    if (!infra) return null;
    if (cityFilter === 'ALL') return infra;
    return {
      wds: infra.wds.filter((w) => w.city === cityFilter),
      dark_stores: infra.dark_stores.filter((d) => d.city === cityFilter),
      beats: infra.beats.filter((b) => b.city === cityFilter),
    };
  }, [infra, cityFilter]);

  const selectedOutlet = useMemo(
    () => outlets.find((o) => o.outlet_id === selectedOutletId) || null,
    [outlets, selectedOutletId],
  );

  const openOutlet = (id: string, view: CanvasView = 'overview') => {
    const found = outlets.find((o) => o.outlet_id === id);
    if (found && cityFilter === 'ALL') setCityFilter(found.city);
    setSelectedOutletId(id);
    setDrawerOutletId(id);
    setCanvasView(view);
    setScreenTab('map');
    dispatchUi({ action: 'focus_outlet', outlet_id: id });
  };

  useUiCommands((cmd) => {
    if (cmd.action === 'focus_city' && cmd.value) {
      setCityFilter(cmd.value as CityFilter);
    } else if (cmd.action === 'open_outlet' && cmd.outlet_id) {
      openOutlet(cmd.outlet_id, (cmd.view as CanvasView) || 'overview');
    } else if (cmd.action === 'open_screen' && cmd.value) {
      setScreenTab(cmd.value as ScreenTab);
    } else if (cmd.action === 'health_filter' && cmd.value) {
      setHealthFilter(cmd.value);
    } else if (cmd.action === 'panel') {
      if (cmd.value === 'close') {
        setDrawerOutletId(null);
        setScreenTab('map');
        setMiddleExpanded(false);
      } else if (cmd.value === 'expand') setMiddleExpanded(true);
      else setMiddleExpanded(false);
    } else if (cmd.action === 'report') {
      if (cmd.value === 'close') setReportOutletId(null);
      else setReportOutletId(cmd.outlet_id || drawerOutletId || selectedOutletId || 'BLR-108');
    }
  });

  const handleAgentAction = (a: ChatAction) => {
    if (a.city && (a.city === 'Bangalore' || a.city === 'Hyderabad' || a.city === 'Chennai')) {
      setCityFilter(a.city);
    }
    if (a.screen === 'city_compare' || a.screen === 'city_health' || a.screen === 'beat_simulator') {
      if (a.beat_id) setSelectedBeatId(a.beat_id);
      setScreenTab(a.screen);
    } else if (a.screen === 'outlet' && a.outlet_id) {
      openOutlet(a.outlet_id, (a.view as CanvasView) || 'overview');
    }
  };

  const panelOpen = !!drawerOutletId || screenTab !== 'map';
  const contextLabel = [
    cityFilter === 'ALL' ? 'South Metro (BLR·HYD·CHN)' : cityFilter,
    selectedOutletId,
    screenTab !== 'map' ? screenTab : drawerOutletId ? canvasView : 'Map',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      className="flex flex-col h-screen w-screen bg-background overflow-hidden text-textMain"
      style={agentDocked ? { paddingRight: AGENT_DOCK_WIDTH } : undefined}
    >
      <Header
        kpis={kpis}
        compact={agentDocked}
        selectedHealth={healthFilter}
        onSelectHealth={setHealthFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {loading ? (
        <div className="flex-1 flex items-center justify-center font-mono text-xs text-textMuted">
          Initializing ITC TM&amp;D BeatPulse Analytics &amp; ML Models...
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Map Stage */}
          <section
            className={`${panelOpen ? 'w-1/2 min-w-[340px] border-r border-border' : 'w-full'} flex flex-col relative bg-surface ${
              panelOpen && middleExpanded ? 'hidden' : ''
            }`}
          >
            <OutletMap
              outlets={filteredOutlets}
              selectedOutletId={selectedOutletId}
              cityFilter={cityFilter}
              infrastructure={filteredInfra}
              onSelectOutlet={(id) => openOutlet(id, 'overview')}
              onSelectCity={(c) => setCityFilter(c)}
            />

            {/* Top-Left City & Decision Tab Strip overlaid cleanly on map */}
            <div className="absolute top-3 left-3 z-[500] flex flex-wrap items-center gap-1.5 bg-[#12161c]/90 backdrop-blur-md border border-border rounded-xl p-1.5 text-xs font-mono shadow-xl">
              {(['ALL', 'Bangalore', 'Hyderabad', 'Chennai'] as CityFilter[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setCityFilter(c);
                    setDrawerOutletId(null);
                    setScreenTab('map');
                  }}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    cityFilter === c && screenTab === 'map'
                      ? 'bg-accent text-[#0d1117] font-bold'
                      : 'text-textMuted hover:text-white'
                  }`}
                >
                  {c === 'ALL' ? 'All 3 Cities' : c}
                </button>
              ))}
              <span className="text-border">|</span>
              {(
                [
                  ['city_compare', 'City Benchmark'],
                  ['city_health', 'Priority Queue'],
                  ['beat_simulator', 'Beat Simulator'],
                ] as const
              ).map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setScreenTab(screenTab === tab ? 'map' : tab)}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    screenTab === tab ? 'bg-emerald-500 text-[#0d1117] font-bold' : 'text-textMuted hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* Answer Canvas / Middle Panel */}
          {panelOpen && (
            <section
              className={`${
                middleExpanded ? 'w-full' : 'w-1/2'
              } flex flex-col relative bg-surface overflow-hidden`}
            >
              <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setMiddleExpanded((v) => !v)}
                  className="p-1.5 rounded border border-border bg-[#12161c]/90 text-textMuted hover:text-white"
                  title="Expand panel"
                >
                  {middleExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOutletId(null);
                    setScreenTab('map');
                    setMiddleExpanded(false);
                  }}
                  className="p-1.5 rounded border border-border bg-[#12161c]/90 text-textMuted hover:text-white"
                  title="Close panel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {screenTab === 'city_compare' ? (
                <div className="flex-1 overflow-y-auto p-4 pt-12">
                  <CityComparisonView
                    onSelectCity={(c) => {
                      setCityFilter(c);
                      setScreenTab('map');
                    }}
                  />
                </div>
              ) : screenTab === 'city_health' ? (
                <div className="flex-1 overflow-y-auto p-4 pt-12">
                  <CityHealthPriorityView
                    city={cityFilter}
                    onSelectCity={setCityFilter}
                    onOpenOutlet={(id) => openOutlet(id, 'diagnosis')}
                  />
                </div>
              ) : screenTab === 'beat_simulator' ? (
                <div className="flex-1 overflow-y-auto p-4 pt-12">
                  <BeatSimulatorView city={cityFilter} initialBeatId={selectedBeatId} />
                </div>
              ) : (
                drawerOutletId && (
                  <OutletDeepDiveDrawer
                    outletId={drawerOutletId}
                    view={canvasView}
                    onViewChange={setCanvasView}
                    onSelectOutlet={(id) => openOutlet(id, canvasView)}
                    onOpenReport={setReportOutletId}
                  />
                )
              )}
            </section>
          )}
        </div>
      )}

      <FloatingAgent
        outlet={selectedOutlet}
        city={cityFilter === 'ALL' ? null : cityFilter}
        screen={screenTab}
        contextLabel={contextLabel}
        onAgentAction={handleAgentAction}
        onDockedChange={setAgentDocked}
        suspended={!!reportOutletId}
      />

      {reportOutletId && <FieldReportOverlay outletId={reportOutletId} onClose={() => setReportOutletId(null)} />}
    </div>
  );
}

export default App;
