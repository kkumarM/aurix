import React from 'react'

export default function HintPill({ id, text }: { id: string; text: string }) {
  const [visible, setVisible] = React.useState(() => {
    if (typeof localStorage === 'undefined') return true
    return localStorage.getItem(`hint:${id}`) !== 'dismissed'
  })

  const dismiss = () => {
    setVisible(false)
    if (typeof localStorage !== 'undefined') localStorage.setItem(`hint:${id}`, 'dismissed')
  }

  if (!visible) return null
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/40 text-emerald-100 text-xs">
      {text}
      <button className="text-emerald-200" onClick={dismiss} aria-label="Dismiss hint">✕</button>
    </div>
  )
}
