import React, { useState } from 'react'
import Card from './ui/Card'
import Button from './ui/Button'
import Badge from './ui/Badge'

export default function RealTraceWorkspace({ backendUrl }) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [traceId, setTraceId] = useState('')
  const [metrics, setMetrics] = useState(null)

  const upload = async () => {
    if (!file || uploading) return
    setUploading(true)
    setError('')
    setTraceId('')
    setMetrics(null)

    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${backendUrl}/v1/realtraces`, {
        method: 'POST',
        body: form,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      const id = data.real_trace_id
      setTraceId(id)

      const metricsRes = await fetch(`${backendUrl}/v1/realtraces/${id}/metrics`)
      if (metricsRes.ok) {
        const json = await metricsRes.json()
        setMetrics(json)
      }
    } catch (err) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <Card className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-[0.18em] text-emerald-300">Real Trace Analysis</div>
            <div className="text-3xl font-semibold text-slate-100">Analyze a real trace</div>
            <div className="max-w-3xl text-sm text-slate-300">
              Upload an Nsight Systems SQLite export to ingest kernel and memcpy activity, inspect parsed metrics, and compare real behavior with modeled behavior in the rest of GPARX.
            </div>
          </div>
          <Badge tone="neutral">Nsight Systems</Badge>
        </div>

        <div className="grid lg:grid-cols-[1.1fr,0.9fr] gap-4">
          <Card className="p-4 space-y-3 bg-slate-950/40">
            <div className="text-slate-100 font-semibold">Upload trace</div>
            <div className="text-sm text-slate-400">
              Recommended input: `nsys export --type sqlite report.nsys-rep`
            </div>
            <label className="block text-sm text-slate-300 space-y-2">
              <span>SQLite trace file</span>
              <input
                type="file"
                accept=".sqlite,.db,.nsys-rep"
                className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-md file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-slate-100"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
            <div className="flex gap-2">
              <Button onClick={upload} disabled={!file || uploading}>
                {uploading ? 'Uploading…' : 'Upload Nsight trace'}
              </Button>
            </div>
            {error && <div className="text-sm text-red-400">{error}</div>}
            {traceId && (
              <div className="text-sm text-emerald-200">
                Trace ingested as <span className="font-semibold">{traceId}</span>.
              </div>
            )}
          </Card>

          <Card className="p-4 space-y-3 bg-slate-950/40">
            <div className="text-slate-100 font-semibold">What this gives you today</div>
            <ol className="list-decimal list-inside text-sm text-slate-300 space-y-1">
              <li>Parsed kernel and memcpy timing from an Nsight Systems SQLite export.</li>
              <li>Artifact links for trace JSON and metrics JSON.</li>
              <li>A real trace reference point before you return to simulation, compare, or sweeps.</li>
            </ol>
          </Card>
        </div>

        {traceId && (
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-4 space-y-3 bg-slate-950/40">
              <div className="text-slate-100 font-semibold">Artifacts</div>
              <div className="space-y-2 text-sm">
                <a className="text-emerald-300 underline" href={`${backendUrl}/v1/realtraces/${traceId}/trace`} target="_blank" rel="noreferrer">Open parsed trace JSON</a>
                <a className="block text-emerald-300 underline" href={`${backendUrl}/v1/realtraces/${traceId}/metrics`} target="_blank" rel="noreferrer">Open parsed metrics JSON</a>
              </div>
            </Card>

            <Card className="p-4 space-y-3 bg-slate-950/40">
              <div className="text-slate-100 font-semibold">Parsed metrics</div>
              {!metrics && <div className="text-sm text-slate-500">Metrics are available for SQLite uploads that parsed successfully.</div>}
              {metrics && (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Metric label="Wall time (ms)" value={metrics.wall_time_ms} />
                  <Metric label="Kernel time (ms)" value={metrics.kernel_time_ms} />
                  <Metric label="Memcpy time (ms)" value={metrics.memcpy_time_ms} />
                  <Metric label="Kernel count" value={metrics.kernel_count} digits={0} />
                  <Metric label="Memcpy count" value={metrics.memcpy_count} digits={0} />
                  <Metric label="Overlap estimate" value={metrics.overlap_estimate} digits={2} />
                </div>
              )}
            </Card>
          </div>
        )}
      </Card>
    </div>
  )
}

function Metric({ label, value, digits = 2 }) {
  const display = value === undefined || value === null || Number.isNaN(Number(value))
    ? '—'
    : Number(value).toFixed(digits)
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className="text-lg font-semibold text-slate-100">{display}</div>
    </div>
  )
}
