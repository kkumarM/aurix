import React from 'react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'

type Recommendation = {
  title: string
  description: string
  expected_impact: string
  risk: string
}

type Props = {
  run: any
  scenario: any
  advisor: any
  goal: string
  loading: boolean
  error: string
  onGoalChange: (goal: string) => void
  onRetry: () => void
  onRunSweep: () => void
  onCompareGpu: () => void
  onOpenTimeline: () => void
}

const goals = ['latency', 'throughput', 'balanced', 'cost']

export default function AgentDiagnosisPanel({ run, scenario, advisor, goal, loading, error, onGoalChange, onRetry, onRunSweep, onCompareGpu, onOpenTimeline }: Props) {
  const empty = !run || !run.summary

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold text-slate-100">gPARX Advisor</div>
          <div className="text-sm text-slate-400">AI-ready performance diagnosis powered by deterministic rules.</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Goal</span>
          <select value={goal} onChange={(e) => onGoalChange(e.target.value)} className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400">
            {goals.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>

      {empty && (
        <Card className="p-5 text-slate-300">
          <div className="text-lg font-semibold text-slate-100">Advisor ready when you have a run</div>
          <div className="mt-2 text-sm">
            Run a simulation, estimate an LLM workload, or load a benchmark to generate an advisor diagnosis.
          </div>
        </Card>
      )}

      {error && (
        <Card className="p-5 border border-red-500/20 bg-red-500/5 text-red-100">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold">Advisor error</div>
              <div className="text-sm text-red-200">{error}</div>
            </div>
            <button className="rounded-md border border-red-500 bg-red-500/10 px-3 py-2 text-sm text-red-100" onClick={onRetry}>Retry</button>
          </div>
        </Card>
      )}

      {loading && !empty && (
        <Card className="p-5 text-slate-300">
          <div className="text-sm">Loading advisor diagnosis...</div>
        </Card>
      )}

      {advisor && !empty && !loading && (
        <div className="grid gap-4 xl:grid-cols-[1.5fr,1fr]">
          <Card className="p-5 space-y-4 border-emerald-500/20 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]">
            <div className="flex flex-wrap items-start gap-3">
              <div>
                <div className="text-lg font-semibold text-slate-100">Diagnosis summary</div>
                <div className="text-sm text-slate-400">Primary bottleneck and confidence at a glance.</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={advisor.severity === 'high' ? 'danger' : advisor.severity === 'medium' ? 'warning' : 'success'}>{advisor.severity}</Badge>
                <Badge tone={advisor.confidence === 'low' ? 'danger' : advisor.confidence === 'medium' ? 'warning' : 'success'}>{advisor.confidence}</Badge>
                <Badge tone="neutral">{advisor.source}</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-slate-200 text-xl font-semibold">{advisor.primary_bottleneck}</div>
              <div className="text-sm leading-relaxed text-slate-300">{advisor.summary}</div>
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <div className="text-lg font-semibold text-slate-100">Evidence</div>
            <ul className="space-y-2 text-sm text-slate-300">
              {advisor.evidence.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-emerald-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5 space-y-4 xl:col-span-2">
            <div className="text-lg font-semibold text-slate-100">Recommended actions</div>
            <div className="grid gap-3 lg:grid-cols-2">
              {advisor.recommendations.map((rec: Recommendation) => (
                <div key={rec.title} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="text-sm font-semibold text-slate-100">{rec.title}</div>
                  <div className="mt-2 text-sm text-slate-300">{rec.description}</div>
                  <div className="mt-3 text-[11px] uppercase tracking-[0.12em] text-slate-500">Expected impact</div>
                  <div className="text-sm text-slate-300">{rec.expected_impact}</div>
                  <div className="mt-2 text-[11px] uppercase tracking-[0.12em] text-slate-500">Risk</div>
                  <div className="text-sm text-slate-300">{rec.risk}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <div className="text-lg font-semibold text-slate-100">Next benchmark experiments</div>
            <ul className="space-y-2 text-sm text-slate-300">
              {advisor.next_experiments.map((experiment) => (
                <li key={experiment} className="flex items-start gap-2">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-emerald-400" />
                  <span>{experiment}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950" onClick={onRunSweep}>Run sweep</button>
              <button className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200" onClick={onCompareGpu}>Compare GPU</button>
              <button className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200" onClick={onOpenTimeline}>Open timeline</button>
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <div className="text-lg font-semibold text-slate-100">Production readiness notes</div>
            <ul className="space-y-2 text-sm text-slate-300">
              {advisor.production_notes.length > 0 ? advisor.production_notes.map((note) => (
                <li key={note} className="flex items-start gap-2">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-emerald-400" />
                  <span>{note}</span>
                </li>
              )) : (
                <li className="text-slate-500">No strong production warnings were detected from the available data.</li>
              )}
            </ul>
          </Card>

          <Card className="p-5 space-y-3 bg-slate-900/80 border-slate-800">
            <div className="text-lg font-semibold text-slate-100">Ask gPARX — coming later</div>
            <div className="text-sm text-slate-300">Future versions will use an optional LLM layer to answer questions over runs, traces, and reports while building on the current deterministic advisor rules.</div>
            <button className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200" disabled>Ask gPARX</button>
          </Card>
        </div>
      )}
    </div>
  )
}
