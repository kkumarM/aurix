import React from 'react'
import Card from './ui/Card'
import Badge from './ui/Badge'

const color = {
  'GPU-bound': 'bg-emerald-500/15 text-emerald-200 border-emerald-500/50',
  'Transfer-bound': 'bg-violet-500/15 text-violet-200 border-violet-500/50',
  'CPU-bound': 'bg-sky-500/15 text-sky-200 border-sky-500/50',
  'Queue-bound': 'bg-amber-500/20 text-amber-100 border-amber-500/60',
  Balanced: 'bg-slate-800 text-slate-200 border-slate-700',
}

export default function DiagnosisCard({ diagnostics }) {
  if (!diagnostics) return null
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-slate-200 font-semibold">Diagnosis</div>
        <div className={`px-3 py-1 rounded-full text-xs border ${color[diagnostics.primary]}`}>{diagnostics.primary}</div>
      </div>
      <ul className="text-sm text-slate-300 space-y-1">
        {diagnostics.evidence.slice(0, 4).map((e, i) => (
          <li key={i}>• {e}</li>
        ))}
      </ul>
    </Card>
  )
}
