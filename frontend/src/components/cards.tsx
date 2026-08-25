import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { motion } from 'framer-motion'
import { AnimatedNumber } from './visuals/motion'

export function StatCard({ label, value, sub, icon, trend, tone = 'sky', delay = 0 }: {
  label: string; value: string | number; sub?: string
  icon?: ReactNode; trend?: 'up' | 'down' | 'flat'; tone?: 'sky' | 'rose' | 'amber' | 'emerald' | 'violet'
  delay?: number
}) {
  const tones = {
    sky: 'bg-sky-500/10 text-sky-300 ring-1 ring-sky-500/20',
    rose: 'bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/20',
    amber: 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20',
    violet: 'bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/20',
  }
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className="glass rounded-2xl p-4 ring-1 ring-line card-elevate"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        {icon && <span className={`rounded-lg p-1.5 ${tones[tone]}`}>{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-50">
        {typeof value === 'number'
          ? <AnimatedNumber value={value} />
          : value}
      </p>
      <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
        {trend && (
          <TrendIcon size={13} className={trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-slate-500'} />
        )}
        {sub}
      </div>
    </motion.div>
  )
}

export function GaugeRing({ score, level, size = 148 }: {
score: number; level: 'Low' | 'Moderate' | 'High' | 'Critical'; size?: number
}) {
  const r = (size - 16) / 2
  const c = 2 * Math.PI * r
  const color = level === 'Critical' ? '#e879f9' : level === 'High' ? '#f87171' : level === 'Moderate' ? '#fbbf24' : '#34d399'
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--gauge-track)" strokeWidth="11" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="11"
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        initial={{ strokeDasharray: `0 ${c}` }}
        animate={{ strokeDasharray: `${c * Math.min(score, 1)} ${c}` }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      />
      <text x="50%" y="46%" textAnchor="middle" fill="var(--gauge-text)" fontSize={size * 0.17} fontWeight="700">
        {Math.round(score * 100)}%
      </text>
      <text x="50%" y="63%" textAnchor="middle" fill={color} fontSize={size * 0.085} fontWeight="600">
        {level.toUpperCase()}
      </text>
    </svg>
  )
}

export function FactorBar({ name, impact, direction, description, rank }: {
  name: string; impact: number; direction: 'increasing' | 'decreasing'; description: string; rank: number
}) {
  return (
    <li className="group rounded-xl bg-subtle p-3 ring-1 ring-line">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-200">
          <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-hoverc text-[11px] font-bold text-slate-400">#{rank}</span>
          {name}
        </span>
        <span className={`text-xs font-semibold ${direction === 'increasing' ? 'text-rose-300' : 'text-emerald-300'}`}>
          {direction === 'increasing' ? '↑ elevating' : '↓ supportive'}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-hoverc">
        <div className={`h-full rounded-full ${direction === 'increasing' ? 'bg-rose-400/80' : 'bg-emerald-400/80'}`}
             style={{ width: `${Math.max(impact * 100, 4)}%`, transition: 'width .7s ease' }} />
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-400">{description}</p>
    </li>
  )
}

export function DataTable<T>({ columns, rows, keyOf, empty }: {
  columns: { header: string; cell: (row: T) => ReactNode; className?: string }[]
  rows: T[]; keyOf: (row: T) => string | number; empty?: ReactNode
}) {
  if (!rows.length && empty) return <>{empty}</>
  return (
    <div className="overflow-x-auto rounded-xl ring-1 ring-line">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-line bg-subtle">
            {columns.map((c, i) => (
              <th key={i} className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400 ${c.className ?? ''}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={keyOf(row)} className="border-b border-line last:border-0 hover:bg-subtle">
              {columns.map((c, i) => (
                <td key={i} className={`px-4 py-3 align-middle text-slate-300 ${c.className ?? ''}`}>{c.cell(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
