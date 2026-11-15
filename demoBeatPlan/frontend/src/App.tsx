import React, { useEffect, useMemo, useState } from 'react';
import { Maximize2, Minimize2, Play, X } from 'lucide-react';
import { Header } from './components/common/Header';
import { CitySelector } from './components/fields/CitySelector';
import { OutletMap } from './components/map/OutletMap';
import {
  BeatDiagnosisView,
  BeatSimulatorView,
  CityComparisonView,
  CityHealthPriorityView,
} from './components/decision/CityViews';
import { OutletDeepDiveDrawer, CanvasView } from './components/outlet/OutletDeepDiveDrawer';
import { FieldReportOverlay } from './components/outlet/FieldReportOverlay';
import { FloatingAgent, AGENT_DOCK_WIDTH } from './components/agent/FloatingAgent';
import { tmdApi } from './api/client';
import { BeatSimulation, ChatAction, CityFilter, CityKPIs, InfrastructurePayload, OutletSummary } from './types/tmd';
import { dispatchUi, useUiCommands } from './agent/uiCommands';

type ScreenTab = 'map' | 'city_compare' | 'city_health' | 'beat_diagnosis' | 'beat_simulator';

const STORYBOARD_STEPS = [
  { step: 1, label: '1. Macro Q3 Health', prompt: 'Pull up Q3 General Trade health for Bangalore Metro' },
  { step: 2, label: '2. Beat 4 vs Beat 7', prompt: 'Zoom into Beat 4 and Beat 7 and compare salesman visits' },
  { step: 3, label: '3. ML/SHAP Beat 7', prompt: 'Run ML/DL root-cause diagnostic models on Beat 7' },
  { step: 4, label: '4. Lakshmi Mart Vision', prompt: 'Why is Lakshmi Super Mart only buying 2 categories?' },
  { step: 5, label: '5. Rebalance & ASM', prompt: 'Simulate fixing Beat 4 route and Beat 7 SKU push' },
];

export function App() {
  const [outlets, setOutlets] = useState<OutletSummary[]>([]);
  const [kpis, setKpis] = useState<CityKPIs | null>(null);
  const [infra, setInfra] = useState<InfrastructurePayload | null>(null);
  const [cityFilter, setCityFilter] = useState<CityFilter>('ALL');
  const [beatFilter, setBeatFilter] = useState<string | null>(null);
  const [healthFilter, setHealthFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOutletId, setSelectedOutletId] = useState<string | null>(null);
  const [drawerOutletId, setDrawerOutletId] = useState<string | null>(null);
  const [canvasView, setCanvasView] = useState<CanvasView>('overview');
  const [screenTab, setScreenTab] = useState<ScreenTab>('map');
  const [selectedBeatId, setSelectedBeatId] = useState<string>('BLR-B04');
  const [simulatedBeat, setSimulatedBeat] = useState<BeatSimulation | null>(null);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const [middleExpanded, setMiddleExpanded] = useState(false);
  const [mapFullscreen, setMapFullscreen] = useState(false);
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

  const cityScopedOutlets = useMemo(
    () => (cityFilter === 'ALL' ? outlets : outlets.filter((o) => o.city === cityFilter)),
    [outlets, cityFilter],
  );

  const healthCounts = useMemo(
    () => ({
      healthy: cityScopedOutlets.filter((o) => o.health_status === 'healthy').length,
      warning: cityScopedOutlets.filter((o) => o.health_status === 'warning').length,
      critical: cityScopedOutlets.filter((o) => o.health_status === 'critical').length,
    }),
    [cityScopedOutlets],
  );

  const filteredOutlets = useMemo(() => {
    return cityScopedOutlets.filter((o) => {
      const matchBeat = !beatFilter || beatFilter.split(',').includes(o.beat_id);
      const matchHealth = healthFilter === 'all' || o.health_status === healthFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        o.outlet_id.toLowerCase().includes(q) ||
        o.name.toLowerCase().includes(q) ||
        o.beat_id.toLowerCase().includes(q) ||
        o.zone.toLowerCase().includes(q);
      return matchBeat && matchHealth && matchSearch;
    });
  }, [cityScopedOutlets, beatFilter, healthFilter, searchQuery]);

  const filteredInfra = useMemo<InfrastructurePayload | null>(() => {
    if (!infra) return null;
    if (cityFilter === 'ALL') return infra;
    return {
      wds: infra.wds.filter((w) => w.city === cityFilter),
      dark_stores: infra.dark_stores.filter((d) => d.city === cityFilter),
      pois: infra.pois?.filter((p) => p.city === cityFilter),
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
      setBeatFilter(null);
    } else if (cmd.action === 'focus_beat') {
      setBeatFilter(cmd.value || null);
    } else if (cmd.action === 'open_outlet' && cmd.outlet_id) {
      openOutlet(cmd.outlet_id, (cmd.view as CanvasView) || 'overview');
    } else if (cmd.action === 'open_screen' && cmd.value) {
      setScreenTab(cmd.value as ScreenTab);
    } else if (cmd.action === 'health_filter' && cmd.value) {
      setHealthFilter(cmd.value);
    } else if (cmd.action === 'report') {
      if (cmd.value === 'close') setReportOutletId(null);
      else setReportOutletId(cmd.outlet_id || drawerOutletId || selectedOutletId || 'BLR-701');
    }
  });

  const handleAgentAction = (a: ChatAction) => {
    if (a.city && (a.city === 'Bangalore' || a.city === 'Hyderabad' || a.city === 'Chennai')) {
      setCityFilter(a.city);
    }
    if (a.beat_id) setSelectedBeatId(a.beat_id);
    if (a.screen === 'city_compare' || a.screen === 'city_health' || a.screen === 'beat_diagnosis' || a.screen === 'beat_simulator') {
      setScreenTab(a.screen);
    } else if (a.screen === 'outlet' && a.outlet_id) {
      openOutlet(a.outlet_id, (a.view as CanvasView) || 'overview');
    }
  };

  const triggerStoryboardStep = (stepNum: number, prompt: string) => {
    setActiveStep(stepNum);
    window.dispatchEvent(new CustomEvent('beatpulse:run_prompt', { detail: prompt }));
  };

  const panelOpen = !!drawerOutletId || screenTab !== 'map';
  const contextLabel = [
    cityFilter === 'ALL' ? 'South India' : cityFilter,
    selectedOutletId || beatFilter,
    screenTab !== 'map' ? screenTab : drawerOutletId ? canvasView : 'Map',
  ]
    .filter(Boolean)
    .join(' · ');

  const viewBtn = (t: ScreenTab, label: string) => (
    <button
      key={t}
      type="button"
      onClick={() => {
        if (t !== 'beat_simulator') setSimulatedBeat(null);
        setScreenTab(screenTab === t ? 'map' : t);
      }}
      className={`px-2.5 py-1 rounded transition-colors ${
        screenTab === t ? 'bg-accent/80 text-white font-semibold' : 'text-white/75 hover:text-white hover:bg-white/10'
      }`}
    >
      {label}
    </button>
  );

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
          <span className="animate-spin mr-2">◌</span> Initializing BeatPulse ITC TM&amp;D Core...
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <section
            className={`${panelOpen ? 'w-1/2 min-w-[360px] border-r border-border' : 'w-full'} flex flex-col relative bg-surface ${
              panelOpen && middleExpanded ? 'hidden' : ''
            }`}
          >
            <div className="flex-1 relative">
              <OutletMap
                outlets={filteredOutlets}
                allOutletsCountByHealth={healthCounts}
                selectedOutletId={selectedOutletId}
                cityFilter={cityFilter}
                beatFilter={beatFilter}
                healthFilter={healthFilter}
                infrastructure={filteredInfra}
                simulatedBeat={simulatedBeat}
                onSelectOutlet={(id) => openOutlet(id, 'overview')}
                onSelectCity={(c) => {
                  setCityFilter(c);
                  setBeatFilter(null);
                  setSimulatedBeat(null);
                }}
                onFullscreenChange={setMapFullscreen}
                fullscreenRightInset={agentDocked ? AGENT_DOCK_WIDTH : undefined}
              />

              {/* Top-left translucent overlay matching workover-operations-ai-agent-cloudrun/App.tsx */}
              <div className="absolute top-3 left-3 z-[500] flex flex-col items-start gap-1.5 max-w-[calc(100%-1.5rem)] pointer-events-none">
                <div className="pointer-events-auto rounded-lg bg-black/45 backdrop-blur-sm border border-white/10 shadow-lg">
                  <CitySelector
                    value={cityFilter}
                    onChange={(c) => {
                      setCityFilter(c);
                      setBeatFilter(null);
                      setSimulatedBeat(null);
                    }}
                    outlets={outlets}
                    variant="overlay"
                  />
                </div>
                <div className="pointer-events-auto flex items-center gap-0.5 p-1 rounded-lg bg-black/45 backdrop-blur-sm border border-white/10 shadow-lg text-[11px] font-sans flex-wrap">
                  {viewBtn('city_compare', 'Compare cities')}
                  {viewBtn('city_health', 'Health & priority')}
                  {viewBtn('beat_diagnosis', 'Beat 4/7 Diagnosis')}
                  {viewBtn('beat_simulator', 'Beat Simulator')}
                  <span className="text-white/15 px-0.5">|</span>
                  <button
                    type="button"
                    onClick={() => setWalkthroughOpen((v) => !v)}
                    className={`px-2 py-1 rounded transition-colors flex items-center gap-1 font-mono text-[10px] ${
                      walkthroughOpen
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-white/65 hover:text-white hover:bg-white/10'
                    }`}
                    title="Toggle guided executive walkthrough prompts"
                  >
                    <Play className="w-2.5 h-2.5" />
                    <span>Walkthrough {walkthroughOpen ? '▾' : '▸'}</span>
                  </button>
                </div>
                {walkthroughOpen && (
                  <div className="pointer-events-auto flex items-center gap-1 p-1 rounded-lg bg-black/60 backdrop-blur-sm border border-emerald-500/30 shadow-lg text-[10px] font-mono flex-wrap">
                    {STORYBOARD_STEPS.map((s) => (
                      <button
                        key={s.step}
                        type="button"
                        onClick={() => triggerStoryboardStep(s.step, s.prompt)}
                        className={`px-2 py-0.5 rounded transition-colors ${
                          activeStep === s.step
                            ? 'bg-emerald-500 text-[#0d1117] font-bold'
                            : 'text-white/80 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {panelOpen && (
            <section className="flex-1 basis-1/2 min-w-[400px] flex flex-col overflow-hidden relative bg-surface">
              <div className="absolute top-2 right-2 z-30 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMiddleExpanded((v) => !v)}
                  className="p-1.5 rounded border border-border bg-[#12161c]/90 text-textMuted hover:text-white hover:border-accent"
                >
                  {middleExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOutletId(null);
                    setScreenTab('map');
                    setMiddleExpanded(false);
                    setSimulatedBeat(null);
                  }}
                  className="p-1.5 rounded border border-border bg-[#12161c]/90 text-textMuted hover:text-white hover:border-accent"
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
              ) : screenTab === 'beat_diagnosis' ? (
                <div className="flex-1 overflow-y-auto p-4 pt-12">
                  <BeatDiagnosisView
                    beatId={selectedBeatId}
                    onSelectBeat={(b) => {
                      setSelectedBeatId(b);
                      setBeatFilter(b);
                    }}
                    onOpenOutlet={(id) => openOutlet(id, 'vision')}
                  />
                </div>
              ) : screenTab === 'beat_simulator' ? (
                <div className="flex-1 overflow-y-auto p-4 pt-12">
                  <BeatSimulatorView
                    city={cityFilter}
                    initialBeatId={selectedBeatId}
                    onSimulationChange={setSimulatedBeat}
                  />
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
        autoDock={(middleExpanded && panelOpen) || mapFullscreen}
        onDockedChange={setAgentDocked}
        suspended={!!reportOutletId}
      />

      {reportOutletId && <FieldReportOverlay outletId={reportOutletId} onClose={() => setReportOutletId(null)} />}
    </div>
  );
}

export default App;
