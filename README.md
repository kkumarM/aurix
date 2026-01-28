# GPU Workload Simulator

End-to-end simulator with Go backend and React/Tailwind web UI. It models request pipelines (preprocess → h2d → compute → d2h → postprocess), queueing, and GPU bandwidth/compute constraints, and emits Chrome trace JSON for visualization.

## Requirements
- Go (1.18 in this environment; code targets 1.22 features lightly)
- Node 18+ / npm for the web UI

## Run backend
```sh
make build          # builds bin/sim-api
./bin/sim-api       # serves on :8080
```
Or during development:
```sh
make dev            # runs web dev server (:5173) and backend (:8080)
```

## API (sim-api)
- `POST /v1/scenarios` → `{scenario_id}`
- `GET  /v1/scenarios/{id}` → scenario JSON
- `POST /v1/runs` with `{ "scenario_id": "..." }` or `{ "scenario": { ... } }` → `{ run_id, summary, artifacts.trace }`
- `GET  /v1/runs/{id}` → run summary
- `GET  /v1/runs/{id}/trace` → Chrome trace JSON

### Example scenario JSON
```json
{
  "name": "demo",
  "workload": { "name": "wl", "rps": 2, "duration_s": 10, "batch_size": 1 },
  "target": {
    "name": "L40",
    "tflops": 180,
    "mem_gbps": 3000,
    "ms_per_token": 0.2,
    "h2d_gbps": 32,
    "d2h_gbps": 32,
    "concurrency": 4
  },
  "pipeline": [
    { "name": "preprocess", "kind": "fixed_ms", "value": 2 },
    { "name": "h2d", "kind": "bytes", "value": 8388608 },
    { "name": "compute", "kind": "tokens", "value": 128 },
    { "name": "d2h", "kind": "bytes", "value": 2097152 },
    { "name": "postprocess", "kind": "fixed_ms", "value": 1 }
  ]
}
```

### Curl quickstart
```sh
curl -X POST http://localhost:8080/v1/runs \
  -H 'Content-Type: application/json' \
  -d @scenario.json
curl http://localhost:8080/v1/runs/run-20240101.../trace -o trace.json
```
Open `trace.json` in Chrome/Perfetto (chrome://tracing).

## Web UI
Located in `web/` (Vite + React + Tailwind). It lets you build a scenario, start a run, view summary metrics, and download `trace.json`.
- Dev: `npm install` then `npm run dev` in `web/` (or `make dev`).
- Build: `npm run build` in `web/`.

## Optional profiler agent (stub)
To be added later; CLI skeleton can ingest Nsight outputs and convert to traces/metrics.

## Tests
```sh
make test   # go test ./...
```
