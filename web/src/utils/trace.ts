export type TraceEvent = {
  name: string
  cat?: string
  ph: string
  ts: number // microseconds
  dur?: number
  pid?: number
  tid?: number
}

export type Span = {
  lane: string
  name: string
  startMs: number
  endMs: number
  durMs: number
  cat?: string
  pid?: number
  tid?: number
}

export function parseTraceToSpans(trace: any): Span[] {
  if (!trace) return []
  const events: TraceEvent[] = trace.traceEvents || trace.events || []
  const spans: Span[] = []
  const stacks = new Map<string, TraceEvent[]>()

  const laneFrom = (ev: TraceEvent) => {
    if (ev.cat) return ev.cat.toLowerCase()
    if (typeof ev.tid === 'number') return `tid-${ev.tid}`
    return 'lane'
  }

  for (const ev of events) {
    if (ev.ph === 'X') {
      const startMs = ev.ts / 1000
      const durMs = (ev.dur || 0) / 1000
      spans.push({
        lane: laneFrom(ev),
        name: ev.name,
        startMs,
        endMs: startMs + durMs,
        durMs,
        cat: ev.cat,
        pid: ev.pid,
        tid: ev.tid,
      })
    } else if (ev.ph === 'B') {
      const key = stackKey(ev)
      const arr = stacks.get(key) || []
      arr.push(ev)
      stacks.set(key, arr)
    } else if (ev.ph === 'E') {
      const key = stackKey(ev)
      const arr = stacks.get(key)
      if (arr && arr.length) {
        const begin = arr.pop() as TraceEvent
        const startMs = begin.ts / 1000
        const endMs = ev.ts / 1000
        spans.push({
          lane: laneFrom(begin),
          name: begin.name,
          startMs,
          endMs,
          durMs: endMs - startMs,
          cat: begin.cat,
          pid: begin.pid,
          tid: begin.tid,
        })
        stacks.set(key, arr)
      }
    }
  }
  return spans.sort((a, b) => a.startMs - b.startMs)
}

function stackKey(ev: TraceEvent) {
  return `${ev.pid ?? 'p'}:${ev.tid ?? 't'}:${ev.name}`
}
