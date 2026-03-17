import React, { useState } from 'react'
import { labelBase, errorBase } from '../../styles/formClasses'

type FieldProps = {
  label: string
  tooltip?: string
  suffix?: string
  error?: string
  help?: string
  infoTitle?: string
  infoBody?: string
  infoId?: string
  currentInfoId?: string | null
  setCurrentInfoId?: (id: string | null) => void
  children: React.ReactNode
}

export default function Field({ label, tooltip, suffix, error, help, infoTitle, infoBody, infoId, currentInfoId, setCurrentInfoId, children }: FieldProps) {
  const [localOpen, setLocalOpen] = useState(false)
  const showInfo = infoId ? currentInfoId === infoId : localOpen
  const toggleInfo = () => {
    if (infoId && setCurrentInfoId) {
      setCurrentInfoId(showInfo ? null : infoId)
    } else {
      setLocalOpen((v) => !v)
    }
  }
  const closeInfo = () => {
    if (infoId && setCurrentInfoId) setCurrentInfoId(null)
    else setLocalOpen(false)
  }
  return (
    <label className="block space-y-1 text-sm relative">
      <div className="flex items-center gap-2">
        <span className={labelBase}>{label}</span>
        {tooltip && (
          <span className="relative inline-block">
            <button
              type="button"
              className="text-emerald-200 font-semibold text-xs px-1.5 py-0.5 border border-emerald-400/60 rounded hover:text-emerald-100 bg-emerald-500/10"
              title={tooltip}
              onClick={(e) => {
                e.preventDefault()
                toggleInfo()
              }}
            >
              ?
            </button>
            {showInfo && (infoTitle || infoBody) && (
              <div className="absolute top-full left-0 mt-2 w-64 max-w-[90vw] z-50 bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl text-xs text-slate-200 space-y-2">
                {infoTitle && <div className="font-semibold text-slate-100">{infoTitle}</div>}
                {infoBody && <div className="text-slate-300 whitespace-pre-line max-h-40 overflow-auto pr-1">{infoBody}</div>}
                <div className="flex justify-end">
                  <button
                    className="text-emerald-300 text-[11px] px-2 py-1 rounded border border-emerald-400/40 hover:bg-emerald-400/10"
                    type="button"
                    onClick={(e) => { e.preventDefault(); closeInfo() }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </span>
        )}
        {suffix && <span className="ml-auto text-slate-500 text-xs">{suffix}</span>}
      </div>
      <div className="relative">{children}</div>
      {help && <div className="text-xs text-slate-500">{help}</div>}
      {error && <div className={errorBase}>{error}</div>}
    </label>
  )
}
