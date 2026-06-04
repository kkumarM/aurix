package agent

import (
	"strings"
	"testing"
)

func TestDiagnoseGPUUnderutilization(t *testing.T) {
	req := DiagnosisRequest{
		Source: "simulation",
		Goal:   "throughput",
		Benchmark: &Benchmark{
			Throughput:    40,
			P50LatencyMS:  30,
			P95LatencyMS:  35,
			P99LatencyMS:  45,
			QueueTimeMS:   4,
			ComputeTimeMS: 22,
			BatchSize:     1,
			Concurrency:   1,
		},
		GPU: &GPUInfo{
			UtilizationPercent: 38,
			MemoryUsedMB:       4000,
			MemoryTotalMB:      16000,
		},
		ModelConfig: &ModelConfig{DynamicBatchingEnabled: false},
	}
	res := DiagnoseRequest(req)
	if res.PrimaryBottleneck != "GPU underutilization" {
		t.Fatalf("expected GPU underutilization, got %q", res.PrimaryBottleneck)
	}
	if !strings.Contains(strings.Join(extractTitles(res.Recommendations), " "), "Increase concurrency") {
		t.Fatal("expected concurrency recommendation")
	}
}

func TestDiagnoseQueueBoundLatency(t *testing.T) {
	req := DiagnosisRequest{
		Source: "simulation",
		Goal:   "balanced",
		Benchmark: &Benchmark{
			Throughput:    30,
			P50LatencyMS:  60,
			P95LatencyMS:  85,
			P99LatencyMS:  110,
			QueueTimeMS:   45,
			ComputeTimeMS: 40,
		},
		GPU: &GPUInfo{UtilizationPercent: 70, MemoryUsedMB: 8000, MemoryTotalMB: 16000},
	}
	res := DiagnoseRequest(req)
	if res.PrimaryBottleneck != "Queue-bound" {
		t.Fatalf("expected Queue-bound, got %q", res.PrimaryBottleneck)
	}
	if !strings.Contains(strings.Join(extractTitles(res.Recommendations), " "), "Reduce queue delay") {
		t.Fatal("expected queue delay recommendation")
	}
}

func TestDiagnoseComputeBoundWorkload(t *testing.T) {
	req := DiagnosisRequest{
		Source: "simulation",
		Goal:   "throughput",
		Benchmark: &Benchmark{
			Throughput:    25,
			P50LatencyMS:  80,
			P95LatencyMS:  90,
			P99LatencyMS:  100,
			QueueTimeMS:   10,
			ComputeTimeMS: 65,
		},
		GPU: &GPUInfo{UtilizationPercent: 78, MemoryUsedMB: 6000, MemoryTotalMB: 16000},
	}
	res := DiagnoseRequest(req)
	if res.PrimaryBottleneck != "GPU compute-bound" {
		t.Fatalf("expected GPU compute-bound, got %q", res.PrimaryBottleneck)
	}
	if !strings.Contains(strings.Join(extractTitles(res.Recommendations), " "), "Optimize precision") {
		t.Fatal("expected precision recommendation")
	}
}

func TestDiagnoseMemoryPressure(t *testing.T) {
	req := DiagnosisRequest{
		Source: "simulation",
		Goal:   "balanced",
		Benchmark: &Benchmark{
			Throughput:    15,
			P50LatencyMS:  100,
			P95LatencyMS:  120,
			P99LatencyMS:  130,
			QueueTimeMS:   20,
			ComputeTimeMS: 90,
		},
		GPU: &GPUInfo{UtilizationPercent: 92, MemoryUsedMB: 14800, MemoryTotalMB: 16000},
	}
	res := DiagnoseRequest(req)
	if res.PrimaryBottleneck != "Memory pressure" {
		t.Fatalf("expected Memory pressure, got %q", res.PrimaryBottleneck)
	}
	if res.Severity != "high" {
		t.Fatalf("expected high severity, got %q", res.Severity)
	}
	if !strings.Contains(strings.Join(res.ProductionNotes, " "), "OOM risk") {
		t.Fatal("expected OOM risk production note")
	}
}

func TestDiagnoseTailLatencyInstability(t *testing.T) {
	req := DiagnosisRequest{
		Source: "simulation",
		Goal:   "latency",
		Benchmark: &Benchmark{
			Throughput:    20,
			P50LatencyMS:  35,
			P95LatencyMS:  70,
			P99LatencyMS:  80,
			QueueTimeMS:   15,
			ComputeTimeMS: 40,
		},
		GPU: &GPUInfo{UtilizationPercent: 65, MemoryUsedMB: 7000, MemoryTotalMB: 16000},
	}
	res := DiagnoseRequest(req)
	if res.PrimaryBottleneck != "Tail latency instability" {
		t.Fatalf("expected Tail latency instability, got %q", res.PrimaryBottleneck)
	}
	if !strings.Contains(strings.Join(extractTitles(res.Recommendations), " "), "Stress test") {
		t.Fatal("expected stress test recommendation")
	}
}

func TestDiagnoseMissingMetrics(t *testing.T) {
	req := DiagnosisRequest{
		Source: "simulation",
		Goal:   "cost",
		Benchmark: &Benchmark{
			Throughput: 60,
		},
		GPU: &GPUInfo{UtilizationPercent: 45},
	}
	res := DiagnoseRequest(req)
	if res.Confidence != "low" && res.Confidence != "medium" {
		t.Fatalf("expected low or medium confidence, got %q", res.Confidence)
	}
	if len(res.MissingData) == 0 {
		t.Fatal("expected missing_data warnings")
	}
	if res.PrimaryBottleneck == "" {
		t.Fatal("expected a valid primary bottleneck even with missing data")
	}
}

func extractTitles(recs []Recommendation) []string {
	titles := make([]string, 0, len(recs))
	for _, rec := range recs {
		titles = append(titles, rec.Title)
	}
	return titles
}
