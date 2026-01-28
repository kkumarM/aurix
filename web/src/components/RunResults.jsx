import ResultCards from './ResultCards'

export default function RunResults({ run, loading, error, onOpenTimeline }) {
  if (error) return <div className="text-red-400">{error}</div>
  if (loading) return <div className="text-slate-300">Running simulation…</div>
  return (
    <div className="space-y-3">
      <ResultCards summary={run?.summary} runId={run?.id} trace={run?.trace} onOpenTimeline={onOpenTimeline} />
    </div>
  )
}
