/**
 * Advisor Experiment Plan types
 * 
 * Represents structured benchmark experiments recommended by gPARX Advisor
 * based on diagnosis of performance bottlenecks.
 */

export type ExperimentKind =
  | 'rps_sweep'
  | 'concurrency_sweep'
  | 'gpu_compare'
  | 'batch_size_sweep'
  | 'precision_compare'
  | 'dynamic_batching_test'
  | 'trace_calibration'
  | 'manual_followup'

export type ExperimentStatus = 'suggested' | 'ready' | 'running' | 'completed' | 'skipped'

export type ExperimentParameter = {
  name: string
  type: 'range' | 'list' | 'single'
  values: (string | number)[]
  description?: string
}

export type ExperimentStep = {
  id: string
  title: string
  description: string
  kind: ExperimentKind
  reason: string
  parameters: ExperimentParameter[]
  expectedLearning: string
  risk: string
  status: ExperimentStatus
  priority?: 'high' | 'medium' | 'low'
  estimatedDurationMin?: number
  notes?: string
}

export type ExperimentPlan = {
  planId: string
  createdAt: Date
  diagnosis: {
    primaryBottleneck: string
    goal: string
    severity: string
    confidence: string
  }
  steps: ExperimentStep[]
  summary: string
  totalEstimatedDurationMin?: number
  dependencies?: Record<string, string[]>
}
