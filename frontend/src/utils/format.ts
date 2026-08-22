import type { RiskLevel } from '../types'

export const riskColor = (level: RiskLevel | string): string =>
  level === 'High' ? '#f87171' : level === 'Moderate' ? '#fbbf24' : '#34d399'

export const riskBadge = (level: RiskLevel | string): string =>
  level === 'High'
    ? 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/40'
    : level === 'Moderate'
      ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40'
      : 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40'

export const sevColor = (sev: string): string =>
  sev === 'high' ? '#f87171' : sev === 'moderate' ? '#fbbf24' : '#38bdf8'

export const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  const d = new Date(iso.includes('Z') || iso.includes('T') ? iso : `${iso}T00:00:00`)
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const fmtDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export const pct = (v: number): string => `${Math.round(v * 100)}%`

export const initials = (name: string): string =>
  name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

export const statusLabel = (s: string): string =>
  s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

export const downloadJson = (data: unknown, filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
