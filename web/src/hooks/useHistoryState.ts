import { useEffect, useRef, useState } from 'react'

export function useHistoryState<T>(initial: T, opts?: { max?: number; debounceMs?: number }) {
  const max = opts?.max ?? 50
  const debounceMs = opts?.debounceMs ?? 250
  const [state, setState] = useState<T>(initial)
  const [history, setHistory] = useState<T[]>([initial])
  const [index, setIndex] = useState(0)
  const debounceRef = useRef<number | null>(null)

  const push = (next: T, immediate = false) => {
    if (immediate) {
      commit(next)
      return
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = window.setTimeout(() => commit(next), debounceMs)
  }

  const commit = (next: T) => {
    setState(next)
    setHistory((prev) => {
      const trimmed = prev.slice(0, index + 1)
      trimmed.push(next)
      if (trimmed.length > max) trimmed.shift()
      return trimmed
    })
    setIndex((prev) => Math.min(max - 1, prev + 1))
  }

  const undo = () => {
    setIndex((i) => {
      if (i <= 0) return i
      const ni = i - 1
      setState((prev) => history[ni] ?? prev)
      return ni
    })
  }

  const redo = () => {
    setIndex((i) => {
      if (i >= history.length - 1) return i
      const ni = i + 1
      setState((prev) => history[ni] ?? prev)
      return ni
    })
  }

  const canUndo = index > 0
  const canRedo = index < history.length - 1

  useEffect(() => () => debounceRef.current && clearTimeout(debounceRef.current), [])

  return { state, setState: push, setStateImmediate: commit, undo, redo, canUndo, canRedo, historyIndex: index }
}
