package scheduler

import "simulator/pkg/cluster"

// Metrics summarizes scheduling outcomes and resource utilization.
type Metrics struct {
	TotalPods        int `json:"totalPods"`
	ScheduledPods    int `json:"scheduledPods"`
	UnscheduledPods  int `json:"unscheduledPods"`
	CPUCapacityMilli int `json:"cpuCapacityMilli"`
	CPUUsedMilli     int `json:"cpuUsedMilli"`
	MemCapacityMB    int `json:"memCapacityMB"`
	MemUsedMB        int `json:"memUsedMB"`
	GPUCapacity      int `json:"gpuCapacity"`
	GPUUsed          int `json:"gpuUsed"`
}

// ComputeMetrics derives overall metrics from the final cluster state and decisions.
func ComputeMetrics(final *cluster.Cluster, decisions []Decision) Metrics {
	var m Metrics
	m.TotalPods = len(decisions)
	for _, d := range decisions {
		if d.Node == "" {
			m.UnscheduledPods++
		} else {
			m.ScheduledPods++
		}
	}

	for i := range final.Nodes {
		n := final.Nodes[i]
		m.CPUCapacityMilli += n.Capacity.CPUMilli
		m.MemCapacityMB += n.Capacity.MemoryMB
		m.GPUCapacity += n.Capacity.GPUs

		m.CPUUsedMilli += n.Allocated.CPUMilli
		m.MemUsedMB += n.Allocated.MemoryMB
		m.GPUUsed += n.Allocated.GPUs
	}

	return m
}
