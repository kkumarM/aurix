package sim

import (
	"testing"

	"simulator/pkg/schema"
)

func TestCompareRuns(t *testing.T) {
	base := schema.Summary{
		Throughput:     10.0,
		P50LatencyMS:   100.0,
		P90LatencyMS:   150.0,
		P99LatencyMS:   200.0,
		AvgQueueMS:     10.0,
		GPUUtilization: 50.0,
	}

	compare := schema.Summary{
		Throughput:     15.0,
		P50LatencyMS:   90.0,
		P90LatencyMS:   140.0,
		P99LatencyMS:   180.0,
		AvgQueueMS:     5.0,
		GPUUtilization: 75.0,
	}

	res := CompareRuns(base, compare, "run1", "run2")

	if res.BaseRunID != "run1" || res.CompareRunID != "run2" {
		t.Errorf("expected run IDs to match")
	}

	if res.DeltaThroughput != 5.0 {
		t.Errorf("expected DeltaThroughput 5.0, got %f", res.DeltaThroughput)
	}
	if res.DeltaP99 != -20.0 {
		t.Errorf("expected DeltaP99 -20.0, got %f", res.DeltaP99)
	}
	if res.PctThroughput != 50.0 {
		t.Errorf("expected PctThroughput 50.0, got %f", res.PctThroughput)
	}
	if res.PctP99 != -10.0 {
		t.Errorf("expected PctP99 -10.0, got %f", res.PctP99)
	}
}

func TestCompareRuns_ZeroBase(t *testing.T) {
	base := schema.Summary{
		Throughput:   0.0,
		P99LatencyMS: 0.0,
	}

	compare := schema.Summary{
		Throughput:   15.0,
		P99LatencyMS: 180.0,
	}

	res := CompareRuns(base, compare, "run1", "run2")

	if res.PctThroughput != 0.0 {
		t.Errorf("expected PctThroughput 0.0 when base is 0, got %f", res.PctThroughput)
	}
	if res.PctP99 != 0.0 {
		t.Errorf("expected PctP99 0.0 when base is 0, got %f", res.PctP99)
	}
}
