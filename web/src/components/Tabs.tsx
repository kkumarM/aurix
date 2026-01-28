import React from 'react'

type Tab = { id: string; label: string }

export default function Tabs({ tabs, active, onChange }: { tabs: Tab[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur border-b border-slate-800 flex">
      {tabs.map((t) => (
        <button
          key={t.id}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            active === t.id ? 'border-emerald-400 text-emerald-200' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
