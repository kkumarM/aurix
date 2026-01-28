import { parseTraceToSpans } from './trace'
import { describe, it, expect } from 'vitest'

describe('parseTraceToSpans', () => {
  it('parses complete events', () => {
    const spans = parseTraceToSpans({ traceEvents: [{ name: 'compute', ph: 'X', ts: 0, dur: 1000, cat: 'gpu', pid: 1, tid: 1 }] })
    expect(spans.length).toBe(1)
    expect(spans[0].durMs).toBe(1)
    expect(spans[0].lane).toBe('gpu')
  })

  it('parses begin/end pairs', () => {
    const spans = parseTraceToSpans({ traceEvents: [
      { name: 'stage', ph: 'B', ts: 0, pid: 1, tid: 2 },
      { name: 'stage', ph: 'E', ts: 2000, pid: 1, tid: 2 },
    ] })
    expect(spans.length).toBe(1)
    expect(spans[0].durMs).toBe(2)
    expect(spans[0].lane).toBe('tid-2')
  })
})
