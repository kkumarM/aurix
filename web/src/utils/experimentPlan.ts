/**
 * Advisor Experiment Plan utilities
 * 
 * Helpers to build structured experiment plans from diagnosis results
 * and convert them to actionable benchmark steps.
 */

import { 
  ExperimentPlan, 
  ExperimentStep, 
  ExperimentParameter,
  ExperimentKind 
} from '../types/experimentPlan'

export interface DiagnosisInput {
  primary_bottleneck?: string
  goal?: string
  severity?: string
  confidence?: string
  next_experiments?: string[]
  recommendations?: Array<{ title: string; description: string }>
}

export interface ScenarioInput {
  target?: { concurrency?: number; gpus?: number; name?: string }
  workload?: { batch?: number; rps?: number }
}

export interface RunInput {
  id?: string
  summary?: { throughput?: number; p50_latency_ms?: number; p99_latency_ms?: number }
}

/**
 * Build a structured experiment plan from diagnosis results
 */
export function buildExperimentPlanFromDiagnosis(
  diagnosis: DiagnosisInput | null,
  scenario: ScenarioInput | null,
  run: RunInput | null
): ExperimentPlan {
  const planId = `plan_${Date.now()}`
  const bottleneck = diagnosis?.primary_bottleneck || 'Balanced'
  const goal = diagnosis?.goal || 'balanced'

  const steps = generateExperimentSteps(bottleneck, goal, scenario, run)

  const plan: ExperimentPlan = {
    planId,
    createdAt: new Date(),
    diagnosis: {
      primaryBottleneck: bottleneck,
      goal,
      severity: diagnosis?.severity || 'medium',
      confidence: diagnosis?.confidence || 'medium',
    },
    steps,
    summary: summarizeExperimentPlan({ steps, diagnosis, bottleneck, goal }),
    totalEstimatedDurationMin: calculateTotalEstimatedTime(steps),
    dependencies: buildExperimentDependencies(steps),
  }

  return plan
}

/**
 * Get the primary (most important) experiment from a plan
 */
export function getPrimaryExperiment(plan: ExperimentPlan): ExperimentStep | null {
  if (!plan.steps || plan.steps.length === 0) {
    return null
  }

  // Find highest priority experiment, default to first
  const highPriority = plan.steps.find((s) => s.priority === 'high')
  if (highPriority) return highPriority

  return plan.steps[0] || null
}

/**
 * Create a text summary of an experiment plan
 */
export function summarizeExperimentPlan(input: {
  steps: ExperimentStep[]
  diagnosis?: DiagnosisInput | null
  bottleneck?: string
  goal?: string
}): string {
  const { steps, bottleneck = 'unknown', goal = 'balanced' } = input

  if (steps.length === 0) {
    return `No experiments recommended for ${bottleneck} bottleneck with ${goal} goal.`
  }

  const stepCount = steps.length
  const kindSummary = steps.map((s) => s.kind).join(', ')
  const durationMin = calculateTotalEstimatedTime(steps)

  let summary = `Run ${stepCount} experiment${stepCount > 1 ? 's' : ''} to validate and improve the ${bottleneck} bottleneck.`

  if (durationMin && durationMin > 0) {
    summary += ` Estimated duration: ${durationMin} minutes.`
  }

  summary += ` Steps: ${kindSummary}.`

  return summary
}

// ============================================================================
// Internal helpers
// ============================================================================

function generateExperimentSteps(
  bottleneck: string,
  goal: string,
  scenario: ScenarioInput | null,
  run: RunInput | null
): ExperimentStep[] {
  const steps: ExperimentStep[] = []

  // Map bottleneck to experiment steps
  switch (bottleneck.toLowerCase()) {
    case 'queue-bound':
    case 'queue-bound latency':
      steps.push(...createQueueBoundExperiments(scenario))
      break

    case 'gpu underutilization':
      steps.push(...createUnderutilizationExperiments(scenario))
      break

    case 'gpu compute-bound':
    case 'compute-bound':
      steps.push(...createComputeBoundExperiments(scenario))
      break

    case 'memory pressure':
      steps.push(...createMemoryPressureExperiments(scenario))
      break

    case 'tail latency instability':
      steps.push(...createTailLatencyExperiments(scenario, run))
      break

    case 'dynamic batching disabled':
      steps.push(...createDynamicBatchingExperiments(scenario))
      break

    case 'balanced':
    default:
      // Even balanced systems can benefit from validation
      steps.push(...createValidationExperiments(scenario))
  }

  // Add goal-specific experiments if applicable
  if (goal === 'cost') {
    const costExp = createCostOptimizationExperiment(scenario)
    if (costExp && !steps.some((s) => s.kind === costExp.kind)) {
      steps.push(costExp)
    }
  }

  return steps
}

function createQueueBoundExperiments(scenario: ScenarioInput | null): ExperimentStep[] {
  const currentConcurrency = scenario?.target?.concurrency || 8
  const steps: ExperimentStep[] = []

  steps.push({
    id: `exp_${Date.now()}_concurrency`,
    title: 'Concurrency Sweep',
    description: 'Test different concurrency levels to find optimal queue depth.',
    kind: 'concurrency_sweep',
    reason: 'Queue time is significant; varying concurrency can reduce queue buildup and latency.',
    parameters: [
      {
        name: 'concurrency',
        type: 'range',
        values: [1, 2, 4, 8, 16, 32, Math.max(64, currentConcurrency * 2)],
        description: 'Number of concurrent requests',
      },
    ],
    expectedLearning: 'Optimal concurrency level that minimizes queue time without exceeding GPU capacity.',
    risk: 'Too high concurrency may increase memory pressure or increase p99 latency.',
    status: 'suggested',
    priority: 'high',
    estimatedDurationMin: 10,
  })

  steps.push({
    id: `exp_${Date.now()}_rps`,
    title: 'RPS/Request Rate Sweep',
    description: 'Vary incoming request rate to measure queue buildup patterns.',
    kind: 'rps_sweep',
    reason: 'Understanding how queue grows with load helps set SLA parameters.',
    parameters: [
      {
        name: 'rps',
        type: 'range',
        values: [10, 25, 50, 100, 200],
        description: 'Requests per second',
      },
    ],
    expectedLearning: 'Queue response curve; identify the saturation point.',
    risk: 'Very high RPS may crash or saturate the system.',
    status: 'suggested',
    priority: 'high',
    estimatedDurationMin: 12,
  })

  return steps
}

function createUnderutilizationExperiments(scenario: ScenarioInput | null): ExperimentStep[] {
  const currentConcurrency = scenario?.target?.concurrency || 1
  const steps: ExperimentStep[] = []

  steps.push({
    id: `exp_${Date.now()}_concurrency`,
    title: 'Concurrency Sweep',
    description: 'Increase concurrency to fill GPU during idle periods.',
    kind: 'concurrency_sweep',
    reason: 'GPU is underutilized; more concurrent tasks can improve throughput.',
    parameters: [
      {
        name: 'concurrency',
        type: 'range',
        values: [1, 2, 4, 8, 16, 32],
        description: 'Number of concurrent requests',
      },
    ],
    expectedLearning: 'Concurrency level that maximizes GPU utilization.',
    risk: 'Too much concurrency may increase memory usage or latency.',
    status: 'suggested',
    priority: 'high',
    estimatedDurationMin: 10,
  })

  steps.push({
    id: `exp_${Date.now()}_dynamic_batch`,
    title: 'Dynamic Batching Test',
    description: 'Enable and tune dynamic batching for better utilization.',
    kind: 'dynamic_batching_test',
    reason: 'Dynamic batching can allow the GPU to process multiple small tasks together.',
    parameters: [
      {
        name: 'preferred_batch_sizes',
        type: 'list',
        values: ['[4,8]', '[8,16]', '[16,32]'],
        description: 'Preferred batch size ranges',
      },
      {
        name: 'max_queue_delay_us',
        type: 'range',
        values: [100, 500, 1000, 5000],
        description: 'Max queue delay in microseconds',
      },
    ],
    expectedLearning: 'Optimal batch configuration for GPU utilization and latency.',
    risk: 'Batch waiting time may increase latency; tuning trade-off is needed.',
    status: 'suggested',
    priority: 'medium',
    estimatedDurationMin: 15,
  })

  return steps
}

function createComputeBoundExperiments(scenario: ScenarioInput | null): ExperimentStep[] {
  const steps: ExperimentStep[] = []

  steps.push({
    id: `exp_${Date.now()}_precision`,
    title: 'Precision Comparison',
    description: 'Test lower precision (fp16, int8) vs current precision.',
    kind: 'precision_compare',
    reason: 'Lower precision can reduce compute time with minimal model quality loss.',
    parameters: [
      {
        name: 'precision',
        type: 'list',
        values: ['fp32', 'fp16', 'int8'],
        description: 'Data type precision',
      },
    ],
    expectedLearning: 'Speedup and quality impact of precision reduction.',
    risk: 'Model accuracy may degrade; quality validation required.',
    status: 'suggested',
    priority: 'high',
    estimatedDurationMin: 12,
  })

  steps.push({
    id: `exp_${Date.now()}_gpu_compare`,
    title: 'GPU Comparison',
    description: 'Compare compute time across different GPU models.',
    kind: 'gpu_compare',
    reason: 'Different GPUs have different compute throughput; newer GPUs may improve latency.',
    parameters: [
      {
        name: 'gpu_type',
        type: 'list',
        values: ['H100', 'A100', 'L40S'],
        description: 'GPU model to test',
      },
    ],
    expectedLearning: 'Compute speedup and cost-benefit of GPU upgrade.',
    risk: 'Newer GPUs may have higher cost; ROI varies by workload.',
    status: 'suggested',
    priority: 'medium',
    estimatedDurationMin: 20,
  })

  return steps
}

function createMemoryPressureExperiments(scenario: ScenarioInput | null): ExperimentStep[] {
  const currentBatch = scenario?.workload?.batch || 32
  const steps: ExperimentStep[] = []

  steps.push({
    id: `exp_${Date.now()}_batch_size`,
    title: 'Batch Size Reduction',
    description: 'Test lower batch sizes to reduce peak memory usage.',
    kind: 'batch_size_sweep',
    reason: 'Reducing batch size can free GPU memory and prevent OOM.',
    parameters: [
      {
        name: 'batch_size',
        type: 'range',
        values: [1, 2, 4, 8, 16, Math.max(32, Math.floor(currentBatch / 2))],
        description: 'Batch size per request',
      },
    ],
    expectedLearning: 'Maximum safe batch size with current GPU memory.',
    risk: 'Smaller batches may reduce throughput; latency trade-off.',
    status: 'suggested',
    priority: 'high',
    estimatedDurationMin: 10,
  })

  return steps
}

function createTailLatencyExperiments(scenario: ScenarioInput | null, run: RunInput | null): ExperimentStep[] {
  const steps: ExperimentStep[] = []

  steps.push({
    id: `exp_${Date.now()}_rps`,
    title: 'RPS Sweep for Tail Latency',
    description: 'Measure tail latency (p99) under various load levels.',
    kind: 'rps_sweep',
    reason: 'Tail latency may be affected by queuing under load.',
    parameters: [
      {
        name: 'rps',
        type: 'range',
        values: [10, 25, 50, 100],
        description: 'Requests per second',
      },
    ],
    expectedLearning: 'Tail latency stability; identify load where p99 exceeds SLA.',
    risk: 'High load may expose system limits.',
    status: 'suggested',
    priority: 'high',
    estimatedDurationMin: 12,
  })

  steps.push({
    id: `exp_${Date.now()}_calibration`,
    title: 'Trace Calibration & Analysis',
    description: 'Capture detailed traces to identify where tail latency originates.',
    kind: 'trace_calibration',
    reason: 'Understanding whether tail is from queue, compute, or resource contention.',
    parameters: [
      {
        name: 'trace_percentile',
        type: 'single',
        values: ['p99'],
        description: 'Percentile to focus on',
      },
    ],
    expectedLearning: 'Root cause of tail latency; actionable optimization targets.',
    risk: 'Tracing adds overhead; should run on canary replicas.',
    status: 'suggested',
    priority: 'medium',
    estimatedDurationMin: 15,
    notes: 'Run on a single replica with Nsight Systems or similar.',
  })

  return steps
}

function createDynamicBatchingExperiments(scenario: ScenarioInput | null): ExperimentStep[] {
  const steps: ExperimentStep[] = []

  steps.push({
    id: `exp_${Date.now()}_dynamic_batch`,
    title: 'Dynamic Batching Enablement',
    description: 'Enable dynamic batching and find optimal batch size.',
    kind: 'dynamic_batching_test',
    reason: 'Dynamic batching can improve throughput with minimal latency impact.',
    parameters: [
      {
        name: 'preferred_batch_sizes',
        type: 'list',
        values: ['[4,8]', '[8,16]', '[16,32]'],
        description: 'Preferred batch sizes',
      },
      {
        name: 'max_queue_delay_us',
        type: 'range',
        values: [100, 500, 1000],
        description: 'Maximum queue delay',
      },
    ],
    expectedLearning: 'Throughput gain; latency penalty trade-off curve.',
    risk: 'May increase p99 latency if queue delays are too long.',
    status: 'suggested',
    priority: 'high',
    estimatedDurationMin: 15,
  })

  return steps
}

function createValidationExperiments(scenario: ScenarioInput | null): ExperimentStep[] {
  const steps: ExperimentStep[] = []

  steps.push({
    id: `exp_${Date.now()}_rps`,
    title: 'RPS Sweep Validation',
    description: 'Validate performance across a range of request rates.',
    kind: 'rps_sweep',
    reason: 'Even balanced workloads benefit from load validation.',
    parameters: [
      {
        name: 'rps',
        type: 'range',
        values: [10, 50, 100],
        description: 'Requests per second',
      },
    ],
    expectedLearning: 'Performance curve; saturation point.',
    risk: 'Minimal; validation step.',
    status: 'suggested',
    priority: 'low',
    estimatedDurationMin: 8,
  })

  return steps
}

function createCostOptimizationExperiment(scenario: ScenarioInput | null): ExperimentStep | null {
  return {
    id: `exp_${Date.now()}_gpu_compare`,
    title: 'GPU Cost Optimization',
    description: 'Compare different GPU models for cost-performance tradeoff.',
    kind: 'gpu_compare',
    reason: 'Cost goal prioritizes finding the cheapest GPU that meets SLA.',
    parameters: [
      {
        name: 'gpu_type',
        type: 'list',
        values: ['L40S', 'A100', 'H100'],
        description: 'GPU model',
      },
    ],
    expectedLearning: 'Cost-performance Pareto frontier; best GPU for cost.',
    risk: 'Newer GPUs may be unavailable in your region.',
    status: 'suggested',
    priority: 'high',
    estimatedDurationMin: 20,
  }
}

function calculateTotalEstimatedTime(steps: ExperimentStep[]): number {
  return steps.reduce((sum, step) => sum + (step.estimatedDurationMin || 0), 0)
}

function buildExperimentDependencies(
  steps: ExperimentStep[]
): Record<string, string[]> {
  const deps: Record<string, string[]> = {}

  // Most experiments are independent; add specific dependencies as needed
  // Example: GPU compare might depend on completing concurrency sweep first
  steps.forEach((step) => {
    if (step.kind === 'gpu_compare' && steps.some((s) => s.kind === 'concurrency_sweep')) {
      const concurrencyStep = steps.find((s) => s.kind === 'concurrency_sweep')
      if (concurrencyStep) {
        deps[step.id] = [concurrencyStep.id]
      }
    }
  })

  return Object.keys(deps).length > 0 ? deps : {}
}
