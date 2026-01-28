import { describe, it, expect } from 'vitest'
import { loadScenario } from './scenarioStore'
import { defaultScenario } from '../components/ScenarioPanel'
import { diffPipelineForTest } from '../components/ScenarioDiffModal'

describe('pipeline diff basic', () => {
  it('detects added/removed/changed', () => {
    const a = [{ name: 'a', kind: 'fixed_ms', value: 1 }]
    const b = [{ name: 'a', kind: 'fixed_ms', value: 2 }, { name: 'b', kind: 'bytes', value: 10 }]
    const rows = diffPipelineForTest(a, b)
    expect(rows[0].status).toBe('changed')
    expect(rows[1].status).toBe('added')
  })
})
