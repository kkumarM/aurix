import React, { useState } from 'react'
import Card from './ui/Card'
import Button from './ui/Button'
import Badge from './ui/Badge'

export default function GeneratedScenarioSummary({
  scenario,
  onEditExpert,
  collapsible = false,
  compact = false,
}: {
  scenario?: any
  onEditExpert: () => void
  collapsible?: boolean
  compact?: boolean
}) {
  if (!scenario?.meta?.llm_planner) return null

  const [open, setOpen] = useState(!collapsible)
  const model = scenario.meta?.llm_planner?.model || scenario.workload?.name || 'Generated model'
  const gpu = scenario.target?.name || 'GPU'
  const rps = scenario.workload?.rps ?? 0
  const tokensPerRequest = scenario.pipeline
    ?.filter((stage) => stage.kind === 'tokens')
    ?.reduce((sum, stage) => sum + Number(stage.value || 0), 0) || 0
  const msPerToken = scenario.target?.ms_per_token ?? 0
  const pipelineSummary = (scenario.pipeline || []).map(describeStage)

  return (
    <Card className={`border-emerald-500/10 ${compact ? 'p-4' : 'p-5'} space-y-3`}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-slate-100 font-semibold">{collapsible ? 'Generated Scenario' : 'Generated Scenario Summary'}</div>
        <Badge tone="neutral">LLM Planner</Badge>
        {collapsible && (
          <button className="text-xs text-slate-400 hover:text-slate-200" onClick={() => setOpen((value) => !value)}>
            {open ? 'Hide details' : 'Show details'}
          </button>
        )}
        <div className="ml-auto">
          <Button variant="secondary" className="text-xs" onClick={onEditExpert}>Edit in Expert Mode</Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryStat label="Model" value={model} />
        <SummaryStat label="GPU" value={gpu} />
        <SummaryStat label="RPS" value={fmt(rps)} />
        <SummaryStat label="Tokens / request" value={fmt(tokensPerRequest, 0)} />
      </div>

      <div className="flex flex-wrap gap-3 text-sm text-slate-300">
        <span>Estimated ms/token: <span className="text-slate-100">{fmt(msPerToken, 3)}</span></span>
        <span>Batch size: <span className="text-slate-100">{fmt(scenario.workload?.batch_size ?? 1, 0)}</span></span>
        <span>Concurrency: <span className="text-slate-100">{fmt(scenario.target?.concurrency ?? 1, 0)}</span></span>
      </div>

      {open && (
        <div className="space-y-2">
          <div className="text-sm font-semibold text-slate-100">Generated pipeline summary</div>
          <div className="grid gap-2 md:grid-cols-2">
            {pipelineSummary.map((item) => (
              <div key={item} className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-300">
                {item}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-100">{value}</div>
    </div>
  )
}

function describeStage(stage: any) {
  if (stage.kind === 'fixed_ms') return `${stage.name}: ${fmt(stage.value)} ms`
  if (stage.kind === 'tokens') return `${stage.name}: ${fmt(stage.value, 0)} tokens`
  if (stage.kind === 'bytes') return `${stage.name}: ${fmt(Number(stage.value || 0) / (1024 * 1024))} MB`
  return `${stage.name}: ${String(stage.value)}`
}

function fmt(value: number, digits = 1) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '—'
  return Number(value).toFixed(digits)
}
