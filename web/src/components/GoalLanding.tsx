import React from 'react'
import Card from './ui/Card'
import Button from './ui/Button'
import Badge from './ui/Badge'
import QuickQuestions from './QuickQuestions'
import { exampleScenarios } from '../utils/exampleScenarios'

export default function GoalLanding({
  onOpenPlanner,
  onOpenWizard,
  onOpenCompare,
  onUploadTrace,
  onOpenScenarioBuilder,
  onOpenDocs,
  onLoadExample,
  onLoadAndRunExample,
}) {
  const goals = [
    {
      title: 'Estimate LLM serving cost',
      description: 'Estimate GPU count, latency, and monthly cost for an LLM inference workload.',
      cta: 'Open LLM Cost Planner',
      action: onOpenPlanner,
    },
    {
      title: 'Check SLA feasibility',
      description: 'See whether your workload can meet a target p99 latency and throughput.',
      cta: 'Use Scenario Wizard',
      action: onOpenWizard,
    },
    {
      title: 'Compare GPU options',
      description: 'Compare how the same workload behaves across GPU profiles.',
      cta: 'Open Compare / Sweeps',
      action: onOpenCompare,
    },
    {
      title: 'Analyze a real trace',
      description: 'Upload an Nsight Systems trace and compare real behavior with modeled behavior.',
      cta: 'Upload Nsight trace',
      action: onUploadTrace,
    },
    {
      title: 'Expert simulation mode',
      description: 'Build a detailed scenario with pipeline stages, queueing, transfers, and compute.',
      cta: 'Open Scenario Builder',
      action: onOpenScenarioBuilder,
    },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <Card className="p-6 space-y-4">
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.18em] text-emerald-300">Choose your goal</div>
          <div className="text-3xl font-semibold text-slate-100">Choose your goal</div>
          <div className="max-w-3xl text-sm text-slate-300">
            GPARX helps you estimate GPU workload cost, capacity, and performance behavior before deployment.
          </div>
        </div>

        <div className="grid xl:grid-cols-3 md:grid-cols-2 gap-4">
          {goals.map((goal) => (
            <Card key={goal.title} className="p-4 space-y-3 bg-slate-950/40">
              <div className="flex items-start justify-between gap-3">
                <div className="text-slate-100 font-semibold leading-snug">{goal.title}</div>
                {goal.status && <Badge tone="warning">{goal.status}</Badge>}
              </div>
              <div className="text-sm text-slate-300 min-h-[60px]">{goal.description}</div>
              <Button variant={goal.status ? 'secondary' : 'primary'} onClick={goal.action} className="w-full">
                {goal.cta}
              </Button>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-slate-400">
          <span>Advanced flows stay available:</span>
          <Badge>Scenario Builder</Badge>
          <Badge>Timeline</Badge>
          <Badge>Sweeps</Badge>
          <Badge>Compare</Badge>
          <Badge>Docs</Badge>
          <Badge>Real Trace Upload</Badge>
          <Badge>Wizard</Badge>
          <Badge>Decision Summary</Badge>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xl font-semibold text-slate-100">Examples</div>
            <div className="text-sm text-slate-400">Load a scenario instantly, inspect the Decision Summary, then move into timeline, compare, or sweeps.</div>
          </div>
          <Button variant="ghost" onClick={onOpenDocs}>Why these examples?</Button>
        </div>

        <div className="grid xl:grid-cols-3 md:grid-cols-2 gap-4">
          {exampleScenarios.map((example) => (
            <Card key={example.key} className="p-4 space-y-3 bg-slate-950/40">
              <div className="space-y-1">
                <div className="text-slate-100 font-semibold">{example.name}</div>
                <div className="text-sm text-slate-300">{example.description}</div>
              </div>
              <div className="text-xs text-slate-400">
                <span className="text-slate-300">Observe:</span> {example.observe}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => onLoadExample(example.scenario)}>Load</Button>
                <Button className="flex-1" onClick={() => onLoadAndRunExample(example.scenario)}>Load &amp; Run</Button>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      <div className="grid lg:grid-cols-[2fr,1fr] gap-4">
        <QuickQuestions
          onBottleneck={onOpenScenarioBuilder}
          onSla={onOpenWizard}
          onConcurrency={onOpenCompare}
          onGpuCount={onOpenPlanner}
          onCompare={onOpenCompare}
        />
        <Card className="p-4 space-y-3">
          <div className="text-slate-100 font-semibold">Suggested workflow</div>
          <ol className="list-decimal list-inside text-sm text-slate-300 space-y-1">
            <li>Choose the nearest goal.</li>
            <li>Load an example or use the Wizard.</li>
            <li>Run the simulation.</li>
            <li>Read the Decision Summary first.</li>
            <li>Inspect timeline and sweeps only if you need detail.</li>
          </ol>
        </Card>
      </div>
    </div>
  )
}
