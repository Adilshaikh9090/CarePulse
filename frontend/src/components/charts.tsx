import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { motion } from 'framer-motion'
import type { AssessmentRow } from '../types'

const axis = { stroke: '#64748b', fontSize: 11 }
const tooltipStyle = {
  backgroundColor: 'var(--tooltip-bg)', border: '1px solid var(--linestrong)',
  borderRadius: 10, fontSize: 12, color: 'var(--tooltip-text)',
}
const grid = { stroke: 'var(--chart-grid)', vertical: false } as const

export function WellbeingTrendsChart({ rows }: { rows: AssessmentRow[] }) {
  const data = [...rows].slice(-30).map((r) => ({
    date: new Date(`${r.date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    stress: (6 - r.feeling) * 20,
    fatigue: r.fatigue * 20,
    workload: r.workload * 20,
    sleep: r.sleep_quality * 20,
  }))
  return (
    <div className="min-w-0">
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid {...grid} />
        <XAxis dataKey="date" tick={axis} tickLine={false} interval={4} />
        <YAxis domain={[0, 100]} tick={axis} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 10, flexWrap: 'wrap' }} />
        <Line type="monotone" dataKey="stress" name="Stress index" stroke="#f87171" strokeWidth={2} dot={false} animationDuration={1100} />
        <Line type="monotone" dataKey="fatigue" name="Fatigue" stroke="#fbbf24" strokeWidth={2} dot={false} animationDuration={1100} />
        <Line type="monotone" dataKey="workload" name="Workload" stroke="#38bdf8" strokeWidth={2} dot={false} animationDuration={1100} />
        <Line type="monotone" dataKey="sleep" name="Sleep quality" stroke="#34d399" strokeWidth={2} dot={false} animationDuration={1100} />
      </LineChart>
    </ResponsiveContainer>
    </div>
  )
}

export function RiskTrendChart({ items }: { items: { iso_date: string; risk_score: number }[] }) {
  const data = items.map((i) => ({
    date: new Date(`${i.iso_date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    score: Math.round(i.risk_score * 100),
  }))
return (
    <div className="min-w-0">
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f87171" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#f87171" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid {...grid} />
        <XAxis dataKey="date" tick={axis} tickLine={false} />
        <YAxis domain={[0, 100]} tick={axis} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, 'Risk indicator']} />
<Area type="monotone" dataKey="score" stroke="#f87171" strokeWidth={2} fill="url(#riskGrad)" animationDuration={1200} />
      </AreaChart>
    </ResponsiveContainer>
    </div>
  )
}

export function RiskPie({ counts }: { counts: Record<string, number> }) {
  const data = [
    { name: 'High', value: counts.High ?? 0 },
    { name: 'Moderate', value: counts.Moderate ?? 0 },
    { name: 'Low', value: counts.Low ?? 0 },
  ]
  const colors = ['#f87171', '#fbbf24', '#34d399']
  const total = data.reduce((s, d) => s + d.value, 0)
if (!total) return null
  return (
    <div className="min-w-0">
    <ResponsiveContainer width="100%" height={230}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88}
             paddingAngle={3} stroke="none">
          {data.map((_, i) => <Cell key={i} fill={colors[i]} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11, flexWrap: 'wrap' }} />
      </PieChart>
    </ResponsiveContainer>
    </div>
  )
}

export function UnitBarsChart({ units }: { units: { unit: string; avg_workload: number; avg_fatigue: number; avg_sleep: number }[] }) {
  const scale = (arr: typeof units) => arr.map((u) => ({
    unit: u.unit.replace('Unit ', ''),
    Workload: +(u.avg_workload / 5 * 100).toFixed(1),
    Fatigue: +(u.avg_fatigue / 5 * 100).toFixed(1),
    Sleep: +(u.avg_sleep / 5 * 100).toFixed(1),
  }))
return (
    <div className="min-w-0">
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={scale(units)} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid {...grid} />
        <XAxis dataKey="unit" tick={axis} tickLine={false} />
        <YAxis domain={[0, 100]} tick={axis} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11, flexWrap: 'wrap' }} />
        <Bar dataKey="Workload" fill="#38bdf8" radius={[6, 6, 0, 0]} maxBarSize={26} animationDuration={900} />
        <Bar dataKey="Fatigue" fill="#fbbf24" radius={[6, 6, 0, 0]} maxBarSize={26} animationDuration={900} />
        <Bar dataKey="Sleep" fill="#34d399" radius={[6, 6, 0, 0]} maxBarSize={26} animationDuration={900} />
      </BarChart>
    </ResponsiveContainer>
    </div>
  )
}

export function ActivityAreaChart({ daily }: { daily: { date: string; checkins: number; stress_index: number }[] }) {
  const data = daily.map((d) => ({
    date: new Date(`${d.date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    Checkins: d.checkins,
    StressIndex: d.stress_index,
  }))
return (
    <div className="min-w-0">
    <ResponsiveContainer width="100%" height={230}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid {...grid} />
        <XAxis dataKey="date" tick={axis} tickLine={false} interval={Math.max(Math.floor(data.length / 8), 0)} />
        <YAxis tick={axis} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11, flexWrap: 'wrap' }} />
        <Area type="monotone" dataKey="Checkins" stroke="#38bdf8" fill="#38bdf822" strokeWidth={2} />
        <Area type="monotone" dataKey="StressIndex" stroke="#f87171" fill="#f8717122" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
    </div>
  )
}

export function MiniBars({ data, tone = 'sky' }: {
  data: { label: string; value: number }[]
  tone?: 'sky' | 'rose' | 'amber'
}) {
  const max = Math.max(...data.map((d) => d.value), 1)
  const fill = tone === 'rose'
    ? 'from-rose-500/80 to-red-400/80'
    : tone === 'amber'
      ? 'from-amber-500/80 to-orange-400/80'
      : 'from-sky-500/80 to-violet-400/80'
  return (
    <div className="flex h-40 items-end gap-1">
      {data.map((d) => (
        <div key={d.label} className="group relative flex h-full flex-1 flex-col items-center justify-end gap-1">
          <span className="pointer-events-none absolute -top-5 z-10 hidden rounded bg-navy-900 px-1.5 py-0.5 text-[9px] text-slate-200 ring-1 ring-line group-hover:block">
            {Math.round(d.value)}
          </span>
          <div className={`w-full rounded-t bg-gradient-to-t ${fill} transition-all duration-300 group-hover:opacity-100 opacity-85`}
               style={{ height: `${Math.max(4, (d.value / max) * 100)}%` }} />
          <span className="text-[8px] text-slate-600">{d.label}</span>
        </div>
      ))}
    </div>
  )
}
