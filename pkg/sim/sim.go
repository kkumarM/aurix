package sim

import (
	"math"
	"time"

	"simulator/pkg/cluster"
	"simulator/pkg/scheduler"
)

// Result holds simulated execution details for a pod on a specific node.
type Result struct {
	PodName     string  `json:"pod"`
	Node        string  `json:"node"`
	RuntimeSec  float64 `json:"runtimeSec"`
	Bound       string  `json:"bound"` // "compute", "memory", or "unknown"
	UsedTFLOPS  float64 `json:"usedTFLOPS"`
	UsedMemGBps float64 `json:"usedMemGBps"`
	FLOPs       float64 `json:"flops"`
	Bytes       float64 `json:"bytes"`
	GPUType     string  `json:"gpuType"`
	GPUCount    int     `json:"gpuCount"`
}

// Simulate estimates runtimes for GPU-assigned pods using a simple roofline model.
// FLOPs and bytes are taken from pod.SimFLOPs/SimBytes; if zero, the pod is skipped.
func Simulate(c *cluster.Cluster, decisions []scheduler.Decision) []Result {
	results := []Result{}

	// Build node lookup
	nodes := make(map[string]*cluster.Node, len(c.Nodes))
	for i := range c.Nodes {
		nodes[c.Nodes[i].Name] = &c.Nodes[i]
	}

	for _, d := range decisions {
		if d.Node == "" {
			continue
		}
		p := d.Pod
		if p.SimFLOPs == 0 || p.SimBytes == 0 || p.Requests.GPUs == 0 {
			continue // not enough info to simulate
		}

		node := nodes[d.Node]
		gpu := node.GPU
		if gpu.Count == 0 || gpu.TFLOPS == 0 || gpu.MemGBps == 0 {
			continue
		}

		// Assume perfect split across requested GPUs.
		gpusUsed := p.Requests.GPUs
		if gpusUsed > gpu.Count {
			gpusUsed = gpu.Count
		}

		flopsPerGPU := p.SimFLOPs / float64(gpusUsed)
		bytesPerGPU := p.SimBytes / float64(gpusUsed)

		timeCompute := flopsPerGPU / (gpu.TFLOPS * 1e12) // seconds
		timeMemory := bytesPerGPU / (gpu.MemGBps * 1e9)  // seconds
		runtime := math.Max(timeCompute, timeMemory)
		bound := "compute"
		if timeMemory > timeCompute {
			bound = "memory"
		}

		results = append(results, Result{
			PodName:     p.FullName(),
			Node:        d.Node,
			RuntimeSec:  runtime,
			Bound:       bound,
			UsedTFLOPS:  gpu.TFLOPS,
			UsedMemGBps: gpu.MemGBps,
			FLOPs:       p.SimFLOPs,
			Bytes:       p.SimBytes,
			GPUType:     gpu.Type,
			GPUCount:    gpusUsed,
		})
	}

	return results
}

// TotalRuntime returns wall-clock if all GPU pods ran sequentially.
func TotalRuntime(results []Result) time.Duration {
	var sum float64
	for _, r := range results {
		sum += r.RuntimeSec
	}
	return time.Duration(sum * float64(time.Second))
}
