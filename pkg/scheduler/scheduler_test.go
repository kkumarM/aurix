package scheduler

import (
	"strings"
	"testing"

	"simulator/pkg/cluster"
	"simulator/pkg/workload"
)

func TestPriorityAndBinpackOrdering(t *testing.T) {
	c := &cluster.Cluster{Nodes: []cluster.Node{
		{Name: "gpu-a", Capacity: cluster.Resource{CPUMilli: 8000, MemoryMB: 16000, GPUs: 1}, GPU: cluster.GPU{Type: "A100", MemoryMB: 80000, Count: 1}},
		{Name: "cpu-a", Capacity: cluster.Resource{CPUMilli: 8000, MemoryMB: 16000, GPUs: 0}},
	}}

	pods := []workload.Pod{
		{Name: "low", Priority: 1, Requests: cluster.Resource{CPUMilli: 500, MemoryMB: 500}},
		{Name: "gpu-high", Priority: 10, Requests: cluster.Resource{CPUMilli: 2000, MemoryMB: 2000, GPUs: 1}},
		{Name: "mid", Priority: 5, Requests: cluster.Resource{CPUMilli: 1000, MemoryMB: 1000}},
	}

	decisions, final := Run(c, pods, Binpack)

	if decisions[0].Pod.Name != "gpu-high" || decisions[0].Node != "gpu-a" {
		t.Fatalf("expected gpu-high to schedule first on gpu-a, got %+v", decisions[0])
	}
	if decisions[1].Pod.Name != "mid" {
		t.Fatalf("expected mid priority second, got %+v", decisions[1])
	}
	if decisions[2].Node != "cpu-a" {
		t.Fatalf("expected low priority pod to prefer cpu-a, got %s", decisions[2].Node)
	}

	if final.Nodes[0].Allocated.GPUs != 1 {
		t.Fatalf("gpu allocation not recorded on gpu-a: %+v", final.Nodes[0].Allocated)
	}
}

func TestSpreadDistributesPods(t *testing.T) {
	c := &cluster.Cluster{Nodes: []cluster.Node{
		{Name: "cpu-a", Capacity: cluster.Resource{CPUMilli: 4000, MemoryMB: 8000}},
		{Name: "cpu-b", Capacity: cluster.Resource{CPUMilli: 4000, MemoryMB: 8000}},
	}}

	pods := []workload.Pod{
		{Name: "p1", Requests: cluster.Resource{CPUMilli: 2000, MemoryMB: 1000}},
		{Name: "p2", Requests: cluster.Resource{CPUMilli: 2000, MemoryMB: 1000}},
	}

	decisions, _ := Run(c, pods, Spread)

	if decisions[0].Node == decisions[1].Node {
		t.Fatalf("spread should distribute pods, got both on %s", decisions[0].Node)
	}
}

func TestComputeMetrics(t *testing.T) {
	c := &cluster.Cluster{Nodes: []cluster.Node{
		{Name: "n1", Capacity: cluster.Resource{CPUMilli: 4000, MemoryMB: 8000, GPUs: 1}, Allocated: cluster.Resource{CPUMilli: 2000, MemoryMB: 1000, GPUs: 1}},
		{Name: "n2", Capacity: cluster.Resource{CPUMilli: 2000, MemoryMB: 4000, GPUs: 0}, Allocated: cluster.Resource{CPUMilli: 500, MemoryMB: 500, GPUs: 0}},
	}}

	decisions := []Decision{
		{Pod: workload.Pod{Name: "a"}, Node: "n1"},
		{Pod: workload.Pod{Name: "b"}, Node: "n2"},
		{Pod: workload.Pod{Name: "c"}, Node: ""},
	}

	m := ComputeMetrics(c, decisions)

	if m.TotalPods != 3 || m.ScheduledPods != 2 || m.UnscheduledPods != 1 {
		t.Fatalf("unexpected pod counts: %+v", m)
	}
	if m.CPUCapacityMilli != 6000 || m.CPUUsedMilli != 2500 {
		t.Fatalf("unexpected cpu metrics: %+v", m)
	}
	if m.GPUCapacity != 1 || m.GPUUsed != 1 {
		t.Fatalf("unexpected gpu metrics: %+v", m)
	}
}

func TestGPURequiredButMissing(t *testing.T) {
	c := &cluster.Cluster{Nodes: []cluster.Node{
		{Name: "cpu-a", Capacity: cluster.Resource{CPUMilli: 4000, MemoryMB: 8000, GPUs: 0}},
	}}

	pods := []workload.Pod{
		{Name: "gpu-needed", Requests: cluster.Resource{CPUMilli: 1000, MemoryMB: 1000, GPUs: 1}, GPUType: "A100"},
	}

	decisions, _ := Run(c, pods, Binpack)

	if decisions[0].Node != "" {
		t.Fatalf("expected unscheduled GPU pod, got node %s", decisions[0].Node)
	}
	if decisions[0].Reason != "no GPU nodes available" {
		t.Fatalf("unexpected reason: %s", decisions[0].Reason)
	}
}

func TestGPUTypeAndMemoryConstraints(t *testing.T) {
	c := &cluster.Cluster{Nodes: []cluster.Node{
		{Name: "gpu-a", Capacity: cluster.Resource{CPUMilli: 8000, MemoryMB: 16000, GPUs: 2}, GPU: cluster.GPU{Type: "A100", MemoryMB: 80000, Count: 2}},
		{Name: "gpu-b", Capacity: cluster.Resource{CPUMilli: 8000, MemoryMB: 16000, GPUs: 1}, GPU: cluster.GPU{Type: "L40", MemoryMB: 46080, Count: 1}},
	}}

	pods := []workload.Pod{
		{Name: "l40-fit", Requests: cluster.Resource{CPUMilli: 1000, MemoryMB: 1000, GPUs: 1}, GPUType: "L40", GPUMemMB: 30000},
		{Name: "a100-fit", Requests: cluster.Resource{CPUMilli: 1000, MemoryMB: 1000, GPUs: 1}, GPUType: "A100", GPUMemMB: 60000},
		{Name: "too-big", Requests: cluster.Resource{CPUMilli: 1000, MemoryMB: 1000, GPUs: 1}, GPUType: "L40", GPUMemMB: 70000},
	}

	decisions, _ := Run(c, pods, Binpack)

	nodesByPod := map[string]string{}
	reasonByPod := map[string]string{}
	for _, d := range decisions {
		nodesByPod[d.Pod.Name] = d.Node
		reasonByPod[d.Pod.Name] = d.Reason
	}

	if nodesByPod["l40-fit"] != "gpu-b" {
		t.Fatalf("expected L40 pod on gpu-b, got %s", nodesByPod["l40-fit"])
	}
	if nodesByPod["a100-fit"] != "gpu-a" {
		t.Fatalf("expected A100 pod on gpu-a, got %s", nodesByPod["a100-fit"])
	}
	if nodesByPod["too-big"] != "" || !strings.Contains(reasonByPod["too-big"], "capacity") {
		t.Fatalf("expected unscheduled due to memory, got %s / %s", nodesByPod["too-big"], reasonByPod["too-big"])
	}
}
