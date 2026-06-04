import React from 'react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { buildExperimentPlanFromDiagnosis } from '../../utils/experimentPlan'
import { ExperimentPlan, ExperimentStep } from '../../types/experimentPlan'

type Props = {
  advisor: any
  scenario: any
  run: any
  onAction: (step: ExperimentStep) => void
}

const kindLabel: Record<string, string> = {
  rps_sweep: 'RPS Sweep',
  concurrency_sweep: 'Concurrency Sweep',
  gpu_compare: 'GPU Compare',
  batch_size_sweep: 'Batch Size Sweep',
  precision_compare: 'Precision Compare',
  dynamic_batching_test: 'Dynamic Batching Test',
  trace_calibration: 'Trace Calibration',
  manual_followup: 'Manual Follow-up',
}

const kindTone: Record<string, string> = {
  rps_sweep: 'neutral',
  concurrency_sweep: 'neutral',
  gpu_compare: 'warning',
  batch_size_sweep: 'warning',
  precision_compare: 'warning',
  dynamic_batching_test: 'success',
  trace_calibration: 'primary',
  manual_followup: 'danger',
}

const statusLabel: Record<string, string> = {
  suggested: 'Suggested',
  ready: 'Ready',
  running: 'Running',
  completed: 'Completed',
  skipped: 'Skipped',
}

const actionLabel: Record<string, string> = {
  rps_sweep: 'Prepare Sweep',
  concurrency_sweep: 'Prepare Sweep',
  batch_size_sweep: 'Prepare Sweep',
  dynamic_batching_test: 'Prepare Sweep',
  gpu_compare: 'Prepare Compare',
  precision_compare: 'Prepare Compare',
  trace_calibration: 'Open Timeline',
  manual_followup: 'Mark Skipped',
}

const statusTone: Record<string, string> = {
  suggested: 'warning',
  ready: 'success',
  running: 'warning',
  completed: 'success',
  skipped: 'danger',
}

function renderParameters(step: ExperimentStep) {
  if (!step.parameters || step.parameters.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Parameters</div>
      <div className="grid gap-2 sm:grid-cols-2">
        {step.parameters.map((param) => (
          <div key={param.name} className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
            <div className="text-sm font-semibold text-slate-100">{param.name}</div>
            <div className="mt-1 text-xs text-slate-400">{param.description || 'Parameter details'}</div>
            <div className="mt-2 text-sm text-slate-300">{param.values.join(', ')}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ExperimentPlanPanel({ advisor, scenario, run, onAction }: Props) {
  if (!advisor || !advisor.primary_bottleneck) {
    return (
      <Card className="p-5 border border-slate-800 bg-slate-900/80">
        <div className="text-lg font-semibold text-slate-100">Recommended Experiment Plan</div>
        <div className="mt-2 text-sm text-slate-400">gPARX recommends these next experiments based on the latest diagnosis.</div>
        <div className="mt-4 text-sm text-slate-500">Advisor needs a diagnosis before it can propose experiments.</div>
      </Card>
    )
  }

  const plan: ExperimentPlan = buildExperimentPlanFromDiagnosis(advisor, scenario, run)

  return (
    <Card className="p-5 border border-slate-800 bg-slate-900/80">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-slate-100">Recommended Experiment Plan</div>
          <div className="mt-2 text-sm text-slate-400">gPARX recommends these next experiments based on the latest diagnosis.</div>
        </div>
        <Badge tone="success">{plan.steps.length} steps</Badge>
      </div>

      <div className="mt-5 space-y-4">
        {plan.steps.map((step) => (
          <Card key={step.id} className="p-4 border border-slate-800 bg-slate-950/80">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-base font-semibold text-slate-100">{step.title}</div>
                <div className="mt-1 text-sm text-slate-400">{kindLabel[step.kind] || step.kind}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={kindTone[step.kind] || 'neutral'}>{kindLabel[step.kind] || step.kind}</Badge>
                <Badge tone={statusTone[step.status] || 'neutral'}>{statusLabel[step.status] || step.status}</Badge>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Reason</div>
                <div className="mt-2 text-sm text-slate-300">{step.reason}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Expected learning</div>
                <div className="mt-2 text-sm text-slate-300">{step.expectedLearning}</div>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Risk</div>
              <div className="mt-2 text-sm text-slate-300">{step.risk}</div>
            </div>

            {renderParameters(step)}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" type="button" onClick={() => onAction(step)}>{actionLabel[step.kind] || 'Take Action'}</Button>
              <Button variant="ghost" type="button">View details</Button>
            </div>
          </Card>
        ))}
      </div>
    </Card>
  )
}
