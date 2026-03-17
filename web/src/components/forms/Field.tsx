import React from 'react'
import { labelBase, errorBase } from '../../styles/formClasses'

type FieldProps = {
  label: string
  tooltip?: string
  suffix?: string
  error?: string
  help?: string
  children: React.ReactNode
}

export default function Field({ label, tooltip, suffix, error, help, children }: FieldProps) {
  return (
    <label className="block space-y-1 text-sm">
      <div className="flex items-center gap-2">
        <span className={labelBase}>{label}</span>
        {tooltip && <span className="text-slate-500 text-xs" title={tooltip}>?</span>}
        {suffix && <span className="ml-auto text-slate-500 text-xs">{suffix}</span>}
      </div>
      {children}
      {help && <div className="text-xs text-slate-500">{help}</div>}
      {error && <div className={errorBase}>{error}</div>}
    </label>
  )
}
