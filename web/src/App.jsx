import { useEffect, useState } from 'react'
import ScenarioForm from './components/ScenarioForm'
import RunResults from './components/RunResults'

const API = '' // proxied to 8080 via Vite config

export default function App() {
  const [scenario, setScenario] = useState(null)
  const [run, setRun] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      // synchronous run, so use summary directly
      setRun({ id: data.run_id, summary: data.summary, trace: data.artifacts?.trace })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">GPU Workload Simulator</h1>
          <p className="text-slate-400 text-sm">Build a scenario, run the model, download the trace.</p>
        </div>
        <div className="text-xs text-slate-500">Backend: http://localhost:8080</div>
      </header>
      <main className="p-6 grid gap-6 lg:grid-cols-2">
        <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow">
          <ScenarioForm onRun={handleRun} loading={loading} />
        </section>
        <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow">
          <RunResults scenario={scenario} run={run} loading={loading} error={error} />
        </section>
      </main>
    </div>
  )
}
