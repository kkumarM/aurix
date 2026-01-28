package sim

import "simulator/pkg/schema"

// Breakdown computes stage aggregates and per-request tables for API output.
func Breakdown(results []RequestResult) schema.Breakdown {
	aggMap := map[string]schema.StageAggregate{}
	reqs := make([]schema.RequestBreakdown, 0, len(results))

	for _, r := range results {
		for _, st := range r.Stages {
			key := st.Cat + ":" + st.Name
			a := aggMap[key]
			a.Name = st.Name
			a.Category = st.Cat
			a.Count++
			a.TotalMS += st.End - st.Start
			aggMap[key] = a
		}
		reqs = append(reqs, schema.RequestBreakdown{
			ID:        r.ID,
			ArrivalMS: r.ArrivalMS,
			StartMS:   r.StartMS,
			EndMS:     r.EndMS,
			QueueMS:   r.QueueMS,
			TotalMS:   r.LatencyMS,
			Stages:    toSchemaStages(r.Stages),
		})
	}

	aggs := make([]schema.StageAggregate, 0, len(aggMap))
	for _, a := range aggMap {
		if a.Count > 0 {
			a.AvgMS = a.TotalMS / float64(a.Count)
		}
		aggs = append(aggs, a)
	}

	return schema.Breakdown{
		StageAggregates: aggs,
		Requests:        reqs,
	}
}

func toSchemaStages(sts []StageTiming) []schema.StageTiming {
	out := make([]schema.StageTiming, len(sts))
	for i, st := range sts {
		out[i] = schema.StageTiming{
			Name:  st.Name,
			Cat:   st.Cat,
			Start: st.Start,
			End:   st.End,
		}
	}
	return out
}
