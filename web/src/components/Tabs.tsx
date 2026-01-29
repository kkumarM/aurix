import React from 'react'

type Tab = { id: string; label: string }

export default function Tabs({ tabs, active, onChange }: { tabs: Tab[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="sticky top-[64px] z-20 bg-slate-950/80 backdrop-blur border-b border-slate-800">
      <div className="flex gap-2 px-4 py-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`px-3 py-2 text-sm font-semibold rounded-md transition ${
              active === t.id
                ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                : 'text-slate-300 border border-transparent hover:border-slate-700'
            }`}
            onClick={() => onChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}
