import { useEffect, useState } from 'react'
import ScenarioForm from './components/ScenarioForm'
import RunResults from './components/RunResults'
import RunHistory from './components/RunHistory'

const API = '' // proxied to 8080 via Vite config

export default function App() {
  const [scenario, setScenario] = useState(null)
  const [run, setRun] = useState(null)
  const [runs, setRuns] = useState(() => {
    const saved = localStorage.getItem('sim_runs')
    return saved ? JSON.parse(saved) : []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [compareIds, setCompareIds] = useState([])

  useEffect(() => {
    localStorage.setItem('sim_runs', JSON.stringify(runs.slice(-10)))
  }, [runs])

  const handleRun = async (sc) => {
    setError('')
    setLoading(true)
    setRun(null)
    setScenario(sc)
    try {
      const res = await fetch(`${API}/v1/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: sc })
      })
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}))
        throw new Error(msg.error || 'Failed to start run')
      }
      const data = await res.json()
      const runId = data.run_id
      const summary = data.summary
      // fetch breakdown
      const bdRes = await fetch(`${API}/v1/runs/${runId}/breakdown`)
      const breakdown = bdRes.ok ? await bdRes.json() : null
      const tracePath = data.artifacts?.trace
      const newRun = { id: runId, summary, trace: tracePath, breakdown, scenario: sc }
      setRun(newRun)
      setRuns((prev) => [...prev.slice(-9), newRun])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCompare = (aId, bId) => {
    setCompareIds((prev) => [aId ?? prev[0], bId ?? prev[1]])
  }

  const runA = runs.find(r => r.id === compareIds[0])
  const runB = runs.find(r => r.id === compareIds[1])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">GPU Workload Simulator</h1>
          <p className="text-slate-400 text-sm">Interactive timeline, playback, and run comparisons.</p>
        </div>
        <div className="text-xs text-slate-500">Backend: http://localhost:8080</div>
      </header>
      <main className="p-6 space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow">
            <ScenarioForm onRun={handleRun} loading={loading} />
          </section>
          <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow">
            <RunResults scenario={scenario} run={run} loading={loading} error={error} compareA={runA} compareB={runB} />
          </section>
        </div>
        <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow">
          <RunHistory runs={runs} onSelectCompare={handleCompare} />
        </section>
      </main>
    </div>
  )
}
