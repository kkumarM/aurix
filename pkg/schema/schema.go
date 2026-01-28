package schema

// StageKind enumerates stage timing models.
type StageKind string

const (
	StageFixedMs StageKind = "fixed_ms"
	StageBytes   StageKind = "bytes"
	StageTokens  StageKind = "tokens"
)

// Stage describes a step in the pipeline.
type Stage struct {
	Name  string    `json:"name"`
	Kind  StageKind `json:"kind"`
	Value float64   `json:"value"` // ms for fixed_ms, bytes for bytes, tokens for tokens
}

// Workload describes incoming request pattern and payload sizes.
type Workload struct {
	Name     string  `json:"name"`
	RPS      float64 `json:"rps"`
	Duration float64 `json:"duration_s"`
	Batch    int     `json:"batch_size"`
}

// GPUProfile captures target hardware capabilities.
type GPUProfile struct {
	Name        string  `json:"name"`
	TFLOPS      float64 `json:"tflops"`       // peak FP32
	MemGBps     float64 `json:"mem_gbps"`     // memory bandwidth
	TokenCost   float64 `json:"ms_per_token"` // per-token cost heuristic
	H2DBandwGB  float64 `json:"h2d_gbps"`     // host-to-device
	D2HBandwGB  float64 `json:"d2h_gbps"`     // device-to-host
	Concurrency int     `json:"concurrency"`  // max concurrent compute slots
}

// Scenario defines everything needed to simulate a run.
type Scenario struct {
	Name     string     `json:"name"`
	Workload Workload   `json:"workload"`
	Pipeline []Stage    `json:"pipeline"`
	Target   GPUProfile `json:"target"`
}

// RunResult summarizes a simulation execution.
type RunResult struct {
	RunID       string            `json:"run_id"`
	ScenarioID  string            `json:"scenario_id,omitempty"`
	Summary     Summary           `json:"summary"`
	TracePath   string            `json:"trace_path,omitempty"`
	TraceInline []byte            `json:"trace_inline,omitempty"`
	Metadata    map[string]string `json:"metadata,omitempty"`
}

// Summary provides top-line metrics.
type Summary struct {
	Throughput     float64 `json:"throughput_rps"`
	P50LatencyMS   float64 `json:"p50_ms"`
	P90LatencyMS   float64 `json:"p90_ms"`
	P99LatencyMS   float64 `json:"p99_ms"`
	AvgQueueMS     float64 `json:"avg_queue_ms"`
	GPUUtilization float64 `json:"gpu_util_percent"`
	TotalRequests  int     `json:"total_requests"`
	DurationS      float64 `json:"duration_s"`
}
