import ResultCards from './ResultCards'
import DiagnosisCard from './DiagnosisCard'

export default function RunResults({ run, loading, error, onOpenTimeline, diagnostics }) {
  if (error) return <div className="text-red-400">{error}</div>
  if (loading) return <div className="text-slate-300">Running simulation…</div>
  return (
    <div className="space-y-3">
      <DiagnosisCard diagnostics={diagnostics} />
      <ResultCards summary={run?.summary} runId={run?.id} trace={run?.trace} onOpenTimeline={onOpenTimeline} />
    </div>
  )
}
