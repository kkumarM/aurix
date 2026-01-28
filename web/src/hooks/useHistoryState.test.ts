import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useHistoryState } from './useHistoryState'

describe('useHistoryState', () => {
  it('undo/redo bounded', () => {
    const { result } = renderHook(() => useHistoryState(1, { max: 3, debounceMs: 0 }))
    act(() => result.current.setStateImmediate(2))
    act(() => result.current.setStateImmediate(3))
    expect(result.current.state).toBe(3)
    act(() => result.current.undo())
    expect(result.current.state).toBe(2)
    act(() => result.current.undo())
    expect(result.current.state).toBe(1)
    act(() => result.current.redo())
    expect(result.current.state).toBe(2)
  })
})
