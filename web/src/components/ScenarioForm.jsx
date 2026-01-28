import { useState } from 'react'

const defaultScenario = {
  name: 'Demo Scenario',
  workload: { name: 'demo', rps: 2, duration_s: 10, batch_size: 1, jitter_pct: 5 },
  target: {
    name: 'A10G',
    tflops: 60,
    mem_gbps: 600,
    ms_per_token: 0.2,
    h2d_gbps: 32,
    d2h_gbps: 32,
    concurrency: 2
  },
  pipeline: [
    { name: 'preprocess', kind: 'fixed_ms', value: 2 },
    { name: 'h2d', kind: 'bytes', value: 8 * 1024 * 1024 },
    { name: 'compute', kind: 'tokens', value: 128 },
    { name: 'd2h', kind: 'bytes', value: 2 * 1024 * 1024 },
    { name: 'postprocess', kind: 'fixed_ms', value: 1 }
  ]
}

export default function ScenarioForm({ onRun, loading }) {
  const [scenario, setScenario] = useState(defaultScenario)
  const [showModal, setShowModal] = useState(false)
  const [newStage, setNewStage] = useState({ name: '', kind: 'fixed_ms', value: 1 })
  const [error, setError] = useState('')

  const updateField = (path, value) => {
    setScenario((prev) => {
      const next = structuredClone(prev)
      let ref = next
      for (let i = 0; i < path.length - 1; i++) ref = ref[path[i]]
      ref[path[path.length - 1]] = value
      return next
    })
  }

  const updatePipeline = (idx, key, val) => {
    setScenario((prev) => {
      const next = structuredClone(prev)
      next.pipeline[idx][key] = val
      return next
    })
  }

  const addStage = () => {
    setNewStage({ name: '', kind: 'fixed_ms', value: 1 })
    setShowModal(true)
  }

  const onSubmit = (e) => {
    e.preventDefault()
    const msg = validate(scenario)
    if (msg) {
      setError(msg)
      return
    }
    setError('')
    onRun(scenario)
  }

  const applyNewStage = () => {
    if (!newStage.name || newStage.value <= 0) {
      setError('Stage needs a name and positive value')
      return
    }
    setScenario((prev) => ({ ...prev, pipeline: [...prev.pipeline, newStage] }))
    setShowModal(false)
    setError('')
  }

  const handlePreset = (name) => {
    if (!name || !presets[name]) return
    const preset = presets[name]
    setScenario(prev => ({ ...prev, pipeline: preset.pipeline }))
  }

  const moveStage = (idx, dir) => {
    setScenario(prev => {
      const next = structuredClone(prev)
      const target = idx + dir
      if (target < 0 || target >= next.pipeline.length) return prev
      const tmp = next.pipeline[idx]
      next.pipeline[idx] = next.pipeline[target]
      next.pipeline[target] = tmp
      return next
    })
  }

  const removeStage = (idx) => {
    setScenario(prev => ({ ...prev, pipeline: prev.pipeline.filter((_, i) => i !== idx) }))
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Scenario Builder</h2>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded bg-emerald-500 text-slate-950 font-semibold disabled:opacity-50"
        >
          {loading ? 'Running…' : 'Run Simulation'}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Scenario Name">
          <input className="input" value={scenario.name} onChange={(e) => updateField(['name'], e.target.value)} />
        </Field>
        <Field label="Workload Name">
          <input className="input" value={scenario.workload.name} onChange={(e) => updateField(['workload', 'name'], e.target.value)} />
        </Field>
        <Field label="RPS">
          <input type="number" className="input" value={scenario.workload.rps}
            onChange={(e) => updateField(['workload', 'rps'], parseFloat(e.target.value))} />
        </Field>
        <Field label="Duration (s)">
          <input type="number" className="input" value={scenario.workload.duration_s}
            onChange={(e) => updateField(['workload', 'duration_s'], parseFloat(e.target.value))} />
        </Field>
        <Field label="Batch Size">
          <input type="number" className="input" value={scenario.workload.batch_size}
            onChange={(e) => updateField(['workload', 'batch_size'], parseInt(e.target.value, 10))} />
        </Field>
        <Field label="Jitter %">
          <input type="number" className="input" value={scenario.workload.jitter_pct}
            onChange={(e) => updateField(['workload', 'jitter_pct'], parseFloat(e.target.value))} />
        </Field>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Field label="GPU Profile">
          <input className="input" value={scenario.target.name} onChange={(e) => updateField(['target', 'name'], e.target.value)} />
        </Field>
        <Field label="TFLOPS">
          <input type="number" className="input" value={scenario.target.tflops} onChange={(e) => updateField(['target', 'tflops'], parseFloat(e.target.value))} />
        </Field>
        <Field label="Mem BW (GB/s)">
          <input type="number" className="input" value={scenario.target.mem_gbps} onChange={(e) => updateField(['target', 'mem_gbps'], parseFloat(e.target.value))} />
        </Field>
        <Field label="H2D BW (GB/s)">
          <input type="number" className="input" value={scenario.target.h2d_gbps} onChange={(e) => updateField(['target', 'h2d_gbps'], parseFloat(e.target.value))} />
        </Field>
        <Field label="D2H BW (GB/s)">
          <input type="number" className="input" value={scenario.target.d2h_gbps} onChange={(e) => updateField(['target', 'd2h_gbps'], parseFloat(e.target.value))} />
        </Field>
        <Field label="Concurrency">
          <input type="number" className="input" value={scenario.target.concurrency} onChange={(e) => updateField(['target', 'concurrency'], parseInt(e.target.value, 10))} />
        </Field>
        <Field label="ms per token">
          <input type="number" className="input" value={scenario.target.ms_per_token} onChange={(e) => updateField(['target', 'ms_per_token'], parseFloat(e.target.value))} />
        </Field>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Pipeline</h3>
          <div className="flex items-center gap-2 text-sm">
            <select className="input w-40" onChange={(e) => handlePreset(e.target.value)}>
              <option value="">Presets…</option>
              <option value="llm">LLM inference</option>
              <option value="etl">ETL pipeline</option>
              <option value="image">Image model inference</option>
            </select>
            <button type="button" onClick={addStage} className="text-sm text-emerald-400">+ Add stage</button>
          </div>
        </div>
        <div className="space-y-2">
          {scenario.pipeline.map((st, idx) => (
            <div key={idx} className="grid md:grid-cols-3 gap-2 bg-slate-800/60 border border-slate-700 rounded p-2">
              <input className="input" value={st.name} onChange={(e) => updatePipeline(idx, 'name', e.target.value)} />
              <select className="input" value={st.kind} onChange={(e) => updatePipeline(idx, 'kind', e.target.value)}>
                <option value="fixed_ms">fixed_ms</option>
                <option value="bytes">bytes</option>
                <option value="tokens">tokens</option>
              </select>
              <input type="number" className="input" value={st.value}
                onChange={(e) => updatePipeline(idx, 'value', parseFloat(e.target.value))}
              />
              <div className="flex gap-2 text-xs text-slate-300">
                <button type="button" onClick={() => moveStage(idx, -1)} className="px-2 py-1 bg-slate-700 rounded">↑</button>
                <button type="button" onClick={() => moveStage(idx, 1)} className="px-2 py-1 bg-slate-700 rounded">↓</button>
                <button type="button" onClick={() => removeStage(idx)} className="px-2 py-1 bg-red-600 rounded">✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <div className="text-red-400 text-sm">{error}</div>}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-10">
          <div className="bg-slate-900 border border-slate-700 rounded p-4 space-y-3 w-80">
            <div className="text-lg font-semibold">Add Stage</div>
            <input className="input" placeholder="Name" value={newStage.name} onChange={e => setNewStage({ ...newStage, name: e.target.value })} />
            <select className="input" value={newStage.kind} onChange={e => setNewStage({ ...newStage, kind: e.target.value })}>
              <option value="fixed_ms">fixed_ms</option>
              <option value="bytes">bytes</option>
              <option value="tokens">tokens</option>
            </select>
            <input className="input" type="number" value={newStage.value} onChange={e => setNewStage({ ...newStage, value: parseFloat(e.target.value) })} />
            <div className="flex justify-end gap-2">
              <button type="button" className="px-3 py-1 bg-slate-700 rounded" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="button" className="px-3 py-1 bg-emerald-500 text-slate-950 rounded" onClick={applyNewStage}>Add</button>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}

function Field({ label, children }) {
  return (
    <label className="text-sm space-y-1">
      <div className="text-slate-300">{label}</div>
      {children}
    </label>
  )
}

// Tailwind input class helper
const style = document.createElement('style')
style.innerHTML = `.input{width:100%;background:rgba(255,255,255,0.04);border:1px solid #1f2937;border-radius:0.5rem;padding:0.5rem;color:#e5e7eb}`
document.head.appendChild(style)

const presets = {
  llm: {
    pipeline: [
      { name: 'preprocess', kind: 'fixed_ms', value: 2 },
      { name: 'h2d', kind: 'bytes', value: 16 * 1024 * 1024 },
      { name: 'compute', kind: 'tokens', value: 256 },
      { name: 'd2h', kind: 'bytes', value: 4 * 1024 * 1024 },
      { name: 'postprocess', kind: 'fixed_ms', value: 1 },
    ],
  },
  etl: {
    pipeline: [
      { name: 'extract', kind: 'bytes', value: 64 * 1024 * 1024 },
      { name: 'transform', kind: 'fixed_ms', value: 10 },
      { name: 'load', kind: 'bytes', value: 32 * 1024 * 1024 },
    ],
  },
  image: {
    pipeline: [
      { name: 'decode', kind: 'fixed_ms', value: 3 },
      { name: 'h2d', kind: 'bytes', value: 12 * 1024 * 1024 },
      { name: 'compute', kind: 'tokens', value: 64 },
      { name: 'd2h', kind: 'bytes', value: 3 * 1024 * 1024 },
    ],
  },
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
