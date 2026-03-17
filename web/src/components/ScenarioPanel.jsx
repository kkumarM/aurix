import { useMemo, useState } from 'react'
import Field from './forms/Field'
import { inputBase, selectBase } from '../styles/formClasses'
import PipelineEditor from './PipelineEditor'
import ScenarioWizard from './wizard/ScenarioWizard.tsx'

export const defaultScenario = {
  name: 'Demo Scenario',
  workload: { name: 'demo', rps: 2, duration_s: 10, batch_size: 1, jitter_pct: 5 },
  target: {
    name: 'A10G',
    tflops: 60,
    mem_gbps: 600,
    ms_per_token: 0.2,
    h2d_gbps: 32,
    d2h_gbps: 32,
    concurrency: 2,
  },
  pipeline: [
    { name: 'preprocess', kind: 'fixed_ms', value: 2 },
    { name: 'h2d', kind: 'bytes', value: 8 * 1024 * 1024 },
    { name: 'compute', kind: 'tokens', value: 128 },
    { name: 'd2h', kind: 'bytes', value: 2 * 1024 * 1024 },
    { name: 'postprocess', kind: 'fixed_ms', value: 1 },
  ],
}

const gpuProfiles = {
  A10G: { tflops: 60, mem_gbps: 600, ms_per_token: 0.2, h2d_gbps: 32, d2h_gbps: 32, concurrency: 2 },
  L4: { tflops: 30, mem_gbps: 300, ms_per_token: 0.25, h2d_gbps: 28, d2h_gbps: 28, concurrency: 2 },
  A100: { tflops: 155, mem_gbps: 1555, ms_per_token: 0.1, h2d_gbps: 80, d2h_gbps: 80, concurrency: 4 },
  H100: { tflops: 260, mem_gbps: 3000, ms_per_token: 0.07, h2d_gbps: 100, d2h_gbps: 100, concurrency: 6 },
}

export default function ScenarioPanel({
  scenario,
  setScenario,
  onRun,
  onSave,
  onReset,
  savedList,
  onLoad,
  onDelete,
  toast,
  collapsed,
  setCollapsed,
}) {
  const [wizardOpen, setWizardOpen] = useState(false)
  const [openSections, setOpenSections] = useState({ workload: true, target: true, pipeline: true })
  const [errors, setErrors] = useState('')
  const [infoOpen, setInfoOpen] = useState(null)

  const updateScenario = (path, value) => {
    setScenario((prev) => {
      const next = structuredClone(prev)
      let ref = next
      for (let i = 0; i < path.length - 1; i++) ref = ref[path[i]]
      ref[path[path.length - 1]] = value
      return next
    })
  }

  const applyProfile = (name) => {
    if (name === 'Custom') {
      updateScenario(['target', 'name'], name)
      return
    }
    const profile = gpuProfiles[name]
    if (!profile) return
    setScenario((prev) => ({ ...prev, target: { ...profile, name } }))
  }

  const reset = () => setScenario(defaultScenario)

  const summary = useMemo(() => {
    const computeTokens = scenario.pipeline.filter((p) => p.kind === 'tokens').reduce((s, p) => s + p.value, 0)
    const fixedMs = scenario.pipeline.filter((p) => p.kind === 'fixed_ms').reduce((s, p) => s + p.value, 0)
    const h2dBytes = scenario.pipeline.filter((p) => p.kind === 'bytes' && p.name.toLowerCase().includes('h2d')).reduce((s, p) => s + p.value, 0)
    const d2hBytes = scenario.pipeline.filter((p) => p.kind === 'bytes' && p.name.toLowerCase().includes('d2h')).reduce((s, p) => s + p.value, 0)
    const computeMs = computeTokens * scenario.target.ms_per_token
    const transferMs = h2dBytes / (scenario.target.h2d_gbps * 1e6) + d2hBytes / (scenario.target.d2h_gbps * 1e6)
    return { computeMs, fixedMs, transferMs, totalMs: computeMs + fixedMs + transferMs }
  }, [scenario])

  const run = () => {
    const msg = validate(scenario)
    if (msg) {
      setErrors(msg)
      return
    }
    setErrors('')
    onRun(scenario)
  }

  const setPipeline = (p) => setScenario((prev) => ({ ...prev, pipeline: p }))


  return (
    <div className={`space-y-4 ${collapsed ? 'w-14' : 'w-full'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="text-slate-400" title={collapsed ? 'Expand' : 'Collapse'} onClick={() => setCollapsed((p) => !p)}>
            {collapsed ? '➡' : '⬅'}
          </button>
          {!collapsed && <div className="text-lg font-semibold">Scenario</div>}
        </div>
        {!collapsed && (
          <div className="flex gap-2 text-xs">
            <button className="px-3 py-1 rounded bg-slate-800 border border-slate-700" onClick={() => onReset?.()}>Reset</button>
            <button className="px-3 py-1 rounded bg-slate-800 border border-slate-700" onClick={() => onSave?.(scenario)}>Save</button>
            <select className={`${selectBase} h-9 w-32`} onChange={(e) => onLoad?.(e.target.value)} value="">
              <option value="">Load...</option>
              {savedList.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button className="px-3 py-1 rounded bg-slate-800 border border-slate-700" onClick={() => onDelete?.(prompt('Delete which id?') || '')}>Delete</button>
            <button className="px-3 py-1 rounded bg-slate-800 border border-slate-700" onClick={() => setWizardOpen(true)}>Wizard</button>
          </div>
        )}
      </div>

      {!collapsed && (
        <>
          <button className="w-full h-11 rounded bg-emerald-500 text-slate-950 font-semibold shadow-sm" onClick={run}>Run Simulation</button>
          {errors && <div className="text-red-400 text-sm">{errors}</div>}
          {toast && <div className="text-emerald-400 text-sm">{toast}</div>}

          <Accordion
            title="WORKLOAD"
            open={openSections.workload}
            onToggle={() => setOpenSections((p) => ({ ...p, workload: !p.workload }))}
          >
            <div className="grid grid-cols-2 gap-2">
              <Field label="Scenario Name" help="Label for this experiment."><input className={inputBase} value={scenario.name} onChange={(e) => updateScenario(['name'], e.target.value)} /></Field>
              <Field label="Workload Name" help="Short name of the app/workload you’re modeling."><input className={inputBase} value={scenario.workload.name} onChange={(e) => updateScenario(['workload', 'name'], e.target.value)} /></Field>
              <Field label="RPS" suffix="rps" help="Requests per second arriving to the system. Drives load."><input type="number" className={inputBase} value={scenario.workload.rps} onChange={(e) => updateScenario(['workload', 'rps'], parseFloat(e.target.value))} /></Field>
              <Field label="Duration" suffix="s" help="How long to generate traffic for this run."><input type="number" className={inputBase} value={scenario.workload.duration_s} onChange={(e) => updateScenario(['workload', 'duration_s'], parseFloat(e.target.value))} /></Field>
              <Field label="Batch Size" help="Items processed per request. Affects compute work."><input type="number" className={inputBase} value={scenario.workload.batch_size} onChange={(e) => updateScenario(['workload', 'batch_size'], parseInt(e.target.value, 10))} /></Field>
              <Field label="Concurrency" tooltip="Max in-flight compute slots" help="How many requests can compute on GPU at once."><input type="number" className={inputBase} value={scenario.target.concurrency} onChange={(e) => updateScenario(['target', 'concurrency'], parseInt(e.target.value, 10))} /></Field>
              <Field label="Jitter" suffix="%" help="Arrival randomness. Higher = burstier traffic and more queueing."><input type="number" className={inputBase} value={scenario.workload.jitter_pct} onChange={(e) => updateScenario(['workload', 'jitter_pct'], parseFloat(e.target.value))} /></Field>
            </div>
          </Accordion>

          <Accordion
            title="TARGET GPU"
            open={openSections.target}
            onToggle={() => setOpenSections((p) => ({ ...p, target: !p.target }))}
          >
            <div className="space-y-2.5">
              <Field label="Profile">
                <select className={selectBase} value={scenario.target.name} onChange={(e) => applyProfile(e.target.value)}>
                  <option value="A10G">A10G</option>
                  <option value="L4">L4</option>
                  <option value="A100">A100</option>
                  <option value="H100">H100</option>
                  <option value="Custom">Custom</option>
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                {['tflops', 'mem_gbps', 'h2d_gbps', 'd2h_gbps', 'ms_per_token'].map((k) => (
                  <Field
                    key={k}
                    label={labelFor(k)}
                    tooltip="Click for explanation"
                    infoTitle={labelFor(k)}
                    infoBody={infoBodyFor(k)}
                    infoId={`gpu-${k}`}
                    currentInfoId={infoOpen}
                    setCurrentInfoId={setInfoOpen}
                  >
                    <input
                      className={inputBase}
                      type="number"
                      value={scenario.target[k]}
                      disabled={scenario.target.name !== 'Custom'}
                      onChange={(e) => updateScenario(['target', k], parseFloat(e.target.value))}
                    />
                  </Field>
                ))}
              </div>
            </div>
          </Accordion>

          <Accordion
            title="PIPELINE"
            open={openSections.pipeline}
            onToggle={() => setOpenSections((p) => ({ ...p, pipeline: !p.pipeline }))}
          >
            <PipelineEditor pipeline={scenario.pipeline} setPipeline={setPipeline} />
          </Accordion>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3 space-y-1 text-sm mt-5">
            <div className="text-slate-200 font-semibold">Scenario Summary</div>
            <div className="text-slate-400">Compute est: <span className="text-slate-200">{summary.computeMs.toFixed(2)} ms</span></div>
            <div className="text-slate-400">Transfer est: <span className="text-slate-200">{summary.transferMs.toFixed(2)} ms</span></div>
            <div className="text-slate-400">Fixed ms: <span className="text-slate-200">{summary.fixedMs.toFixed(2)} ms</span></div>
            <div className="text-slate-300">Total est: <span className="text-emerald-200 font-semibold">{summary.totalMs.toFixed(2)} ms</span></div>
          </div>
          {wizardOpen && (
            <ScenarioWizard
              open={wizardOpen}
              onClose={() => setWizardOpen(false)}
              scenario={scenario}
              setScenario={setScenario}
              onRun={onRun}
            />
          )}
        </>
      )}
    </div>
  )
}

function Accordion({ title, open, onToggle, children }) {
  return (
    <div className="border border-slate-800 rounded-lg overflow-visible shadow-sm">
      <button className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-900/80 text-slate-300 text-[11px] tracking-[0.14em] uppercase border-b border-slate-800/80" onClick={onToggle}>
        <span className="font-semibold">{title}</span>
        <span className="text-slate-500">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="p-3 space-y-2.5">{children}</div>}
    </div>
  )
}

function labelFor(key) {
  switch (key) {
    case 'tflops': return 'TFLOPS'
    case 'mem_gbps': return 'Mem BW (GB/s)'
    case 'h2d_gbps': return 'H2D BW (GB/s)'
    case 'd2h_gbps': return 'D2H BW (GB/s)'
    case 'ms_per_token': return 'ms per token'
    default: return key
  }
}

function tooltipFor(key) {
  switch (key) {
    case 'tflops': return 'What does TFLOPS mean?'
    case 'mem_gbps': return 'Memory bandwidth in GB/s'
    case 'h2d_gbps': return 'Host to device bandwidth'
    case 'd2h_gbps': return 'Device to host bandwidth'
    case 'ms_per_token': return 'Cost per token'
    default: return ''
  }
}

function infoBodyFor(key) {
  switch (key) {
    case 'tflops':
      return 'TFLOPS ≈ trillions of floating-point ops per second (peak). Higher means faster math.\nExample: 60 TFLOPS can theoretically do ~60e12 ops/s; a 10 ms compute block could do ~0.6e12 ops.';
    case 'mem_gbps':
      return 'Memory bandwidth is how fast the GPU moves data within its memory. Affects stages dominated by memory reads/writes.\nExample: 600 GB/s means ~600 gigabytes can be streamed each second.';
    case 'h2d_gbps':
      return 'Host → Device bandwidth for uploads (PCIe). Larger inputs take longer on this link.\nExample: 8 MB input on 32 GB/s link ≈ 8MB / (32 GB/s) ≈ 0.25 ms.';
    case 'd2h_gbps':
      return 'Device → Host bandwidth for downloads. Impacts results/outputs you copy back.\nExample: 2 MB output on 32 GB/s ≈ 0.06 ms.';
    case 'ms_per_token':
      return 'Heuristic cost per generated token for LLM-like workloads. tokens × ms/token = compute stage time.\nExample: 128 tokens × 0.2 ms/token = 25.6 ms compute.';
    default:
      return ''
  }
}

function validate(sc) {
  if (!sc.name) return 'Scenario name required'
  if (sc.workload.rps <= 0 || sc.workload.duration_s < 1) return 'RPS >0 and duration >=1'
  if (sc.pipeline.length === 0) return 'Add at least one stage'
  for (const st of sc.pipeline) {
    if (!st.name) return 'Stage needs a name'
    if (st.value <= 0) return 'Stage values must be positive'
  }
  return ''
}
