package bench

// Profile captures summarized resource usage during a benchmark run.
type Profile struct {
	Command           string  `json:"command"`
	DurationSec       float64 `json:"durationSec"`
	SampleIntervalSec float64 `json:"sampleIntervalSec"`

	CPUAvgMilli  float64 `json:"cpuAvgMilli"`
	CPUPeakMilli float64 `json:"cpuPeakMilli"`
	MemAvgMB     float64 `json:"memAvgMB"`
	MemPeakMB    float64 `json:"memPeakMB"`

	GPUType      string  `json:"gpuType,omitempty"`
	GPUAvgUtil   float64 `json:"gpuAvgUtil,omitempty"`  // percent
	GPUPeakUtil  float64 `json:"gpuPeakUtil,omitempty"` // percent
	GPUAvgMemMB  float64 `json:"gpuAvgMemMB,omitempty"`
	GPUPeakMemMB float64 `json:"gpuPeakMemMB,omitempty"`
}
