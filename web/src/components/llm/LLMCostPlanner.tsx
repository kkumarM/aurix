import React, { useMemo, useState } from 'react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import Field from '../forms/Field'
import { inputBase, selectBase } from '../../styles/formClasses'
import { gpuPresets } from '../../data/gpuPresets'
import { llmModelPresets } from '../../data/llmPresets'
import { buildJsonReport, buildMarkdownReport, buildPlannerReport, buildPlannerScenario, estimateMemory, estimateMsPerToken, getTokensPerRequest, resolveGpu, resolveModel, type PlannerInput, type PlannerReport } from '../../utils/llmCost'
import { computeDiagnosticsFromTrace } from '../../utils/diagnostics'

type Props = {
  backendUrl: string
  onPlannerRun: (run: any, scenario: any) => void
  onOpenScenario: (scenario: any) => void
  onOpenTimeline: (run: any, scenario: any) => void
  onOpenSweep: (scenario: any, mode: 'rps' | 'con') => void
  onCompareRuns: (runAId: string, runBId: string) => void
}

const defaultModel = llmModelPresets[0]
const defaultGpu = gpuPresets.find((gpu) => gpu.id === 'a10g') || gpuPresets[0]

export default function LLMCostPlanner({
  backendUrl,
  onPlannerRun,
  onOpenScenario,
  onOpenTimeline,
  onOpenSweep,
  onCompareRuns,
}: Props) {
  const [input, setInput] = useState<PlannerInput>(() => ({
    model: {
      presetId: defaultModel.id,
      contextTokens: defaultModel.default_context_tokens,
    },
    quantization: 'bf16',
    averageRps: 2,
    peakRps: 5,
    planningMode: 'peak',
    averageInputTokens: defaultModel.typical_input_tokens,
    averageOutputTokens: defaultModel.typical_output_tokens,
    targetP99Ms: 250,
    deploymentHoursPerMonth: 730,
    safetyHeadroomPct: 30,
    servingMode: 'continuous',
    batchSize: 4,
    maxConcurrentSequences: defaultGpu.concurrency,
    kvCacheEnabled: true,
    gpu: {
      presetId: defaultGpu.id,
      hourlyPrice: defaultGpu.hourly_price_estimate,
    },
    advancedEnabled: false,
    gpuMemoryUtilizationTargetPct: 85,
  }))
  const [report, setReport] = useState<PlannerReport | null>(null)
  const [latestRun, setLatestRun] = useState<any>(null)
  const [estimating, setEstimating] = useState(false)
  const [error, setError] = useState('')
  const [compareGpuId, setCompareGpuId] = useState(gpuPresets.find((gpu) => gpu.id !== defaultGpu.id)?.id || defaultGpu.id)

  const effectiveModel = useMemo(() => resolveModel(input.model), [input.model])
  const effectiveGpu = useMemo(() => resolveGpu(input.gpu), [input.gpu])
  const previewMemory = useMemo(
    () => estimateMemory(
      effectiveModel,
      effectiveGpu,
      input.quantization,
      input.maxConcurrentSequences,
      Math.min(input.model.contextTokens || effectiveModel.default_context_tokens, getTokensPerRequest(input)),
      input.kvCacheEnabled,
      input.advancedEnabled ? input.gpuMemoryUtilizationTargetPct || 85 : 85,
    ),
    [effectiveModel, effectiveGpu, input],
  )
  const previewTokenEstimate = useMemo(
    () => estimateMsPerToken(effectiveModel, effectiveGpu, input.quantization, input.servingMode, input.maxConcurrentSequences, {
      msPerTokenOverride: input.advancedEnabled ? input.msPerTokenOverride : undefined,
      tokensPerSecondOverride: input.advancedEnabled ? input.tokensPerSecondOverride : undefined,
      memory: previewMemory,
    }),
    [effectiveModel, effectiveGpu, input, previewMemory],
  )

  const handleEstimate = async (nextInput = input, options?: { compareAgainstRunId?: string; openCompare?: boolean }) => {
    setEstimating(true)
    setError('')

    try {
      const model = resolveModel(nextInput.model)
      const gpu = resolveGpu(nextInput.gpu)
      const memory = estimateMemory(
        model,
        gpu,
        nextInput.quantization,
        nextInput.maxConcurrentSequences,
        Math.min(nextInput.model.contextTokens || model.default_context_tokens, getTokensPerRequest(nextInput)),
        nextInput.kvCacheEnabled,
        nextInput.advancedEnabled ? nextInput.gpuMemoryUtilizationTargetPct || 85 : 85,
      )
      const tokenEstimate = estimateMsPerToken(model, gpu, nextInput.quantization, nextInput.servingMode, nextInput.maxConcurrentSequences, {
        msPerTokenOverride: nextInput.advancedEnabled ? nextInput.msPerTokenOverride : undefined,
        tokensPerSecondOverride: nextInput.advancedEnabled ? nextInput.tokensPerSecondOverride : undefined,
        memory,
      })
      const generatedScenario = buildPlannerScenario(nextInput, model, gpu, tokenEstimate)

      const runRes = await fetch(`${backendUrl}/v1/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: generatedScenario }),
      })
      const runData = await runRes.json().catch(() => ({}))
      if (!runRes.ok) throw new Error(runData.error || 'Failed to estimate plan')

      const runId = runData.run_id
      const summary = runData.summary
      const breakdown = runData.breakdown || (await (await fetch(`${backendUrl}/v1/runs/${runId}/breakdown`)).json())
      const tracePath = runData.artifacts?.trace
      const run = { id: runId, summary, trace: tracePath, breakdown, scenario: generatedScenario }

      let diagnostics = null
      try {
        const traceRes = await fetch(`${backendUrl}/v1/runs/${runId}/trace`)
        if (traceRes.ok) {
          const traceJson = await traceRes.json()
          diagnostics = computeDiagnosticsFromTrace(traceJson)
        }
      } catch {
        diagnostics = null
      }

      const nextReport = buildPlannerReport(nextInput, model, gpu, memory, tokenEstimate, summary, diagnostics, generatedScenario)
      setInput(nextInput)
      setLatestRun(run)
      setReport(nextReport)
      onPlannerRun(run, generatedScenario)

      if (options?.compareAgainstRunId && options.openCompare) {
        onCompareRuns(options.compareAgainstRunId, run.id)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to estimate plan')
    } finally {
      setEstimating(false)
    }
  }

  const compareAnotherGpu = async () => {
    if (!latestRun) return
    if (compareGpuId === input.gpu.presetId && input.gpu.presetId !== 'custom') {
      setError('Choose a different GPU profile to compare.')
      return
    }
    const preset = gpuPresets.find((gpu) => gpu.id === compareGpuId)
    const nextInput = {
      ...input,
      gpu: {
        ...input.gpu,
        presetId: compareGpuId,
        hourlyPrice: preset?.hourly_price_estimate ?? input.gpu.hourlyPrice,
      },
    }
    await handleEstimate(nextInput, { compareAgainstRunId: latestRun.id, openCompare: true })
  }

  const download = (text: string, mime: string, fileName: string) => {
    const blob = new Blob([text], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  const selectedPricingNote = input.gpu.presetId === 'custom'
    ? 'Custom GPU pricing is user-provided.'
    : 'Hourly prices shown here are example planning estimates only.'

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <Card className="p-6 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-emerald-300">Goal Workflow</div>
            <div className="text-3xl font-semibold text-slate-100">LLM Cost Planner</div>
          </div>
          <Badge tone="warning">Planning estimator</Badge>
        </div>
        <div className="max-w-4xl text-sm text-slate-300">
          Answer a practical question: can you serve this workload, on which GPU, at what latency, and at what cost?
        </div>
        <div className="text-xs text-slate-500">
          These are planning estimates. Use real benchmarking or Nsight calibration for production accuracy.
        </div>
      </Card>

      <div className="grid xl:grid-cols-[1.1fr,0.9fr] gap-4">
        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold text-slate-100">Input panel</div>
              <Button variant="primary" disabled={estimating} onClick={() => handleEstimate()}>
                {estimating ? 'Estimating…' : 'Estimate'}
              </Button>
            </div>

            <PlannerSection title="Model">
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Model preset">
                  <select
                    className={selectBase}
                    value={input.model.presetId}
                    onChange={(e) => {
                      const presetId = e.target.value
                      const preset = llmModelPresets.find((item) => item.id === presetId)
                      setInput((prev) => ({
                        ...prev,
                        model: {
                          ...prev.model,
                          presetId,
                          customName: presetId === 'custom' ? prev.model.customName : '',
                          parametersB: presetId === 'custom' ? prev.model.parametersB : preset?.parameters_b,
                          activeParametersB: presetId === 'custom' ? prev.model.activeParametersB : preset?.active_parameters_b,
                          contextTokens: preset?.default_context_tokens ?? prev.model.contextTokens,
                        },
                        averageInputTokens: preset?.typical_input_tokens ?? prev.averageInputTokens,
                        averageOutputTokens: preset?.typical_output_tokens ?? prev.averageOutputTokens,
                      }))
                    }}
                  >
                    {llmModelPresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
                    <option value="custom">Custom</option>
                  </select>
                </Field>
                <Field label="Quantization" help="Lower-bit quantization improves planning throughput estimates, but may change quality in real systems.">
                  <select className={selectBase} value={input.quantization} onChange={(e) => setInput((prev) => ({ ...prev, quantization: e.target.value as PlannerInput['quantization'] }))}>
                    <option value="fp16">FP16</option>
                    <option value="bf16">BF16</option>
                    <option value="int8">INT8</option>
                    <option value="int4">INT4</option>
                  </select>
                </Field>
              </div>

              {input.model.presetId === 'custom' && (
                <div className="grid md:grid-cols-3 gap-3">
                  <Field label="Custom model name">
                    <input className={inputBase} value={input.model.customName || ''} onChange={(e) => setInput((prev) => ({ ...prev, model: { ...prev.model, customName: e.target.value } }))} />
                  </Field>
                  <Field label="Parameter count" suffix="B">
                    <input className={inputBase} type="number" value={input.model.parametersB || 7} onChange={(e) => setInput((prev) => ({ ...prev, model: { ...prev.model, parametersB: parseFloat(e.target.value) || 0 } }))} />
                  </Field>
                  <Field label="Active parameters" suffix="B" help="Use this if the model is MoE and not all parameters are active per token.">
                    <input className={inputBase} type="number" value={input.model.activeParametersB || input.model.parametersB || 7} onChange={(e) => setInput((prev) => ({ ...prev, model: { ...prev.model, activeParametersB: parseFloat(e.target.value) || 0 } }))} />
                  </Field>
                </div>
              )}
            </PlannerSection>

            <PlannerSection title="Traffic">
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Average requests/sec">
                  <input className={inputBase} type="number" value={input.averageRps} onChange={(e) => setInput((prev) => ({ ...prev, averageRps: parseFloat(e.target.value) || 0 }))} />
                </Field>
                <Field label="Peak requests/sec">
                  <input className={inputBase} type="number" value={input.peakRps} onChange={(e) => setInput((prev) => ({ ...prev, peakRps: parseFloat(e.target.value) || 0 }))} />
                </Field>
                <Field label="Average input tokens">
                  <input className={inputBase} type="number" value={input.averageInputTokens} onChange={(e) => setInput((prev) => ({ ...prev, averageInputTokens: parseInt(e.target.value, 10) || 0 }))} />
                </Field>
                <Field label="Average output tokens">
                  <input className={inputBase} type="number" value={input.averageOutputTokens} onChange={(e) => setInput((prev) => ({ ...prev, averageOutputTokens: parseInt(e.target.value, 10) || 0 }))} />
                </Field>
                <Field label="Target p99 latency" suffix="ms">
                  <input className={inputBase} type="number" value={input.targetP99Ms} onChange={(e) => setInput((prev) => ({ ...prev, targetP99Ms: parseFloat(e.target.value) || 0 }))} />
                </Field>
                <Field label="Planning mode" help="Use peak for sizing production capacity; use average for steady-state estimates.">
                  <select className={selectBase} value={input.planningMode} onChange={(e) => setInput((prev) => ({ ...prev, planningMode: e.target.value as PlannerInput['planningMode'] }))}>
                    <option value="peak">Peak traffic</option>
                    <option value="average">Average traffic</option>
                  </select>
                </Field>
                <Field label="Deployment hours/month">
                  <input className={inputBase} type="number" value={input.deploymentHoursPerMonth} onChange={(e) => setInput((prev) => ({ ...prev, deploymentHoursPerMonth: parseFloat(e.target.value) || 0 }))} />
                </Field>
                <Field label="Safety headroom" suffix="%">
                  <input className={inputBase} type="number" value={input.safetyHeadroomPct} onChange={(e) => setInput((prev) => ({ ...prev, safetyHeadroomPct: parseFloat(e.target.value) || 0 }))} />
                </Field>
              </div>
            </PlannerSection>

            <PlannerSection title="GPU">
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="GPU profile">
                  <select
                    className={selectBase}
                    value={input.gpu.presetId}
                    onChange={(e) => {
                      const presetId = e.target.value
                      const preset = gpuPresets.find((item) => item.id === presetId)
                      setInput((prev) => ({
                        ...prev,
                        gpu: {
                          ...prev.gpu,
                          presetId,
                          hourlyPrice: preset?.hourly_price_estimate ?? prev.gpu.hourlyPrice,
                          memoryGb: preset?.memory_gb ?? prev.gpu.memoryGb,
                          fp16Tflops: preset?.fp16_tflops_est ?? prev.gpu.fp16Tflops,
                          memoryBandwidthGbps: preset?.memory_bandwidth_gbps ?? prev.gpu.memoryBandwidthGbps,
                          concurrency: preset?.concurrency ?? prev.gpu.concurrency,
                        },
                        maxConcurrentSequences: preset?.concurrency ?? prev.maxConcurrentSequences,
                      }))
                    }}
                  >
                    {gpuPresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
                    <option value="custom">Custom</option>
                  </select>
                </Field>
                <Field label="GPU hourly price" suffix="USD/hr" help={selectedPricingNote}>
                  <input className={inputBase} type="number" value={input.gpu.hourlyPrice || 0} onChange={(e) => setInput((prev) => ({ ...prev, gpu: { ...prev.gpu, hourlyPrice: parseFloat(e.target.value) || 0 } }))} />
                </Field>
              </div>

              {input.gpu.presetId === 'custom' && (
                <div className="grid md:grid-cols-4 gap-3">
                  <Field label="Memory" suffix="GB">
                    <input className={inputBase} type="number" value={input.gpu.memoryGb || 24} onChange={(e) => setInput((prev) => ({ ...prev, gpu: { ...prev.gpu, memoryGb: parseFloat(e.target.value) || 0 } }))} />
                  </Field>
                  <Field label="FP16 TFLOPS">
                    <input className={inputBase} type="number" value={input.gpu.fp16Tflops || 30} onChange={(e) => setInput((prev) => ({ ...prev, gpu: { ...prev.gpu, fp16Tflops: parseFloat(e.target.value) || 0 } }))} />
                  </Field>
                  <Field label="Memory bandwidth" suffix="GB/s">
                    <input className={inputBase} type="number" value={input.gpu.memoryBandwidthGbps || 300} onChange={(e) => setInput((prev) => ({ ...prev, gpu: { ...prev.gpu, memoryBandwidthGbps: parseFloat(e.target.value) || 0 } }))} />
                  </Field>
                  <Field label="GPU concurrency">
                    <input className={inputBase} type="number" value={input.gpu.concurrency || 2} onChange={(e) => setInput((prev) => ({ ...prev, gpu: { ...prev.gpu, concurrency: parseInt(e.target.value, 10) || 1 } }))} />
                  </Field>
                </div>
              )}
            </PlannerSection>

            <PlannerSection title="Serving mode">
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Serving mode">
                  <select className={selectBase} value={input.servingMode} onChange={(e) => setInput((prev) => ({ ...prev, servingMode: e.target.value as PlannerInput['servingMode'] }))}>
                    <option value="single">Single request</option>
                    <option value="continuous">Continuous batching</option>
                  </select>
                </Field>
                <Field label="Batch size / max concurrent sequences">
                  <input className={inputBase} type="number" value={input.maxConcurrentSequences} onChange={(e) => setInput((prev) => ({ ...prev, batchSize: parseInt(e.target.value, 10) || 1, maxConcurrentSequences: parseInt(e.target.value, 10) || 1 }))} />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={input.kvCacheEnabled} onChange={(e) => setInput((prev) => ({ ...prev, kvCacheEnabled: e.target.checked }))} />
                KV cache enabled
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={input.advancedEnabled} onChange={(e) => setInput((prev) => ({ ...prev, advancedEnabled: e.target.checked }))} />
                Advanced overrides
              </label>

              {input.advancedEnabled && (
                <div className="grid md:grid-cols-3 gap-3">
                  <Field label="GPU memory utilization target" suffix="%">
                    <input className={inputBase} type="number" value={input.gpuMemoryUtilizationTargetPct || 85} onChange={(e) => setInput((prev) => ({ ...prev, gpuMemoryUtilizationTargetPct: parseFloat(e.target.value) || 0 }))} />
                  </Field>
                  <Field label="Tokens/sec override" help="Optional override. If provided, planner converts it to ms/token.">
                    <input className={inputBase} type="number" value={input.tokensPerSecondOverride || ''} onChange={(e) => setInput((prev) => ({ ...prev, tokensPerSecondOverride: parseFloat(e.target.value) || undefined }))} />
                  </Field>
                  <Field label="ms/token override" help="Optional override. Takes precedence over heuristic estimates.">
                    <input className={inputBase} type="number" value={input.msPerTokenOverride || ''} onChange={(e) => setInput((prev) => ({ ...prev, msPerTokenOverride: parseFloat(e.target.value) || undefined }))} />
                  </Field>
                </div>
              )}
            </PlannerSection>

            {error && <div className="text-sm text-red-400">{error}</div>}
          </Card>

          <Card className="p-5 space-y-4">
            <div className="text-lg font-semibold text-slate-100">Assumptions panel</div>
            <AssumptionLine label="Model" value={`${effectiveModel.name} • ${effectiveModel.parameters_b}B params`} />
            <AssumptionLine label="GPU" value={`${effectiveGpu.name} • ${effectiveGpu.memory_gb} GB • ${effectiveGpu.fp16_tflops_est} FP16 TFLOPS`} />
            <AssumptionLine label="Estimated ms/token" value={`${previewTokenEstimate.msPerToken.toFixed(3)} ms/token (${previewTokenEstimate.confidence} confidence)`} />
            <AssumptionLine label="Preview memory" value={`${previewMemory.totalMemoryGb.toFixed(1)} GB / ${previewMemory.gpuMemoryGb.toFixed(0)} GB`} />
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-400">
              These presets and prices are estimates. Use real benchmarking or Nsight calibration for production accuracy.
            </div>
            <div className="space-y-2">
              {previewTokenEstimate.assumptions.map((item) => (
                <div key={item} className="text-sm text-slate-300">• {item}</div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <div className="text-lg font-semibold text-slate-100">Results panel</div>
            {!report && (
              <div className="text-sm text-slate-400">
                Enter workload, GPU, and pricing inputs, then click <span className="text-slate-200 font-medium">Estimate</span> to turn them into a simulation-backed cost plan.
              </div>
            )}

            {report && (
              <>
                <div className="grid md:grid-cols-2 gap-3">
                  <DecisionCard title="Feasibility" badge={report.feasibility} badgeTone={report.feasibility === 'Feasible' ? 'success' : report.feasibility === 'Risky' ? 'warning' : 'danger'}>
                    {report.feasibilityExplanation}
                  </DecisionCard>
                  <DecisionCard title="Recommended capacity" badge={report.memoryStatus} badgeTone={report.memoryStatus === 'Memory feasible' ? 'success' : report.memoryStatus === 'Memory risky' ? 'warning' : 'danger'}>
                    {report.requiredGpus > 0 ? `${report.requiredGpus} × ${report.gpu.name}` : 'Capacity estimate unavailable because the run did not produce usable throughput.'}
                  </DecisionCard>
                  <MetricCard label="Monthly cost" value={`$${report.monthlyCost.toFixed(2)}`} help="Provisioned cost using required GPU count, hourly price, and deployment hours/month." />
                  <MetricCard label="Cost per 1M tokens" value={`$${report.costPer1MTokens.toFixed(2)}`} help="Monthly infrastructure cost divided by estimated monthly token volume." />
                  <MetricCard label="Latency" value={`p50 ${report.latencyP50Ms.toFixed(1)} ms • p99 ${report.latencyP99Ms.toFixed(1)} ms`} help={`Target p99 is ${report.targetP99Ms.toFixed(0)} ms.`} />
                  <DecisionCard title="Bottleneck" badge={report.bottleneck} badgeTone="neutral">
                    {report.bottleneckExplanation}
                  </DecisionCard>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Card className="p-4 bg-slate-950/40 space-y-2">
                    <div className="text-slate-100 font-semibold">Individual interpretation</div>
                    <div className="text-sm text-slate-300">{report.individualInterpretation}</div>
                  </Card>
                  <Card className="p-4 bg-slate-950/40 space-y-2">
                    <div className="text-slate-100 font-semibold">Corporate interpretation</div>
                    <div className="text-sm text-slate-300">{report.corporateInterpretation}</div>
                  </Card>
                </div>
              </>
            )}
          </Card>

          <Card className="p-5 space-y-4">
            <div className="text-lg font-semibold text-slate-100">Actions panel</div>
            <div className="grid md:grid-cols-2 gap-2">
              <Button variant="secondary" disabled={!report} onClick={() => report && onOpenScenario(report.generatedScenario)}>Open generated scenario</Button>
              <Button variant="secondary" disabled={!report} onClick={() => report && onOpenScenario(report.generatedScenario)}>Edit in Expert Mode</Button>
              <Button variant="secondary" disabled={!report || !latestRun} onClick={() => report && latestRun && onOpenTimeline(latestRun, report.generatedScenario)}>View timeline</Button>
              <Button variant="secondary" disabled={!report} onClick={() => report && onOpenSweep(report.generatedScenario, 'rps')}>Run RPS sweep</Button>
              <Button variant="secondary" disabled={!report} onClick={() => report && onOpenSweep(report.generatedScenario, 'con')}>Run concurrency sweep</Button>
              <Button variant="secondary" disabled={!report} onClick={() => report && download(buildMarkdownReport(report), 'text/markdown', 'gparx-llm-cost-plan.md')}>Export Markdown report</Button>
              <Button variant="secondary" disabled={!report} onClick={() => report && download(buildJsonReport(report), 'application/json', 'gparx-llm-cost-plan.json')}>Export JSON report</Button>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 space-y-3">
              <div className="text-slate-100 font-semibold">Compare another GPU</div>
              <div className="grid md:grid-cols-[1fr,auto] gap-2">
                <select className={selectBase} value={compareGpuId} onChange={(e) => setCompareGpuId(e.target.value)}>
                  {gpuPresets.map((gpu) => <option key={gpu.id} value={gpu.id}>{gpu.name}</option>)}
                </select>
                <Button disabled={!latestRun || estimating} onClick={compareAnotherGpu}>Compare another GPU</Button>
              </div>
              <div className="text-xs text-slate-500">This duplicates the generated scenario, re-estimates on another GPU, and opens Compare with both runs.</div>
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <div className="text-lg font-semibold text-slate-100">Educational UX</div>
            <MiniHelp title="What is cost per 1M tokens?">
              It is the monthly infrastructure cost divided by estimated monthly token volume, normalized to one million tokens so different workloads are easier to compare.
            </MiniHelp>
            <MiniHelp title="Why p99 matters">
              p99 tells you how the slowest requests behave under load. A plan that looks fine at p50 can still fail user-facing SLA at p99.
            </MiniHelp>
            <MiniHelp title="Why memory feasibility matters">
              If the model, runtime overhead, and KV cache do not fit comfortably in GPU memory, the plan is not production-safe even if raw compute looks fast.
            </MiniHelp>
            <MiniHelp title="Why calibration improves accuracy">
              Calibration replaces heuristics with real measurements from your serving stack, GPU, and request mix, which makes latency and bottleneck estimates more trustworthy.
            </MiniHelp>
          </Card>
        </div>
      </div>
    </div>
  )
}

function PlannerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">{title}</div>
      {children}
    </div>
  )
}

function AssumptionLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <div className="text-slate-400">{label}</div>
      <div className="text-right text-slate-200">{value}</div>
    </div>
  )
}

function DecisionCard({
  title,
  badge,
  badgeTone,
  children,
}: {
  title: string
  badge: string
  badgeTone: 'success' | 'danger' | 'warning' | 'neutral'
  children: React.ReactNode
}) {
  return (
    <Card className="p-4 bg-slate-950/40 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-slate-100 font-semibold">{title}</div>
        <Badge tone={badgeTone}>{badge}</Badge>
      </div>
      <div className="text-sm text-slate-300">{children}</div>
    </Card>
  )
}

function MetricCard({ label, value, help }: { label: string; value: string; help?: string }) {
  return (
    <Card className="p-4 bg-slate-950/40 space-y-2">
      <div className="text-xs uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className="text-xl font-semibold text-slate-100">{value}</div>
      {help && <div className="text-xs text-slate-500">{help}</div>}
    </Card>
  )
}

function MiniHelp({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-3">
      <summary className="cursor-pointer text-sm font-medium text-slate-200">{title}</summary>
      <div className="pt-2 text-sm text-slate-400">{children}</div>
    </details>
  )
}
