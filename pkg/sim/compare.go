package sim

import "simulator/pkg/schema"

// CompareRuns computes the difference between a base run and a comparison run.
// It returns a RunComparison struct with absolute deltas and percentage changes.
func CompareRuns(base, compare schema.Summary, baseID, compareID string) schema.RunComparison {
	res := schema.RunComparison{
		BaseRunID:       baseID,
		CompareRunID:    compareID,
		DeltaThroughput: compare.Throughput - base.Throughput,
		DeltaP50:        compare.P50LatencyMS - base.P50LatencyMS,
		DeltaP90:        compare.P90LatencyMS - base.P90LatencyMS,
		DeltaP99:        compare.P99LatencyMS - base.P99LatencyMS,
		DeltaQueue:      compare.AvgQueueMS - base.AvgQueueMS,
		DeltaGPUUtil:    compare.GPUUtilization - base.GPUUtilization,
	}

	if base.Throughput > 0 {
		res.PctThroughput = (res.DeltaThroughput / base.Throughput) * 100.0
	}
	if base.P99LatencyMS > 0 {
		res.PctP99 = (res.DeltaP99 / base.P99LatencyMS) * 100.0
	}

	return res
}
