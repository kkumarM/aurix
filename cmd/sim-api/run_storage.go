package main

import (
	"encoding/json"
	"log"
	"os"
	"path/filepath"

	"simulator/pkg/schema"
)

func saveRunToDisk(rec runRecord) error {
	dir := filepath.Join(artifactsDir, "runs", rec.result.RunID)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}

	// Save result.json
	resultBytes, err := json.MarshalIndent(rec.result, "", "  ")
	if err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(dir, "result.json"), resultBytes, 0o644); err != nil {
		return err
	}

	// Save trace.json
	if err := os.WriteFile(filepath.Join(dir, "trace.json"), rec.trace, 0o644); err != nil {
		return err
	}

	// Save breakdown.json
	breakdownBytes, err := json.MarshalIndent(rec.breakdown, "", "  ")
	if err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(dir, "breakdown.json"), breakdownBytes, 0o644); err != nil {
		return err
	}

	return nil
}

func deleteRunFromDisk(id string) error {
	dir := filepath.Join(artifactsDir, "runs", id)
	return os.RemoveAll(dir)
}

func loadAllRunsFromDisk() {
	dir := filepath.Join(artifactsDir, "runs")
	entries, err := os.ReadDir(dir)
	if err != nil {
		if !os.IsNotExist(err) {
			log.Printf("failed to read runs dir: %v", err)
		}
		return
	}

	rnStore.mu.Lock()
	defer rnStore.mu.Unlock()

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		runID := entry.Name()
		runDir := filepath.Join(dir, runID)

		resultBytes, err := os.ReadFile(filepath.Join(runDir, "result.json"))
		if err != nil {
			log.Printf("failed to read result.json for run %s: %v", runID, err)
			continue
		}
		var result schema.RunResult
		if err := json.Unmarshal(resultBytes, &result); err != nil {
			log.Printf("failed to unmarshal result.json for run %s: %v", runID, err)
			continue
		}

		traceBytes, err := os.ReadFile(filepath.Join(runDir, "trace.json"))
		if err != nil {
			log.Printf("failed to read trace.json for run %s: %v", runID, err)
			continue
		}

		breakdownBytes, err := os.ReadFile(filepath.Join(runDir, "breakdown.json"))
		if err != nil {
			log.Printf("failed to read breakdown.json for run %s: %v", runID, err)
			continue
		}
		var breakdown schema.Breakdown
		if err := json.Unmarshal(breakdownBytes, &breakdown); err != nil {
			log.Printf("failed to unmarshal breakdown.json for run %s: %v", runID, err)
			continue
		}

		rnStore.runs[runID] = runRecord{
			result:    result,
			trace:     traceBytes,
			breakdown: breakdown,
		}
	}
	log.Printf("loaded %d runs from disk", len(rnStore.runs))
}
