# Kubernetes GPU Simulator (local-only)

A lightweight, offline simulator that mimics scheduling pods onto a Kubernetes-like cluster with GPU-aware placement. No cloud APIs or networking are required; everything runs locally against JSON inputs.

## Prerequisites
- Go 1.21+ (builds are local only; no external dependencies are fetched)

## Project layout
- `cmd/simulator/main.go` – CLI entry point
- `pkg/cluster` – node/resource models and JSON loader
- `pkg/workload` – pod workload models and JSON loader
- `pkg/scheduler` – simple GPU-aware scheduler (packs GPU pods on GPU nodes; prefers non-GPU nodes for general workloads)
- `configs/*.json` – example cluster and workload definitions

## Run
```sh
cd /home/karthik/simulator
# build (offline)
go build ./cmd/simulator
./simulator \
  -cluster configs/cluster.example.json \
  -workload configs/workload.example.json \
  -strategy binpack \
  -state \
  -metrics \
  -metrics-json metrics.json
```
Flags:
- `-cluster` path to a cluster JSON file
- `-workload` path to workload JSON file
- `-strategy` `binpack` (default) to concentrate pods, or `spread` to balance usage
- `-state` print final node utilization after scheduling
- `-metrics` print aggregate scheduling/utilization metrics (default true)
- `-metrics-json` write metrics to a JSON file for later visualization
- `-generate-cluster` synthesize a cluster file before running. Example: `nodes=4,gpuNodes=2,gpuType=A100,gpuMemMB=80000,gpuCount=4,cpu=16000,memMB=65536,cpuGPU=32000,memGPUMB=131072`
- `-generate-workload` synthesize a workload file. Example: `pods=50,gpuPods=20,gpuType=A100,gpuMemMB=40000,gpuCount=1,cpu=500-4000,memMB=512-8192,priority=1-100`

## Input formats
Cluster (`configs/cluster.example.json`):
```json
{
  "nodes": [
    {
      "name": "gpu-a",
      "capacity": {"cpuMilli": 32000, "memoryMB": 131072, "gpus": 4},
      "gpu": {"type": "A100", "memoryMB": 80000, "count": 4}
    }
  ]
}
```

Workload (`configs/workload.example.json`):
```json
{
  "pods": [
    {
      "name": "trainer-0",
      "namespace": "ml",
      "priority": 100,
      "gpuType": "A100",
      "gpuMemoryMB": 60000,
      "resources": {"cpuMilli": 4000, "memoryMB": 8192, "gpus": 1}
    }
  ]
}
```

## Notes
- The scheduler is intentionally simple: GPU pods must land on GPU-capable nodes; CPU-only pods prefer nodes without GPUs to preserve accelerators.
- Pod `priority` (higher first) is supported; pods with the same priority keep a stable alphabetical order.
- All logic uses only the Go standard library so it can run completely offline.
- Extend `pkg/scheduler` to experiment with spreading, binpacking, or custom constraints.
- Metrics are computed post-schedule so you can graph them with your favorite local tool (e.g., `jq` + `gnuplot`).
- GPU matching honors node `gpu.type` and `gpu.memoryMB` when a pod requests `gpuType`/`gpuMemoryMB`.
