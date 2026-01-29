import React from 'react'
import { inputBase } from '../../styles/formClasses'

const base = 'inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-400/50'
const variants: Record<string, string> = {
  primary: 'bg-emerald-500 text-slate-950 hover:bg-emerald-400',
  secondary: 'bg-slate-800 text-slate-100 border border-slate-700 hover:border-slate-500',
  ghost: 'text-slate-200 hover:bg-slate-800',
}

export default function Button({ children, variant = 'primary', className = '', ...rest }: any) {
  return (
    <button className={`${base} ${variants[variant] || variants.primary} ${className}`} {...rest}>
      {children}
    </button>
  )
}
