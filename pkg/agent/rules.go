package agent

func selectPrimaryCandidate(candidates []ruleCandidate) ruleCandidate {
	best := ruleCandidate{name: "Balanced", severity: "medium"}
	bestRank := rankSeverity(best.severity)
	for _, candidate := range candidates {
		candidateRank := rankSeverity(candidate.severity)
		if candidateRank > bestRank || (candidateRank == bestRank && best.name == "Balanced") {
			best = candidate
			bestRank = candidateRank
		}
	}
	return best
}

func rankSeverity(severity string) int {
	switch severity {
	case "high":
		return 3
	case "medium":
		return 2
	case "low":
		return 1
	default:
		return 1
	}
}

type ruleCandidate struct {
	name            string
	evidence        string
	recommendations []Recommendation
	nextExperiments []string
	productionNotes []string
	severity        string
}
