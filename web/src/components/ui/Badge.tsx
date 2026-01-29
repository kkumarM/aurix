import React from 'react'

const styles: Record<string, string> = {
  success: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40',
  danger: 'bg-red-500/20 text-red-200 border-red-500/40',
  neutral: 'bg-slate-800 text-slate-200 border-slate-700',
}

export default function Badge({ children, tone = 'neutral', className = '' }: { children: React.ReactNode; tone?: 'success' | 'danger' | 'neutral'; className?: string }) {
  return <span className={`px-2 py-1 text-xs rounded-full border ${styles[tone] || styles.neutral} ${className}`}>{children}</span>
}
