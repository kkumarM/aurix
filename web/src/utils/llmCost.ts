import { gpuPresetMap, type GPUPreset } from '../data/gpuPresets'
import { llmModelPresetMap, type LLMModelPreset } from '../data/llmPresets'
import type { Diagnostics } from './diagnostics'

export type Quantization = 'fp16' | 'bf16' | 'int8' | 'int4'
export type ServingMode = 'single' | 'continuous'
export type PlanningMode = 'average' | 'peak'

export type PlannerModelInput = {
  presetId: string
  customName?: string
  parametersB?: number
  activeParametersB?: number
  contextTokens?: number
}

export type PlannerGpuInput = {
  presetId: string
  customName?: string
  memoryGb?: number
  fp16Tflops?: number
  memoryBandwidthGbps?: number
  hourlyPrice?: number
  h2dGbps?: number
  d2hGbps?: number
  concurrency?: number
}

export type PlannerInput = {
  model: PlannerModelInput
  quantization: Quantization
  averageRps: number
  peakRps: number
  planningMode: PlanningMode
  averageInputTokens: number
  averageOutputTokens: number
  targetP99Ms: number
  deploymentHoursPerMonth: number
  safetyHeadroomPct: number
  servingMode: ServingMode
  batchSize: number
  maxConcurrentSequences: number
  kvCacheEnabled: boolean
  gpu: PlannerGpuInput
  advancedEnabled: boolean
  gpuMemoryUtilizationTargetPct?: number
  tokensPerSecondOverride?: number
  msPerTokenOverride?: number
}

export type EffectiveModel = {
  name: string
  parameters_b: number
  active_parameters_b: number
  default_context_tokens: number
  typical_input_tokens: number
  typical_output_tokens: number
  size_class: 'small' | 'medium' | 'large'
  notes: string
}

export type EffectiveGpu = {
  name: string
  memory_gb: number
  fp16_tflops_est: number
  memory_bandwidth_gbps: number
  hourly_price_estimate: number
  h2d_gbps: number
  d2h_gbps: number
  concurrency: number
  notes: string
}

export type MemoryEstimate = {
  weightMemoryGb: number
  overheadFactor: number
  kvCacheGb: number
  totalMemoryGb: number
  gpuMemoryGb: number
  utilizationPct: number
  status: 'Memory feasible' | 'Memory risky' | 'Memory infeasible on selected GPU'
  modelFactorGbPerTokenSequence: number
}

export type MsPerTokenEstimate = {
  msPerToken: number
  confidence: 'low' | 'medium' | 'high'
  assumptions: string[]
  source: 'user_override' | 'tokens_per_second_override' | 'heuristic'
}

export type PlannerReport = {
  model: EffectiveModel
  gpu: EffectiveGpu
  generatedScenario: any
  memory: MemoryEstimate
  tokenEstimate: MsPerTokenEstimate
  feasibility: 'Feasible' | 'Risky' | 'Not feasible'
  feasibilityExplanation: string
  memoryStatus: MemoryEstimate['status']
  bottleneck: string
  bottleneckExplanation: string
  requiredGpus: number
  monthlyCost: number
  costPer1MTokens: number
  monthlyTokens: number
  achievedRps: number
  planningRps: number
  latencyP50Ms: number
  latencyP99Ms: number
  targetP99Ms: number
  throughputWithHeadroom: number
  gpuBusyPct: number
  individualInterpretation: string
  corporateInterpretation: string
  assumptions: string[]
  nextActions: string[]
  inputs: {
    quantization: Quantization
    averageRps: number
    peakRps: number
    planningMode: PlanningMode
    averageInputTokens: number
    averageOutputTokens: number
    targetP99Ms: number
    deploymentHoursPerMonth: number
    safetyHeadroomPct: number
    servingMode: ServingMode
    batchSize: number
    maxConcurrentSequences: number
    kvCacheEnabled: boolean
    hourlyPrice: number
  }
}

const bytesPerParam: Record<Quantization, number> = {
  fp16: 2,
  bf16: 2,
  int8: 1,
  int4: 0.5,
}

const quantizationFactor: Record<Quantization, number> = {
  fp16: 1,
  bf16: 0.98,
  int8: 0.75,
  int4: 0.58,
}

const kvModelFactor: Record<EffectiveModel['size_class'], number> = {
  small: 0.00002,
  medium: 0.00006,
  large: 0.00012,
}

export function resolveModel(input: PlannerModelInput): EffectiveModel {
  if (input.presetId !== 'custom') {
    const preset = llmModelPresetMap[input.presetId]
    if (!preset) throw new Error('Unknown model preset')
    return toEffectiveModel(preset)
  }

  const parameters = Math.max(0.5, input.parametersB || 7)
  const activeParameters = Math.max(0.5, input.activeParametersB || parameters)
  const context = Math.max(1024, input.contextTokens || 8192)
  return {
    name: input.customName?.trim() || 'Custom model',
    parameters_b: parameters,
    active_parameters_b: Math.min(parameters, activeParameters),
    default_context_tokens: context,
    typical_input_tokens: Math.min(context, 1200),
    typical_output_tokens: Math.min(context, 320),
    size_class: parameters >= 40 ? 'large' : parameters >= 12 ? 'medium' : 'small',
    notes: 'Custom planning model provided by the user.',
  }
}

export function resolveGpu(input: PlannerGpuInput): EffectiveGpu {
  if (input.presetId !== 'custom') {
    const preset = gpuPresetMap[input.presetId]
    if (!preset) throw new Error('Unknown GPU preset')
    return toEffectiveGpu(preset, input.hourlyPrice)
  }

  return {
    name: input.customName?.trim() || 'Custom GPU',
    memory_gb: Math.max(8, input.memoryGb || 24),
    fp16_tflops_est: Math.max(5, input.fp16Tflops || 30),
    memory_bandwidth_gbps: Math.max(50, input.memoryBandwidthGbps || 300),
    hourly_price_estimate: Math.max(0, input.hourlyPrice || 1),
    h2d_gbps: Math.max(8, input.h2dGbps || 32),
    d2h_gbps: Math.max(8, input.d2hGbps || 32),
    concurrency: Math.max(1, Math.round(input.concurrency || 2)),
    notes: 'Custom GPU planning input provided by the user.',
  }
}

export function estimateMemory(model: EffectiveModel, gpu: EffectiveGpu, quantization: Quantization, concurrentSequences: number, contextTokens: number, kvCacheEnabled: boolean, utilizationRiskPct = 85): MemoryEstimate {
  const weightMemoryGb = model.parameters_b * bytesPerParam[quantization]
  const overheadFactor = 1.25
  const modelFactorGbPerTokenSequence = kvModelFactor[model.size_class]
  const kvCacheGb = kvCacheEnabled ? concurrentSequences * contextTokens * modelFactorGbPerTokenSequence : 0
  const totalMemoryGb = weightMemoryGb * overheadFactor + kvCacheGb
  const utilizationPct = (totalMemoryGb / Math.max(1, gpu.memory_gb)) * 100

  let status: MemoryEstimate['status'] = 'Memory feasible'
  if (totalMemoryGb > gpu.memory_gb) status = 'Memory infeasible on selected GPU'
  else if (utilizationPct > utilizationRiskPct) status = 'Memory risky'

  return {
    weightMemoryGb,
    overheadFactor,
    kvCacheGb,
    totalMemoryGb,
    gpuMemoryGb: gpu.memory_gb,
    utilizationPct,
    status,
    modelFactorGbPerTokenSequence,
  }
}

export function estimateMsPerToken(model: EffectiveModel, gpu: EffectiveGpu, quantization: Quantization, servingMode: ServingMode, concurrentSequences: number, overrides?: { msPerTokenOverride?: number; tokensPerSecondOverride?: number; memory?: MemoryEstimate }): MsPerTokenEstimate {
  const msOverride = overrides?.msPerTokenOverride
  if (msOverride && msOverride > 0) {
    return {
      msPerToken: msOverride,
      confidence: 'high',
      assumptions: ['Using user-provided ms/token override.'],
      source: 'user_override',
    }
  }

  const tpsOverride = overrides?.tokensPerSecondOverride
  if (tpsOverride && tpsOverride > 0) {
    return {
      msPerToken: 1000 / tpsOverride,
      confidence: 'high',
      assumptions: ['Using user-provided tokens/sec override and converting it to ms/token.'],
      source: 'tokens_per_second_override',
    }
  }

  const computeComponent = (model.active_parameters_b / Math.max(1, gpu.fp16_tflops_est)) * 0.85
  const memoryComponent = (model.active_parameters_b / Math.max(1, gpu.memory_bandwidth_gbps)) * 0.2
  const modeFactor = servingMode === 'continuous'
    ? Math.max(0.6, 0.9 - Math.log2(Math.max(1, concurrentSequences)) * 0.06)
    : 1 + Math.max(0, concurrentSequences - 1) * 0.03
  const memoryPressure = overrides?.memory ? Math.min(1.18, 1 + Math.max(0, overrides.memory.utilizationPct - 70) / 300) : 1
  const kvFactor = overrides?.memory && overrides.memory.kvCacheGb === 0 ? 1.08 : 0.95
  const msPerToken = clamp((computeComponent + memoryComponent) * modeFactor * quantizationFactor[quantization] * memoryPressure * kvFactor, 0.02, 25)

  const assumptions = [
    `Active parameter estimate: ${fmt(model.active_parameters_b)}B.`,
    `GPU compute estimate based on ${fmt(gpu.fp16_tflops_est)} FP16 TFLOPS and ${fmt(gpu.memory_bandwidth_gbps)} GB/s bandwidth.`,
    `Quantization ${quantization.toUpperCase()} is treated as a planning-speed adjustment only.`,
  ]
  if (servingMode === 'continuous') assumptions.push('Continuous batching reduces per-token latency when concurrency is available.')
  if (quantization === 'int8' || quantization === 'int4') assumptions.push('Lower-bit quantization may change accuracy or quality in real deployments.')

  const confidence = model.notes.includes('Custom') || gpu.notes.includes('Custom')
    ? 'low'
    : model.size_class === 'large'
      ? 'medium'
      : 'high'

  return {
    msPerToken,
    confidence,
    assumptions,
    source: 'heuristic',
  }
}

export function buildPlannerScenario(input: PlannerInput, model: EffectiveModel, gpu: EffectiveGpu, tokenEstimate: MsPerTokenEstimate) {
  const planningRps = getPlanningRps(input)
  const tokensPerRequest = getTokensPerRequest(input)
  const payloadFactor = input.quantization === 'int4' ? 2048 : input.quantization === 'int8' ? 3072 : 4096
  const outputPayloadFactor = input.quantization === 'int4' ? 768 : 1024
  const preprocessMs = input.servingMode === 'continuous' ? 1 : 2
  const postprocessMs = input.servingMode === 'continuous' ? 1 : 1.5

  return {
    name: `LLM Cost Plan - ${model.name} on ${gpu.name}`,
    analysis: {
      target_p99_ms: input.targetP99Ms,
      generated_by: 'llm_cost_planner',
      planning_mode: input.planningMode,
    },
    meta: {
      llm_planner: {
        model: model.name,
        gpu: gpu.name,
        quantization: input.quantization,
        planning_rps: planningRps,
      },
    },
    workload: {
      name: model.name,
      rps: planningRps,
      duration_s: 60,
      batch_size: Math.max(1, input.batchSize),
      jitter_pct: 5,
    },
    target: {
      name: gpu.name,
      tflops: gpu.fp16_tflops_est,
      mem_gbps: gpu.memory_bandwidth_gbps,
      ms_per_token: tokenEstimate.msPerToken,
      h2d_gbps: gpu.h2d_gbps,
      d2h_gbps: gpu.d2h_gbps,
      concurrency: Math.max(1, input.maxConcurrentSequences || gpu.concurrency),
    },
    pipeline: [
      { name: 'preprocess', kind: 'fixed_ms', value: preprocessMs },
      { name: 'h2d', kind: 'bytes', value: Math.max(512 * 1024, input.averageInputTokens * payloadFactor) },
      { name: 'compute', kind: 'tokens', value: tokensPerRequest },
      { name: 'd2h', kind: 'bytes', value: Math.max(128 * 1024, input.averageOutputTokens * outputPayloadFactor) },
      { name: 'postprocess', kind: 'fixed_ms', value: postprocessMs },
    ],
  }
}

export function buildPlannerReport(input: PlannerInput, model: EffectiveModel, gpu: EffectiveGpu, memory: MemoryEstimate, tokenEstimate: MsPerTokenEstimate, summary: any, diagnostics: Diagnostics | null, generatedScenario: any): PlannerReport {
  const achievedRps = Number(summary?.throughput_rps ?? summary?.throughput ?? 0)
  const planningRps = getPlanningRps(input)
  const headroomMultiplier = Math.max(0.05, 1 - input.safetyHeadroomPct / 100)
  const throughputWithHeadroom = achievedRps * headroomMultiplier
  const requiredGpus = achievedRps > 0 ? Math.max(1, Math.ceil(planningRps / Math.max(0.001, throughputWithHeadroom))) : 0
  const hourlyPrice = gpu.hourly_price_estimate
  const monthlyCost = requiredGpus * hourlyPrice * input.deploymentHoursPerMonth
  const monthlyTokens = input.averageRps * getTokensPerRequest(input) * 3600 * input.deploymentHoursPerMonth
  const costPer1MTokens = monthlyTokens > 0 ? (monthlyCost / monthlyTokens) * 1_000_000 : 0
  const latencyP50Ms = Number(summary?.p50_ms ?? summary?.p50 ?? 0)
  const latencyP99Ms = Number(summary?.p99_ms ?? summary?.p99 ?? 0)
  const bottleneck = resolveBottleneck(summary, diagnostics)
  const feasibility = classifyFeasibility(latencyP99Ms, input.targetP99Ms, memory.status)
  const gpuBusyPct = Number(diagnostics?.gpuBusy ?? summary?.gpu_util_percent ?? 0)

  const assumptions = [
    'These are planning estimates. Use real benchmarking or Nsight calibration for production accuracy.',
    'No framework-specific scheduler, KV-cache paging, or serving-stack behavior is modeled.',
    ...tokenEstimate.assumptions,
  ]

  const nextActions = [
    'Run an RPS sweep to see where p99 bends upward.',
    'Compare another GPU to test cost and headroom tradeoffs.',
    'Inspect the generated timeline to verify the dominant bottleneck.',
    'Calibrate with a real trace when production measurements are available.',
  ]

  return {
    model,
    gpu,
    generatedScenario,
    memory,
    tokenEstimate,
    feasibility,
    feasibilityExplanation: explainFeasibility(feasibility, latencyP99Ms, input.targetP99Ms, memory.status),
    memoryStatus: memory.status,
    bottleneck,
    bottleneckExplanation: explainBottleneck(bottleneck, diagnostics, summary),
    requiredGpus,
    monthlyCost,
    costPer1MTokens,
    monthlyTokens,
    achievedRps,
    planningRps,
    latencyP50Ms,
    latencyP99Ms,
    targetP99Ms: input.targetP99Ms,
    throughputWithHeadroom,
    gpuBusyPct,
    individualInterpretation: individualInterpretation(requiredGpus, monthlyCost),
    corporateInterpretation: `For production SLA planning, provision ${Math.max(1, requiredGpus)} ${gpu.name} GPU${requiredGpus === 1 ? '' : 's'} with ${fmt(input.safetyHeadroomPct, 0)}% headroom and validate against real measurements.`,
    assumptions,
    nextActions,
    inputs: {
      quantization: input.quantization,
      averageRps: input.averageRps,
      peakRps: input.peakRps,
      planningMode: input.planningMode,
      averageInputTokens: input.averageInputTokens,
      averageOutputTokens: input.averageOutputTokens,
      targetP99Ms: input.targetP99Ms,
      deploymentHoursPerMonth: input.deploymentHoursPerMonth,
      safetyHeadroomPct: input.safetyHeadroomPct,
      servingMode: input.servingMode,
      batchSize: input.batchSize,
      maxConcurrentSequences: input.maxConcurrentSequences,
      kvCacheEnabled: input.kvCacheEnabled,
      hourlyPrice,
    },
  }
}

export function classifyFeasibility(latencyP99Ms: number, targetP99Ms: number, memoryStatus: MemoryEstimate['status']) {
  if (memoryStatus === 'Memory infeasible on selected GPU') return 'Not feasible'
  if (latencyP99Ms <= targetP99Ms && memoryStatus === 'Memory feasible') return 'Feasible'
  if (latencyP99Ms <= targetP99Ms * 1.25 || memoryStatus === 'Memory risky') return 'Risky'
  return 'Not feasible'
}

export function resolveBottleneck(summary: any, diagnostics: Diagnostics | null) {
  const primary = diagnostics?.primary
  if (primary) return primary === 'Balanced' ? 'Mixed' : primary

  const queue = Number(summary?.avg_queue_ms ?? 0)
  const gpu = Number(summary?.gpu_util_percent ?? 0)
  if (queue > 25) return 'Queue-bound'
  if (gpu > 80) return 'GPU-bound'
  return 'Mixed'
}

export function buildMarkdownReport(report: PlannerReport) {
  return [
    '# GPARX LLM Cost Plan',
    '',
    '## Inputs',
    `- model: ${report.model.name}`,
    `- quantization: ${report.inputs.quantization.toUpperCase()}`,
    `- tokens: ${report.inputs.averageInputTokens} input / ${report.inputs.averageOutputTokens} output`,
    `- rps: ${fmt(report.inputs.averageRps)} avg / ${fmt(report.inputs.peakRps)} peak`,
    `- SLA p99: ${fmt(report.inputs.targetP99Ms)} ms`,
    `- GPU: ${report.gpu.name}`,
    `- hourly price: $${fmt(report.inputs.hourlyPrice)}`,
    `- hours/month: ${fmt(report.inputs.deploymentHoursPerMonth, 0)}`,
    '',
    '## Estimate',
    `- feasibility: ${report.feasibility}`,
    `- required GPUs: ${report.requiredGpus}`,
    `- p50/p99: ${fmt(report.latencyP50Ms)} / ${fmt(report.latencyP99Ms)} ms`,
    `- monthly cost: $${fmt(report.monthlyCost)}`,
    `- cost per 1M tokens: $${fmt(report.costPer1MTokens)}`,
    `- memory estimate: ${report.memoryStatus} (${fmt(report.memory.totalMemoryGb)} GB / ${fmt(report.memory.gpuMemoryGb)} GB)`,
    `- bottleneck: ${report.bottleneck}`,
    '',
    '## Assumptions',
    ...report.assumptions.map((item) => `- ${item}`),
    '',
    '## Recommended next steps',
    ...report.nextActions.map((item) => `- ${item}`),
  ].join('\n')
}

export function buildJsonReport(report: PlannerReport) {
  return JSON.stringify(report, null, 2)
}

export function getPlanningRps(input: PlannerInput) {
  return input.planningMode === 'peak' ? Math.max(input.averageRps, input.peakRps) : input.averageRps
}

export function getTokensPerRequest(input: Pick<PlannerInput, 'averageInputTokens' | 'averageOutputTokens'>) {
  return Math.max(1, input.averageInputTokens + input.averageOutputTokens)
}

function explainFeasibility(feasibility: PlannerReport['feasibility'], latencyP99Ms: number, targetP99Ms: number, memoryStatus: MemoryEstimate['status']) {
  if (feasibility === 'Feasible') {
    return `Estimated p99 ${fmt(latencyP99Ms)} ms is within the ${fmt(targetP99Ms)} ms SLA target, and memory remains within the selected GPU capacity.`
  }
  if (feasibility === 'Risky') {
    return `The plan is near the edge: estimated p99 is ${fmt(latencyP99Ms)} ms against ${fmt(targetP99Ms)} ms and memory status is ${memoryStatus.toLowerCase()}.`
  }
  return `The current configuration is not expected to meet the target because latency or memory exceeds a safe planning range.`
}

function explainBottleneck(bottleneck: string, diagnostics: Diagnostics | null, summary: any) {
  if (diagnostics?.evidence?.length) {
    return diagnostics.evidence.slice(0, 2).join(' • ')
  }
  if (bottleneck === 'Queue-bound') return `Average queue wait is ${fmt(summary?.avg_queue_ms ?? 0)} ms, indicating admission pressure.`
  if (bottleneck === 'GPU-bound') return `GPU utilization is approximately ${fmt(summary?.gpu_util_percent ?? 0)}%, suggesting compute saturation.`
  return 'No single dominant bottleneck was detected; inspect timeline and compare runs for detail.'
}

function individualInterpretation(requiredGpus: number, monthlyCost: number) {
  if (requiredGpus <= 1 && monthlyCost < 1000) return 'This plan looks suitable for individual or prototype usage if the estimated latency is acceptable.'
  if (requiredGpus <= 2) return 'This configuration is workable for a serious side project or startup workload, but cost sensitivity will matter.'
  return 'This configuration is likely too large for individual usage and is better framed as a team or production deployment decision.'
}

function toEffectiveModel(preset: LLMModelPreset): EffectiveModel {
  return {
    name: preset.name,
    parameters_b: preset.parameters_b,
    active_parameters_b: preset.active_parameters_b ?? preset.parameters_b,
    default_context_tokens: preset.default_context_tokens,
    typical_input_tokens: preset.typical_input_tokens,
    typical_output_tokens: preset.typical_output_tokens,
    size_class: preset.size_class,
    notes: preset.notes,
  }
}

function toEffectiveGpu(preset: GPUPreset, hourlyPriceOverride?: number): EffectiveGpu {
  return {
    name: preset.name,
    memory_gb: preset.memory_gb,
    fp16_tflops_est: preset.fp16_tflops_est,
    memory_bandwidth_gbps: preset.memory_bandwidth_gbps,
    hourly_price_estimate: hourlyPriceOverride && hourlyPriceOverride > 0 ? hourlyPriceOverride : preset.hourly_price_estimate,
    h2d_gbps: preset.h2d_gbps,
    d2h_gbps: preset.d2h_gbps,
    concurrency: preset.concurrency,
    notes: preset.notes,
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function fmt(value: number, digits = 2) {
  return Number(value || 0).toFixed(digits)
}
