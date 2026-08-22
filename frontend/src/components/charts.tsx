import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { AssessmentRow } from '../types'

const axis = { stroke: '#64748b', fontSize: 11 }
const tooltipStyle = {
  backgroundColor: '#101a38', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, fontSize: 12, color: '#e2e8f0',
}

export function WellbeingTrendsChart({ rows }: { rows: AssessmentRow[] }) {
  const data = [...rows].slice(-30).map((r) => ({
    date: new Date(`${r.date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    stress: (6 - r.feeling) * 20,
    fatigue: r.fatigue * 20,
    workload: r.workload * 20,
    sleep: r.sleep_quality * 20,
  }))
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="date" tick={axis} tickLine={false} interval={4} />
        <YAxis domain={[0, 100]} tick={axis} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="stress" name="Stress index" stroke="#f87171" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="fatigue" name="Fatigue" stroke="#fbbf24" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="workload" name="Workload" stroke="#38bdf8" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="sleep" name="Sleep quality" stroke="#34d399" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function RiskTrendChart({ items }: { items: { iso_date: string; risk_score: number }[] }) {
  const data = items.map((i) => ({
    date: new Date(`${i.iso_date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    score: Math.round(i.risk_score * 100),
  }))
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f87171" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#f87171" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="date" tick={axis} tickLine={false} />
        <YAxis domain={[0, 100]} tick={axis} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, 'Risk indicator']} />
        <Area type="monotone" dataKey="score" stroke="#f87171" strokeWidth={2} fill="url(#riskGrad)" />
      </AreaChart>
    </ResponsiveContainer>
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
    <ResponsiveContainer width="100%" height={230}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88}
             paddingAngle={3} stroke="none">
          {data.map((_, i) => <Cell key={i} fill={colors[i]} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
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
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={scale(units)} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="unit" tick={axis} tickLine={false} />
        <YAxis domain={[0, 100]} tick={axis} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="Workload" fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={26} />
        <Bar dataKey="Fatigue" fill="#fbbf24" radius={[4, 4, 0, 0]} maxBarSize={26} />
        <Bar dataKey="Sleep" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={26} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function ActivityAreaChart({ daily }: { daily: { date: string; checkins: number; stress_index: number }[] }) {
  const data = daily.map((d) => ({
    date: new Date(`${d.date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    Checkins: d.checkins,
    StressIndex: d.stress_index,
  }))
  return (
    <ResponsiveContainer width="100%" height={230}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="date" tick={axis} tickLine={false} interval={Math.max(Math.floor(data.length / 8), 0)} />
        <YAxis tick={axis} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Area type="monotone" dataKey="Checkins" stroke="#38bdf8" fill="#38bdf822" strokeWidth={2} />
        <Area type="monotone" dataKey="StressIndex" stroke="#f87171" fill="#f8717122" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
