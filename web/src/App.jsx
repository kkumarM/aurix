import { useEffect, useRef, useState } from 'react'
import ScenarioPanel from './components/ScenarioPanel'
import RunResults from './components/RunResults'
import RunHistory from './components/RunHistory'
import TimelineViewer from './components/TimelineViewer'
import TimelineControls from './components/TimelineControls'
import CompareView from './components/CompareView'
import Tabs from './components/Tabs'
import RequestDetails from './components/RequestDetails'
import StageAggregates from './components/StageAggregates'
import { defaultScenario } from './components/ScenarioPanel'
import { saveScenarioEntry, loadScenario, deleteScenario, loadIndex, loadLastScenario } from './utils/scenarioStore'
import AboutGparx from './components/AboutGparx'
import HeaderBar from './components/HeaderBar'
import Footer from './components/Footer'
import { computeDiagnosticsFromTrace } from './utils/diagnostics'
import Sweeps from './components/Sweeps.tsx'
import StartHere from './components/StartHere'
import QuickQuestions from './components/QuickQuestions'
import HintPill from './components/HintPill'
import DecisionSummary from './components/DecisionSummary'
import ExplainPanel from './components/ExplainPanel'
import StoryMode from './components/StoryMode'
import FlowMap from './components/FlowMap'
import LlmCostPlanner from './components/LlmCostPlanner'
import RealTraceWorkspace from './components/RealTraceWorkspace'
import GeneratedScenarioSummary from './components/GeneratedScenarioSummary'
import Card from './components/ui/Card'
import { buildJsonReport, buildMarkdownReport } from './utils/llmCost'
import { buildAgentPayload } from './utils/agentPayload'
import AgentDiagnosisPanel from './components/agent/AgentDiagnosisPanel'

const API = '' // proxied to 8080 via Vite config

export default function App() {
  const [scenario, setScenario] = useState(() => loadLastScenario())
  const [run, setRun] = useState(null)
  const [runs, setRuns] = useState(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('sim_runs') : null
    return saved ? JSON.parse(saved) : []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [compareIds, setCompareIds] = useState([])
  const [activeTab, setActiveTab] = useState(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('active_tab') : null
    if (saved === 'results') return 'decision'
    return saved || 'planner'
  })
  const [timelineHeight, setTimelineHeight] = useState(false)
  const [timelineCurrent, setTimelineCurrent] = useState(0)
  const [timelineZoom, setTimelineZoom] = useState(0.4)
  const [highlightActive, setHighlightActive] = useState(true)
  const [heatOverlay, setHeatOverlay] = useState(false)
  const [highlightLane, setHighlightLane] = useState(null)
  const [storyOpen, setStoryOpen] = useState(() => {
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem('storymode') : null
    return v !== 'dismissed'
  })
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [inspectorOpen, setInspectorOpen] = useState(() => {
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem('inspector_open') : null
    return v ? v === '1' : false
  })
  const [counters, setCounters] = useState({ queued: 0, gpu: 0, transfer: 0, cpu: 0, total: 0 })
  const [timelineMeta, setTimelineMeta] = useState({ end: 0 })
  const [selectedSpan, setSelectedSpan] = useState(null)
  const [diagnostics, setDiagnostics] = useState(null)
  const [advisor, setAdvisor] = useState(null)
  const [advisorGoal, setAdvisorGoal] = useState('balanced')
  const [advisorRequestKey, setAdvisorRequestKey] = useState(0)
  const [advisorLoading, setAdvisorLoading] = useState(false)
  const [advisorError, setAdvisorError] = useState('')
  const [showExplain, setShowExplain] = useState(false)
  const rafRef = useRef()
  const [collapsed, setCollapsed] = useState(false)
  const [panelWidth, setPanelWidth] = useState(() => {
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem('panel_width') : null
    return v ? parseInt(v, 10) : 380
  })
  const [resizing, setResizing] = useState(false)
  const [savedList, setSavedList] = useState(loadIndex())
  const [wizardRequestKey, setWizardRequestKey] = useState(0)
  const [sweepRequest, setSweepRequest] = useState({ mode: 'rps', key: 0 })
  const plannerReport = run?.plannerReport || null
  const plannerScenario = plannerReport?.generatedScenario || run?.scenario
  const isPlannerGenerated = Boolean(run?.scenario?.meta?.llm_planner)

  const addRun = (newRun) => setRuns((prev) => [...prev.slice(-9), newRun])
  const goCompare = () => setActiveTab('compare')
  const goSweeps = () => setActiveTab('sweeps')
  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(''), 1400)
  }

  useEffect(() => {
    localStorage.setItem('sim_runs', JSON.stringify(runs.slice(-10)))
  }, [runs])

  useEffect(() => {
    localStorage.setItem('active_tab', activeTab)
  }, [activeTab])

  useEffect(() => {
    if (!run?.id) {
      setDiagnostics(null)
      return
    }
    let cancelled = false
    fetch(`${API}/v1/runs/${run.id}/trace`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        const diag = computeDiagnosticsFromTrace(json)
        setDiagnostics(diag)
      })
      .catch(() => !cancelled && setDiagnostics(null))
    return () => { cancelled = true }
  }, [run?.id])

  useEffect(() => {
    if (!run) {
      setAdvisor(null)
      setAdvisorError('')
      setAdvisorLoading(false)
      return
    }

    const payload = buildAgentPayload({ run, scenario, goal: advisorGoal })
    let cancelled = false
    setAdvisorLoading(true)
    setAdvisorError('')

    fetch(`${API}/v1/agent/diagnose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((res) => res.ok ? res.json() : res.json().then((body) => Promise.reject(body.error || 'Advisor request failed')))
      .then((json) => {
        if (cancelled) return
        setAdvisor(json)
      })
      .catch((err) => {
        if (cancelled) return
        setAdvisorError(typeof err === 'string' ? err : 'Advisor request failed')
        setAdvisor(null)
      })
      .finally(() => {
        if (!cancelled) setAdvisorLoading(false)
      })

    return () => { cancelled = true }
  }, [run, scenario, advisorGoal, advisorRequestKey])

  // panel resize handlers
  useEffect(() => {
    if (!resizing) return
    const onMove = (e) => {
      const next = Math.min(520, Math.max(300, e.clientX - 24))
      setPanelWidth(next)
      localStorage.setItem('panel_width', String(next))
    }
    const onUp = () => setResizing(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [resizing])

  // keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      const tag = e.target?.tagName?.toLowerCase()
      if (['input', 'textarea', 'select'].includes(tag)) return
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'Enter') {
        e.preventDefault()
        handleRun(scenario)
      } else if (mod && (e.key === 's' || e.key === 'S')) {
        e.preventDefault()
        handleSave(scenario)
      } else if (mod && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault()
        handleReset()
      } else if (e.key === 'Escape') {
        setCollapsed(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [scenario])

  const handleRun = async (sc) => {
    setError('')
    setLoading(true)
    setRun(null)
    setScenario(sc)
    try {
      const res = await fetch(`${API}/v1/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: sc }),
      })
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}))
        throw new Error(msg.error || 'Failed to start run')
      }
      const data = await res.json()
      const runId = data.run_id
      const summary = data.summary
      const breakdown = data.breakdown || (await (await fetch(`${API}/v1/runs/${runId}/breakdown`)).json())
      const tracePath = data.artifacts?.trace
      const newRun = { id: runId, summary, trace: tracePath, breakdown, scenario: sc }
      setRun(newRun)
      addRun(newRun)
      setActiveTab('decision')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCompare = (aId, bId) => {
    setCompareIds((prev) => [aId ?? prev[0], bId ?? prev[1]])
  }

  const openTimeline = () => setActiveTab('timeline')
  const openRunById = (id, tab = 'timeline') => {
    const r = runs.find((x) => x.id === id)
    if (r) {
      setRun(r)
      setActiveTab(tab)
    }
  }
  const openRunTimelineById = (id) => openRunById(id, 'timeline')
  const openRunSummaryById = (id) => openRunById(id, 'decision')

  // timeline playback loop
  useEffect(() => {
    if (!playing) return
    const tick = () => {
      setTimelineCurrent((c) => {
        const next = c + 16 * speed
        if (next >= timelineMeta.end) {
          setPlaying(false)
          return timelineMeta.end
        }
        return next
      })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => rafRef.current && cancelAnimationFrame(rafRef.current)
  }, [playing, speed, timelineMeta.end])

  const handleSave = (sc) => {
    try {
      const { index } = saveScenarioEntry(sc)
      setSavedList(index)
      showToast('Scenario saved')
    } catch {
      setToast('Save failed')
    }
  }

  const handleLoad = (id) => {
    if (!id) return
    const sc = loadScenario(id)
    if (sc) {
      setScenario(sc)
      showToast('Scenario loaded')
    }
  }

  const handleDelete = (id) => {
    if (!id) return
    if (!confirm('Delete saved scenario?')) return
    const idx = deleteScenario(id)
    setSavedList(idx)
  }

  const handleReset = () => setScenario(defaultScenario)
  const openScenarioBuilder = () => {
    setCollapsed(false)
    setActiveTab('expert')
  }
  const openWizard = () => {
    setCollapsed(false)
    setActiveTab('expert')
    setWizardRequestKey((prev) => prev + 1)
  }
  const openPlanner = () => setActiveTab('planner')
  const openTraceWorkspace = () => setActiveTab('trace')
  const openSweepsForScenario = (nextScenario, mode = 'rps') => {
    setCollapsed(false)
    setScenario(structuredClone(nextScenario))
    setSweepRequest({ mode, key: Date.now() })
    setActiveTab('sweeps')
  }
  const handlePlannerRun = (plannerRun, generatedScenario, report) => {
    const runWithReport = { ...plannerRun, plannerReport: report }
    setScenario(generatedScenario)
    setRun(runWithReport)
    addRun(runWithReport)
    setActiveTab('decision')
  }
  const openPlannerScenario = (generatedScenario) => {
    setCollapsed(false)
    setScenario(structuredClone(generatedScenario))
    setActiveTab('expert')
  }
  const openPlannerTimeline = (plannerRun, generatedScenario) => {
    setCollapsed(false)
    setScenario(structuredClone(generatedScenario))
    setRun(plannerRun)
    setActiveTab('timeline')
  }
  const openPlannerCompare = (runAId, runBId) => {
    setCompareIds([runAId, runBId])
    setActiveTab('compare')
  }
  const loadExampleScenario = (nextScenario) => {
    setCollapsed(false)
    setScenario(structuredClone(nextScenario))
    setActiveTab('expert')
    showToast(`Loaded ${nextScenario.name}`)
  }
  const loadAndRunExampleScenario = (nextScenario) => {
    setCollapsed(false)
    setActiveTab('decision')
    handleRun(structuredClone(nextScenario))
  }
  const editCurrentScenarioInExpert = () => {
    if (plannerScenario) {
      setScenario(structuredClone(plannerScenario))
    }
    setCollapsed(false)
    setActiveTab('expert')
  }

  const startResize = (e) => {
    e.preventDefault()
    setResizing(true)
  }
  const downloadFile = (text, mime, fileName) => {
    const blob = new Blob([text], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <HeaderBar backendUrl={API} onOpenTimeline={openTimeline} hasRun={!!run} activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 p-4 lg:p-6">
        <section className="bg-slate-900/60 border border-slate-800 rounded-xl shadow relative">
          <Tabs
            tabs={[
              { id: 'planner', label: 'LLM Planner' },
              { id: 'decision', label: 'Decision' },
              { id: 'advisor', label: 'Advisor' },
              { id: 'timeline', label: 'Timeline' },
              { id: 'compare', label: 'Compare' },
              { id: 'sweeps', label: 'Sweeps' },
              { id: 'trace', label: 'Real Trace' },
              { id: 'expert', label: 'Expert' },
            ]}
            active={activeTab}
            onChange={setActiveTab}
          />
          <div className="p-4 space-y-4">
            {activeTab === 'planner' && (
              <LlmCostPlanner
                backendUrl={API}
                onPlannerRun={handlePlannerRun}
                onOpenScenario={openPlannerScenario}
                onOpenTimeline={openPlannerTimeline}
                onOpenSweep={openSweepsForScenario}
                onCompareRuns={openPlannerCompare}
              />
            )}

            {activeTab === 'decision' && (
              <div className="space-y-4">
                {(!run && !loading) ? (
                  <>
                    <Card className="p-5 flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="text-xl font-semibold text-slate-100">Choose your workflow</div>
                        <div className="text-sm text-slate-400">Use the LLM Planner for capacity and cost planning, or open Expert mode for full manual control.</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button className="px-4 py-2 rounded-md bg-emerald-500 text-slate-950 font-semibold" onClick={openPlanner}>Open LLM Planner</button>
                        <button className="px-4 py-2 rounded-md border border-slate-700 text-slate-200" onClick={openScenarioBuilder}>Open Expert Mode</button>
                      </div>
                    </Card>
                    <StartHere
                      onOpenPlanner={openPlanner}
                      onOpenWizard={openWizard}
                      onOpenCompare={() => runs.length ? goCompare() : goSweeps()}
                      onUploadTrace={openTraceWorkspace}
                      onOpenScenarioBuilder={openScenarioBuilder}
                      onOpenDocs={() => setActiveTab('docs')}
                      onLoadExample={loadExampleScenario}
                      onLoadAndRunExample={loadAndRunExampleScenario}
                    />
                  </>
                ) : (
                  <>
                    {isPlannerGenerated && (
                      <GeneratedScenarioSummary
                        scenario={plannerScenario}
                        onEditExpert={editCurrentScenarioInExpert}
                      />
                    )}
                    {plannerReport && (
                      <Card className="p-5 space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-xl font-semibold text-slate-100">LLM Estimate Decision</div>
                          <span className={`px-2 py-1 text-xs rounded-full border ${
                            plannerReport.feasibility === 'Feasible'
                              ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-200'
                              : plannerReport.feasibility === 'Risky'
                                ? 'border-amber-500/40 bg-amber-500/20 text-amber-100'
                                : 'border-red-500/40 bg-red-500/20 text-red-200'
                          }`}>{plannerReport.feasibility}</span>
                        </div>
                        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                          <DecisionMetric label="Required GPU count" value={String(plannerReport.requiredGpus || '—')} />
                          <DecisionMetric label="Monthly cost" value={`$${plannerReport.monthlyCost.toFixed(2)}`} />
                          <DecisionMetric label="Cost / 1M tokens" value={`$${plannerReport.costPer1MTokens.toFixed(2)}`} />
                          <DecisionMetric label="p50 / p99" value={`${plannerReport.latencyP50Ms.toFixed(1)} / ${plannerReport.latencyP99Ms.toFixed(1)} ms`} />
                          <DecisionMetric label="Bottleneck" value={plannerReport.bottleneck} />
                          <DecisionMetric label="Memory" value={plannerReport.memoryStatus.replace('Memory ', '')} />
                        </div>
                        <div className="text-sm text-slate-300">{plannerReport.feasibilityExplanation}</div>
                        <div className="flex flex-wrap gap-2">
                          <button className="px-4 py-2 rounded-md bg-emerald-500 text-slate-950 font-semibold" onClick={openTimeline}>View Timeline</button>
                          <button className="px-4 py-2 rounded-md border border-slate-700 text-slate-200" onClick={() => openSweepsForScenario(plannerScenario, 'rps')}>Run Sweep</button>
                          <button className="px-4 py-2 rounded-md border border-slate-700 text-slate-200" onClick={openPlanner}>Compare GPU</button>
                          <button className="px-4 py-2 rounded-md border border-slate-700 text-slate-200" onClick={editCurrentScenarioInExpert}>Edit in Expert Mode</button>
                          <button className="px-4 py-2 rounded-md border border-slate-700 text-slate-200" onClick={() => downloadFile(buildMarkdownReport(plannerReport), 'text/markdown', 'gparx-llm-cost-plan.md')}>Export Markdown</button>
                          <button className="px-4 py-2 rounded-md border border-slate-700 text-slate-200" onClick={() => downloadFile(buildJsonReport(plannerReport), 'application/json', 'gparx-llm-cost-plan.json')}>Export JSON</button>
                        </div>
                      </Card>
                    )}
                    <DecisionSummary
                      diagnostics={diagnostics}
                      summary={run?.summary}
                      scenario={run?.scenario || scenario}
                      onExplain={() => setShowExplain(true)}
                    />
                    <HintPill id="decision-hint" text="Use Decision first, then move into Timeline, Compare, or Sweeps only if you need to explain why." />
                    <RunResults
                      scenario={scenario}
                      run={run}
                      loading={loading}
                      error={error}
                      onOpenTimeline={openTimeline}
                      diagnostics={diagnostics}
                      backendUrl={API}
                      addRun={addRun}
                      setRun={setRun}
                      setActiveTab={setActiveTab}
                    />
                    {showExplain && (
                      <ExplainPanel
                        summary={run?.summary}
                        diagnostics={diagnostics}
                        onClose={() => setShowExplain(false)}
                      />
                    )}
                    <QuickQuestions
                      onBottleneck={() => setActiveTab('decision')}
                      onSla={() => setActiveTab('decision')}
                      onConcurrency={() => (runs.length ? goSweeps() : setActiveTab('docs'))}
                      onGpuCount={openPlanner}
                      onCompare={() => goCompare()}
                    />
                  </>
                )}
              </div>
            )}

            {activeTab === 'advisor' && (
              <AgentDiagnosisPanel
                run={run}
                scenario={run?.scenario || scenario}
                advisor={advisor}
                goal={advisorGoal}
                loading={advisorLoading}
                error={advisorError}
                onGoalChange={setAdvisorGoal}
                onRetry={() => setAdvisorRequestKey((prev) => prev + 1)}
                onRunSweep={() => openSweepsForScenario(run?.scenario || scenario, 'rps')}
                onCompareGpu={openPlanner}
                onOpenTimeline={openTimeline}
              />
            )}

            {activeTab === 'timeline' && (
              <div className="space-y-3">
                {!run && <div className="text-slate-400 text-sm">Run an estimate or expert simulation to see the timeline.</div>}
                {run && <HintPill id="timeline-hint" text="Use the timeline to explain the Decision page: queueing, transfers, and compute should line up with the bottleneck call." />}
                {run && (
                  <>
                    {isPlannerGenerated && (
                      <GeneratedScenarioSummary
                        scenario={plannerScenario}
                        onEditExpert={editCurrentScenarioInExpert}
                        collapsible
                        compact
                      />
                    )}
                    <TimelineControls
                      playing={playing}
                      onTogglePlay={() => setPlaying((p) => !p)}
                      current={timelineCurrent}
                      end={timelineMeta.end}
                      onScrub={(v) => { setTimelineCurrent(v); setPlaying(false) }}
                      speed={speed}
                      onSpeed={setSpeed}
                      zoom={timelineZoom}
                      onZoom={setTimelineZoom}
                      highlight={highlightActive}
                      onHighlight={setHighlightActive}
                      heatOverlay={heatOverlay}
                      onHeatOverlay={setHeatOverlay}
                      counters={counters}
                      onToggleInspector={() => {
                        const next = !inspectorOpen
                        setInspectorOpen(next)
                        localStorage.setItem('inspector_open', next ? '1' : '0')
                      }}
                      primaryBadge={diagnostics?.primary}
                      onExplain={() => setShowExplain(true)}
                      onStory={() => setStoryOpen(true)}
                      highlightLane={highlightLane}
                    />
                    <DecisionSummary
                      diagnostics={diagnostics}
                      summary={run?.summary}
                      scenario={run?.scenario || scenario}
                      compact
                    />
                    <FlowMap
                      diagnostics={diagnostics}
                      stageAggregates={run?.breakdown?.stage_aggregates}
                      selected={highlightLane}
                      onSelect={(lane) => setHighlightLane(lane)}
                    />

                    <div className={`grid gap-3 ${inspectorOpen ? 'lg:grid-cols-[1fr,280px]' : 'lg:grid-cols-[1fr]'} `} style={{ minHeight: timelineHeight ? 520 : 420 }}>
                      <div className="min-h-[420px]">
                        {storyOpen && (
                          <div className="absolute z-40">
                            <StoryMode
                              onSelectLane={(lane) => setHighlightLane(lane)}
                              onClose={() => setStoryOpen(false)}
                            />
                          </div>
                        )}
                        <TimelineViewer
                          runId={run.id}
                          backendUrl={API}
                          height={timelineHeight ? 520 : 420}
                          current={timelineCurrent}
                          onCurrentChange={(v) => { setTimelineCurrent(v) }}
                          zoom={timelineZoom}
                          highlightActive={highlightActive}
                          highlightLane={highlightLane}
                          heatOverlay={heatOverlay}
                          onActiveChange={setCounters}
                          onMeta={setTimelineMeta}
                          selected={selectedSpan}
                          onSelect={setSelectedSpan}
                          compact={inspectorOpen === false}
                        />
                      </div>
                      {inspectorOpen && (
                        <div className="space-y-3 bg-slate-900/70 border border-slate-800 rounded p-3">
                          <div className="flex items-center justify-between text-sm text-slate-200">
                            <span>Inspector</span>
                            <button className="text-slate-400" onClick={() => { setInspectorOpen(false); localStorage.setItem('inspector_open', '0') }}>✕</button>
                          </div>
                          <div className="text-xs text-slate-500">Selected span details and stage breakdown</div>
                          <RequestDetails breakdown={run.breakdown} selectedId={selectedSpan ? selectedSpan.requestId : null} />
                          <StageAggregates aggregates={run.breakdown?.stage_aggregates} />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'compare' && (
              <CompareView
                runs={runs}
                compareIds={compareIds}
                onSelect={handleCompare}
                backendUrl={API}
                onOpenSummary={openRunSummaryById}
                onOpenTimeline={openRunTimelineById}
              />
            )}

            {activeTab === 'sweeps' && (
              <Sweeps
                backendUrl={API}
                baseScenario={scenario}
                addRun={addRun}
                openRun={openRunTimelineById}
                openRunSummary={openRunSummaryById}
                requestedTab={sweepRequest.mode}
                requestedTabKey={sweepRequest.key}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === 'trace' && (
              <RealTraceWorkspace backendUrl={API} />
            )}

            {activeTab === 'expert' && (
              <div className="grid gap-4 xl:grid-cols-[auto,1fr] items-start">
                <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow h-fit relative" style={{ width: collapsed ? 56 : panelWidth }}>
                  <div className="mb-3 space-y-1">
                    {!collapsed && <div className="text-lg font-semibold text-slate-100">Expert</div>}
                    {!collapsed && <div className="text-sm text-slate-400">Use Expert mode to edit generated scenarios, pipeline stages, transfer sizes, and GPU parameters.</div>}
                  </div>
                  <ScenarioPanel
                    scenario={scenario}
                    setScenario={setScenario}
                    onRun={handleRun}
                    onSave={handleSave}
                    onReset={handleReset}
                    savedList={savedList}
                    onLoad={handleLoad}
                    onDelete={handleDelete}
                    toast={toast}
                    collapsed={collapsed}
                    setCollapsed={setCollapsed}
                    openWizardSignal={wizardRequestKey}
                  />
                  {!collapsed && <div className="mt-2"><HintPill id="expert-hint" text="Expert Scenario Builder lets you edit generated scenarios or build detailed pipeline simulations from scratch." /></div>}
                  <div
                    className="absolute top-0 right-0 h-full w-2 cursor-col-resize"
                    onMouseDown={startResize}
                    title="Drag to resize"
                  />
                </section>

                <section className="space-y-4">
                  {isPlannerGenerated && (
                    <GeneratedScenarioSummary
                      scenario={plannerScenario}
                      onEditExpert={editCurrentScenarioInExpert}
                    />
                  )}
                  {!run && (
                    <Card className="p-5 space-y-3">
                      <div className="text-xl font-semibold text-slate-100">Expert run output</div>
                      <div className="text-sm text-slate-400">Run Simulation from Expert Scenario Builder to populate Decision, Timeline, Compare, and Sweeps with this scenario.</div>
                    </Card>
                  )}
                  {run && (
                    <>
                      <DecisionSummary
                        diagnostics={diagnostics}
                        summary={run?.summary}
                        scenario={run?.scenario || scenario}
                      />
                      <RunResults
                        scenario={scenario}
                        run={run}
                        loading={loading}
                        error={error}
                        onOpenTimeline={openTimeline}
                        diagnostics={diagnostics}
                        backendUrl={API}
                        addRun={addRun}
                        setRun={setRun}
                        setActiveTab={setActiveTab}
                      />
                    </>
                  )}
                </section>
              </div>
            )}

            {activeTab === 'docs' && (
              <div className="p-2">
                <AboutGparx />
              </div>
            )}

            {activeTab === 'help' && (
              <div className="text-sm text-slate-300 space-y-2">
                <div className="font-semibold text-slate-100">How to read</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>Lanes: QUEUE (waiting), CPU (pre/post), H2D/D2H (transfers), GPU (compute).</li>
                  <li>Each bar is a stage span for a request; overlap means parallel work.</li>
                  <li>Playback cursor shows current time; active spans brighten, counters update live.</li>
                  <li>Use Zoom and Speed to inspect hot spots; indicators call out queueing or GPU saturation.</li>
                  <li>Use the Real Trace tab to ingest an Nsight sqlite, then return to Timeline or Compare to reason against simulations.</li>
                </ul>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

function DecisionMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
      <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-100">{value}</div>
    </div>
  )
}
