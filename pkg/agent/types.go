package agent

type DiagnosisRequest struct {
	Source      string       `json:"source,omitempty"`
	Goal        string       `json:"goal,omitempty"`
	Benchmark   *Benchmark   `json:"benchmark,omitempty"`
	GPU         *GPUInfo     `json:"gpu,omitempty"`
	ModelConfig *ModelConfig `json:"model_config,omitempty"`
	SLA         *SLA         `json:"sla,omitempty"`
	Cost        *Cost        `json:"cost,omitempty"`
}

type Benchmark struct {
	Throughput     float64 `json:"throughput,omitempty"`
	P50LatencyMS   float64 `json:"p50_latency_ms,omitempty"`
	P95LatencyMS   float64 `json:"p95_latency_ms,omitempty"`
	P99LatencyMS   float64 `json:"p99_latency_ms,omitempty"`
	QueueTimeMS    float64 `json:"queue_time_ms,omitempty"`
	ComputeTimeMS  float64 `json:"compute_time_ms,omitempty"`
	TransferTimeMS float64 `json:"transfer_time_ms,omitempty"`
	CPUTimeMS      float64 `json:"cpu_time_ms,omitempty"`
	BatchSize      float64 `json:"batch_size,omitempty"`
	Concurrency    float64 `json:"concurrency,omitempty"`
}

type GPUInfo struct {
	Name               string  `json:"name,omitempty"`
	UtilizationPercent float64 `json:"utilization_percent,omitempty"`
	MemoryUsedMB       float64 `json:"memory_used_mb,omitempty"`
	MemoryTotalMB      float64 `json:"memory_total_mb,omitempty"`
	PowerWatts         float64 `json:"power_watts,omitempty"`
}

type ModelConfig struct {
	ModelName                 string `json:"model_name,omitempty"`
	Backend                   string `json:"backend,omitempty"`
	DynamicBatchingEnabled    bool   `json:"dynamic_batching_enabled,omitempty"`
	PreferredBatchSize        []int  `json:"preferred_batch_size,omitempty"`
	MaxQueueDelayMicroseconds int    `json:"max_queue_delay_microseconds,omitempty"`
	InstanceCount             int    `json:"instance_count,omitempty"`
	Precision                 string `json:"precision,omitempty"`
}

type SLA struct {
	TargetP99LatencyMS float64 `json:"target_p99_latency_ms,omitempty"`
	TargetThroughput   float64 `json:"target_throughput,omitempty"`
}

type Cost struct {
	GPUHourlyPrice          float64 `json:"gpu_hourly_price,omitempty"`
	DeploymentHoursPerMonth float64 `json:"deployment_hours_per_month,omitempty"`
}

type Recommendation struct {
	Title          string `json:"title"`
	Description    string `json:"description"`
	ExpectedImpact string `json:"expected_impact"`
	Risk           string `json:"risk"`
}

type FutureLLMContext struct {
	SystemFacts       []string `json:"system_facts"`
	SafePromptContext string   `json:"safe_prompt_context"`
}

type DiagnosisResponse struct {
	AdvisorVersion       string           `json:"advisor_version"`
	Source               string           `json:"source"`
	Goal                 string           `json:"goal"`
	PrimaryBottleneck    string           `json:"primary_bottleneck"`
	SecondaryBottlenecks []string         `json:"secondary_bottlenecks"`
	Severity             string           `json:"severity"`
	Confidence           string           `json:"confidence"`
	Summary              string           `json:"summary"`
	Evidence             []string         `json:"evidence"`
	Recommendations      []Recommendation `json:"recommendations"`
	NextExperiments      []string         `json:"next_experiments"`
	ProductionNotes      []string         `json:"production_notes"`
	MissingData          []string         `json:"missing_data"`
	FutureLLMContext     FutureLLMContext `json:"future_llm_context"`
}

type PerformanceContext struct {
	Source      string
	Goal        string
	Benchmark   Benchmark
	GPU         GPUInfo
	ModelConfig ModelConfig
	SLA         SLA
	Cost        Cost
}
