package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"strings"
	"text/tabwriter"
	"time"

	"context"

	"simulator/pkg/bench"
	"simulator/pkg/cluster"
	"simulator/pkg/scheduler"
	"simulator/pkg/sim"
	"simulator/pkg/workload"
)

func main() {
	clusterPath := flag.String("cluster", "configs/cluster.example.json", "path to cluster JSON definition")
	workloadPath := flag.String("workload", "configs/workload.example.json", "path to workload JSON definition")
	showState := flag.Bool("state", false, "print final node utilization after scheduling")
	strategy := flag.String("strategy", "binpack", "scheduling strategy: binpack or spread")
	showMetrics := flag.Bool("metrics", true, "print aggregate metrics summary")
	metricsJSON := flag.String("metrics-json", "", "write metrics summary as JSON to the given file (optional)")
	genCluster := flag.String("generate-cluster", "", "generate a cluster file (comma-separated k=v, e.g. nodes=4,gpuNodes=2,gpuType=A100,gpuMemMB=80000,gpuCount=4)")
	genWorkload := flag.String("generate-workload", "", "generate a workload file (comma-separated k=v, e.g. pods=50,gpuPods=20,gpuType=A100,gpuMemMB=40000,gpuCount=1,cpu=500-4000,memMB=512-8192,priority=1-100)")
	benchCmd := flag.String("bench-cmd", "", "command to benchmark (quoted). If set, runs the command and writes a profile JSON, then exits.")
	benchOut := flag.String("bench-out", "bench.json", "path to write benchmark profile JSON")
	benchDuration := flag.Duration("bench-duration", 30*time.Second, "duration to run the benchmark command")
	benchInterval := flag.Duration("bench-interval", 1*time.Second, "sampling interval for benchmark metrics")
	showSim := flag.Bool("simulate", true, "estimate GPU runtimes using simFLOPs/simBytes hints")
	flag.Parse()

	if *benchCmd != "" {
		runBench(*benchCmd, *benchOut, *benchDuration, *benchInterval)
		return
	}

	// Optional generation of inputs before loading them.
	if *genCluster != "" {
		cfg, err := cluster.ParseGeneratorConfig(*genCluster)
		if err != nil {
			exitErr(err)
		}
		generated := cluster.Generate(cfg)
		if err := writeClusterJSON(*clusterPath, generated); err != nil {
			exitErr(err)
		}
	}
	if *genWorkload != "" {
		cfg, err := workload.ParseGeneratorConfig(*genWorkload)
		if err != nil {
			exitErr(err)
		}
		pods := workload.Generate(cfg)
		if err := writeWorkloadJSON(*workloadPath, pods); err != nil {
			exitErr(err)
		}
	}

	c, err := cluster.Load(*clusterPath)
	if err != nil {
		exitErr(err)
	}

	pods, err := workload.Load(*workloadPath)
	if err != nil {
		exitErr(err)
	}

	mode := scheduler.Strategy(*strategy)
	if mode != scheduler.Binpack && mode != scheduler.Spread {
		exitErr(fmt.Errorf("unknown strategy %q (use binpack or spread)", *strategy))
	}

	decisions, final := scheduler.Run(c, pods, mode)
	printDecisions(decisions)

	if *showSim {
		fmt.Println()
		printSimulation(final, decisions)
	}

	if *showMetrics {
		fmt.Println()
		printMetrics(final, decisions)
	}

	if *showState {
		fmt.Println()
		printCluster(final)
	}

	if *metricsJSON != "" {
		if err := writeMetricsJSON(*metricsJSON, final, decisions); err != nil {
			exitErr(err)
		}
	}
}

func printDecisions(decisions []scheduler.Decision) {
	w := tabwriter.NewWriter(os.Stdout, 0, 2, 2, ' ', 0)
	fmt.Fprintln(w, "POD\tNODE\tREASON")
	for _, d := range decisions {
		node := d.Node
		if node == "" {
			node = "unscheduled"
		}
		fmt.Fprintf(w, "%s\t%s\t%s\n", d.Pod.FullName(), node, d.Reason)
	}
	_ = w.Flush()
}

func printCluster(c *cluster.Cluster) {
	w := tabwriter.NewWriter(os.Stdout, 0, 2, 2, ' ', 0)
	fmt.Fprintln(w, "NODE\tCPU USED(m)\tCPU FREE(m)\tMEM USED(MB)\tMEM FREE(MB)\tGPU USED\tGPU FREE")
	for _, n := range c.Nodes {
		remain := n.Remaining()
		fmt.Fprintf(
			w,
			"%s\t%d\t%d\t%d\t%d\t%d\t%d\n",
			n.Name,
			n.Allocated.CPUMilli, remain.CPUMilli,
			n.Allocated.MemoryMB, remain.MemoryMB,
			n.Allocated.GPUs, remain.GPUs,
		)
	}
	_ = w.Flush()
}

func printMetrics(c *cluster.Cluster, decisions []scheduler.Decision) {
	m := scheduler.ComputeMetrics(c, decisions)
	fmt.Println("METRICS")
	w := tabwriter.NewWriter(os.Stdout, 0, 2, 2, ' ', 0)
	fmt.Fprintln(w, "TOTAL PODS\tSCHEDULED\tUNSCHEDULED\tCPU USED(m)\tCPU CAP(m)\tMEM USED(MB)\tMEM CAP(MB)\tGPU USED\tGPU CAP")
	fmt.Fprintf(
		w,
		"%d\t%d\t%d\t%d\t%d\t%d\t%d\t%d\t%d\n",
		m.TotalPods, m.ScheduledPods, m.UnscheduledPods,
		m.CPUUsedMilli, m.CPUCapacityMilli,
		m.MemUsedMB, m.MemCapacityMB,
		m.GPUUsed, m.GPUCapacity,
	)
	_ = w.Flush()
}

func printSimulation(c *cluster.Cluster, decisions []scheduler.Decision) {
	results := sim.Simulate(c, decisions)
	if len(results) == 0 {
		fmt.Println("SIMULATION: no GPU pods with simFLOPs/simBytes hints to simulate.")
		return
	}
	fmt.Println("SIMULATION (roofline estimate)")
	w := tabwriter.NewWriter(os.Stdout, 0, 2, 2, ' ', 0)
	fmt.Fprintln(w, "POD\tNODE\tGPU TYPE\tGPUS\tRUNTIME(s)\tBOUND\tFLOPs\tBYTES")
	for _, r := range results {
		fmt.Fprintf(w, "%s\t%s\t%s\t%d\t%.3f\t%s\t%.2e\t%.2e\n",
			r.PodName, r.Node, r.GPUType, r.GPUCount, r.RuntimeSec, r.Bound, r.FLOPs, r.Bytes)
	}
	_ = w.Flush()
}

func writeMetricsJSON(path string, c *cluster.Cluster, decisions []scheduler.Decision) error {
	m := scheduler.ComputeMetrics(c, decisions)
	data, err := json.MarshalIndent(m, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal metrics: %w", err)
	}
	if err := os.WriteFile(path, data, 0o644); err != nil {
		return fmt.Errorf("write metrics file: %w", err)
	}
	return nil
}

func writeClusterJSON(path string, c *cluster.Cluster) error {
	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal cluster: %w", err)
	}
	if err := os.WriteFile(path, data, 0o644); err != nil {
		return fmt.Errorf("write cluster file: %w", err)
	}
	return nil
}

func writeWorkloadJSON(path string, pods []workload.Pod) error {
	payload := struct {
		Pods []workload.Pod `json:"pods"`
	}{
		Pods: pods,
	}
	data, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal workload: %w", err)
	}
	if err := os.WriteFile(path, data, 0o644); err != nil {
		return fmt.Errorf("write workload file: %w", err)
	}
	return nil
}

func runBench(cmdStr, outPath string, duration, interval time.Duration) {
	cmd := splitArgs(cmdStr)
	collector := bench.Collector{
		Command:  cmd,
		Duration: duration,
		Interval: interval,
	}
	profile, err := collector.Run(context.Background())
	if err != nil {
		exitErr(err)
	}
	data, err := json.MarshalIndent(profile, "", "  ")
	if err != nil {
		exitErr(fmt.Errorf("marshal profile: %w", err))
	}
	if err := os.WriteFile(outPath, data, 0o644); err != nil {
		exitErr(fmt.Errorf("write profile: %w", err))
	}
	fmt.Printf("Benchmark complete. Profile written to %s\n", outPath)
}

// splitArgs is a minimal shell-free splitter; assumes space-separated args without quoting complexity.
func splitArgs(s string) []string {
	fields := strings.Fields(s)
	return fields
}

func exitErr(err error) {
	fmt.Fprintf(os.Stderr, "error: %v\n", err)
	os.Exit(1)
}
