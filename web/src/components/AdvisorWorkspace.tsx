import React from 'react'
import Card from './ui/Card'
import Badge from './ui/Badge'
import ExperimentPlanPanel from './advisor/ExperimentPlanPanel'
import { calculateProductionReadiness } from '../utils/productionReadiness'

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
  onOpenPlanner: () => void
  onOpenExpert: () => void
  onOpenSweeps: () => void
  onExperimentAction: (step: any) => void
}

const goals = ['latency', 'throughput', 'balanced', 'cost']

function formatTimestamp(date: Date | null): string {
  if (!date) return '—'
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function AdvisorWorkspace({ run, scenario, advisor, goal, loading, error, onGoalChange, onRetry, onRunSweep, onOpenPlanner, onOpenExpert, onOpenSweeps }: Props) {
  const empty = !run || !run.summary
  const lastUpdated = run ? new Date() : null
  const readiness = calculateProductionReadiness({ advisor, run, scenario, goal })

  return (
    <div className="space-y-4">
      {/* Status Card */}
      {empty ? (
        <Card className="p-6 space-y-4 border-slate-800">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xl font-semibold text-slate-100">gPARX Advisor Workspace</div>
              <div className="text-sm text-slate-400 mt-1">Run an LLM estimate, simulation, sweep, or benchmark to activate gPARX Advisor.</div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <button 
              className="px-4 py-2 rounded-md bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 transition"
              onClick={onOpenPlanner}
            >
              Open LLM Planner
            </button>
            <button 
              className="px-4 py-2 rounded-md border border-slate-700 text-slate-200 hover:border-slate-600 transition"
              onClick={onOpenExpert}
            >
              Open Expert Simulation
            </button>
            <button 
              className="px-4 py-2 rounded-md border border-slate-700 text-slate-200 hover:border-slate-600 transition"
              onClick={onOpenSweeps}
            >
              Open Sweeps
            </button>
          </div>
        </Card>
      ) : (
        <Card className="p-6 space-y-4 border-emerald-500/20 shadow-[0_0_0_1px_rgba(16,185,129,0.08)] bg-gradient-to-r from-slate-900 to-slate-900/50">
          <div className="grid gap-4 lg:grid-cols-6">
            <div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Latest run</div>
              <div className="text-lg font-semibold text-slate-100 mt-1 truncate">{run?.id?.slice(0, 8) || '—'}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Source</div>
              <div className="text-lg font-semibold text-slate-100 mt-1">{advisor?.source || '—'}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Goal</div>
              <select 
                value={goal} 
                onChange={(e) => onGoalChange(e.target.value)}
                className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100 outline-none focus:border-emerald-400 mt-1"
              >
                {goals.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Confidence</div>
              <div className="mt-1">
                <Badge tone={advisor?.confidence === 'low' ? 'danger' : advisor?.confidence === 'medium' ? 'warning' : 'success'}>
                  {advisor?.confidence || '—'}
                </Badge>
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Severity</div>
              <div className="mt-1">
                <Badge tone={advisor?.severity === 'high' ? 'danger' : advisor?.severity === 'medium' ? 'warning' : 'success'}>
                  {advisor?.severity || '—'}
                </Badge>
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Last updated</div>
              <div className="text-sm text-slate-300 mt-1">{formatTimestamp(lastUpdated)}</div>
            </div>
          </div>
        </Card>
      )}

      {!empty && (
        <Card className="p-5 border-slate-800 bg-slate-950/80">
          <div className="grid gap-4 lg:grid-cols-4 items-center">
            <div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Production readiness</div>
              <div className="text-4xl font-bold text-emerald-300 mt-2">{readiness.score}</div>
            </div>
            <div className="lg:col-span-2">
              <div className="text-lg font-semibold text-slate-100">{readiness.summary}</div>
              <div className="text-sm text-slate-400 mt-1">{readiness.level === 'high' ? 'High confidence for production planning.' : readiness.level === 'medium' ? 'Some gaps remain in the current run data.' : 'Requires more trace validation before production.'}</div>
            </div>
            <div className="text-right">
              <Badge tone={readiness.level === 'high' ? 'success' : readiness.level === 'medium' ? 'warning' : 'danger'}>
                {readiness.level.toUpperCase()}
              </Badge>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mt-4 text-sm text-slate-300">
            <div>
              <div className="font-semibold text-slate-100">Passed checks</div>
              <ul className="space-y-1 mt-2">
                {readiness.passed_checks.slice(0, 3).map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-semibold text-slate-100">Warnings</div>
              <ul className="space-y-1 mt-2 text-amber-300">
                {readiness.warnings.slice(0, 3).map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-semibold text-slate-100">Failed checks</div>
              <ul className="space-y-1 mt-2 text-red-300">
                {readiness.failed_checks.slice(0, 3).map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
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
            <button className="rounded-md border border-red-500 bg-red-500/10 px-3 py-2 text-sm text-red-100 hover:bg-red-500/20" onClick={onRetry}>Retry</button>
          </div>
        </Card>
      )}

      {loading && !empty && (
        <Card className="p-5 text-slate-300">
          <div className="text-sm">Loading advisor diagnosis...</div>
        </Card>
      )}

      {advisor && !empty && !loading && (
        <div className="space-y-4">
          {/* Main grid: Left diagnosis + Right next actions */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Left: Latest Diagnosis */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="p-5 space-y-4 border-emerald-500/20 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]">
                <div>
                  <div className="text-lg font-semibold text-slate-100">Latest Diagnosis</div>
                  <div className="text-sm text-slate-400">Primary bottleneck and supporting evidence.</div>
                </div>

                <div className="space-y-2">
                  <div className="text-2xl font-bold text-emerald-300">{advisor.primary_bottleneck}</div>
                  <div className="text-sm leading-relaxed text-slate-300">{advisor.summary}</div>
                </div>

                {advisor.secondary_bottlenecks && advisor.secondary_bottlenecks.length > 0 && (
                  <div className="pt-3 border-t border-slate-800">
                    <div className="text-sm font-semibold text-slate-300">Secondary concerns:</div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {advisor.secondary_bottlenecks.map((name) => (
                        <Badge key={name} tone="neutral">{name}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              <Card className="p-5 space-y-3">
                <div className="text-lg font-semibold text-slate-100">Evidence</div>
                <ul className="space-y-2 text-sm text-slate-300">
                  {advisor.evidence.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* Right: Suggested Next Actions */}
            <div className="space-y-4">
              <Card className="p-5 space-y-4 bg-slate-900/50 border-slate-800">
                <div className="text-lg font-semibold text-slate-100">Suggested Next Actions</div>
                {advisor.recommendations && advisor.recommendations.length > 0 ? (
                  <div className="space-y-3">
                    {advisor.recommendations.slice(0, 3).map((rec: Recommendation) => (
                      <div key={rec.title} className="rounded-lg border border-slate-700 bg-slate-950/70 p-3">
                        <div className="text-sm font-semibold text-slate-100">{rec.title}</div>
                        <div className="mt-2 text-xs text-slate-400">{rec.description}</div>
                        <div className="mt-2 text-[10px] uppercase tracking-[0.1em] text-emerald-400">Impact: {rec.expected_impact}</div>
                      </div>
                    ))}
                    {advisor.recommendations.length > 3 && (
                      <div className="text-xs text-slate-500 italic">+ {advisor.recommendations.length - 3} more actions</div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">No specific actions recommended.</div>
                )}
              </Card>

              <Card className="p-5 space-y-3 bg-slate-900/50 border-slate-800">
                <div className="text-lg font-semibold text-slate-100">Production Notes</div>
                {advisor.production_notes && advisor.production_notes.length > 0 ? (
                  <ul className="space-y-2 text-sm text-slate-300">
                    {advisor.production_notes.map((note) => (
                      <li key={note} className="flex items-start gap-2">
                        <span className="mt-1.5 h-2 w-2 rounded-full bg-amber-400 flex-shrink-0" />
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-slate-500">No production warnings detected.</div>
                )}
              </Card>
            </div>
          </div>

          {/* Bottom: Experiment Plan */}
          <ExperimentPlanPanel advisor={advisor} scenario={scenario} run={run} onAction={onExperimentAction} />

          {/* Ask gPARX Placeholder */}
          <Card className="p-5 space-y-3 bg-gradient-to-r from-slate-900/50 to-slate-900/30 border-slate-800">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-slate-100">Ask gPARX — coming in Phase B</div>
                <div className="text-sm text-slate-400 mt-2">Future versions will use an optional LLM layer to answer questions over runs, traces, and reports while building on the current deterministic advisor rules.</div>
              </div>
            </div>
            <button className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-600 transition opacity-60 cursor-not-allowed" disabled>
              Ask a question
            </button>
          </Card>

          {/* Missing Data Warning */}
          {advisor.missing_data && advisor.missing_data.length > 0 && (
            <Card className="p-4 space-y-2 border-amber-500/20 bg-amber-500/5 text-amber-100">
              <div className="font-semibold">⚠️ Missing Data</div>
              <ul className="text-sm space-y-1">
                {advisor.missing_data.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
              <div className="text-xs text-amber-200 mt-2">These missing metrics may impact diagnosis confidence. Consider running more detailed benchmarks or profiles.</div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
