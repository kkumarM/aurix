export type GPUPreset = {
  id: string
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

export const gpuPresets: GPUPreset[] = [
  {
    id: 'l4',
    name: 'L4',
    memory_gb: 24,
    fp16_tflops_est: 30,
    memory_bandwidth_gbps: 300,
    hourly_price_estimate: 0.8,
    h2d_gbps: 28,
    d2h_gbps: 28,
    concurrency: 2,
    notes: 'Estimate for planning only. Real hosting prices vary by provider and region.',
  },
  {
    id: 'a10g',
    name: 'A10G',
    memory_gb: 24,
    fp16_tflops_est: 60,
    memory_bandwidth_gbps: 600,
    hourly_price_estimate: 1.2,
    h2d_gbps: 32,
    d2h_gbps: 32,
    concurrency: 2,
    notes: 'Balanced planning preset for common mid-tier inference deployments.',
  },
  {
    id: 'l40s',
    name: 'L40S',
    memory_gb: 48,
    fp16_tflops_est: 91,
    memory_bandwidth_gbps: 864,
    hourly_price_estimate: 2.4,
    h2d_gbps: 40,
    d2h_gbps: 40,
    concurrency: 3,
    notes: 'Use for Ada-class datacenter planning estimates.',
  },
  {
    id: 'a100-40gb',
    name: 'A100 40GB',
    memory_gb: 40,
    fp16_tflops_est: 155,
    memory_bandwidth_gbps: 1555,
    hourly_price_estimate: 2.8,
    h2d_gbps: 80,
    d2h_gbps: 80,
    concurrency: 4,
    notes: 'Estimate for NVLink/PCIe-class A100 inference planning.',
  },
  {
    id: 'a100-80gb',
    name: 'A100 80GB',
    memory_gb: 80,
    fp16_tflops_est: 195,
    memory_bandwidth_gbps: 1935,
    hourly_price_estimate: 3.6,
    h2d_gbps: 80,
    d2h_gbps: 80,
    concurrency: 5,
    notes: 'Larger memory pool helps bigger dense models and higher concurrency.',
  },
  {
    id: 'h100',
    name: 'H100',
    memory_gb: 80,
    fp16_tflops_est: 260,
    memory_bandwidth_gbps: 3000,
    hourly_price_estimate: 5.5,
    h2d_gbps: 100,
    d2h_gbps: 100,
    concurrency: 6,
    notes: 'High-end planning preset for premium production deployments.',
  },
  {
    id: 'rtx-4090',
    name: 'RTX 4090',
    memory_gb: 24,
    fp16_tflops_est: 82,
    memory_bandwidth_gbps: 1008,
    hourly_price_estimate: 1,
    h2d_gbps: 32,
    d2h_gbps: 32,
    concurrency: 2,
    notes: 'Consumer GPU estimate for local or individual evaluation workflows.',
  },
]

export const gpuPresetMap = Object.fromEntries(gpuPresets.map((preset) => [preset.id, preset]))
