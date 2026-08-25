import { useState } from 'react'
import { Activity, Flame, HeartPulse, Lightbulb } from 'lucide-react'
import * as api from '../../services'
import { useAsync } from '../../hooks/useAsync'
import AIBanner from '../../components/AIBanner'
import { Card, ErrorNote, PageHeader, Spinner } from '../../components/ui'
import { MiniBars } from '../../components/charts'

const RANGES = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '1 year' },
]

function heatColor(v: number | null): string {
  if (v == null) return 'bg-subtle ring-1 ring-line'
  if (v >= 70) return 'bg-rose-500/80'
  if (v >= 55) return 'bg-amber-500/70'
  if (v >= 40) return 'bg-sky-500/60'
  return 'bg-emerald-500/60'
}

export default function OrganizationalAnalytics() {
  const [range, setRange] = useState('30')
  const sum = useAsync(() => api.fetchAnalyticsSummary(Number(range)), true, [range])
  const ins = useAsync(() => api.fetchInsights(), true)

  if (sum.status === 'loading') return <Spinner label="Crunching organizational analytics…" />
  if (sum.error) return <ErrorNote message={sum.error} onRetry={sum.reload} />
  const a = sum.data!

  return (
    <>
      <PageHeader
        title="Organizational analytics"
        subtitle="Aggregate wellbeing patterns — never individual records."
        action={
          <div className="flex gap-1.5 rounded-xl bg-subtle p-1 ring-1 ring-line">
            {RANGES.map((r) => (
              <button key={r.value} onClick={() => setRange(r.value)}
                      className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
                        range === r.value ? 'bg-sky-500/25 text-white ring-1 ring-sky-400/50' : 'text-slate-400 hover:text-slate-200'}`}>
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      {/* AI insight cards */}
      {ins.data?.items?.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {ins.data.items.map((it, i) => {
            const toneRing = it.tone === 'rose' ? 'ring-fuchsia-500/40 bg-fuchsia-500/5'
              : it.tone === 'amber' ? 'ring-amber-500/40 bg-amber-500/5'
              : it.tone === 'emerald' ? 'ring-emerald-500/40 bg-emerald-500/5'
              : 'ring-sky-500/40 bg-sky-500/5'
            return (
              <Card key={it.id} delay={i * 0.05} className={`${toneRing} ring-1`}>
                <p className="flex items-start gap-2 text-sm font-semibold leading-snug text-slate-100">
                  <Lightbulb size={16} className={`mt-0.5 shrink-0 ${it.tone === 'emerald' ? 'text-emerald-300' : it.tone === 'amber' ? 'text-amber-300' : it.tone === 'rose' ? 'text-fuchsia-300' : 'text-sky-300'}`} />
                  {it.title}
                </p>
                <p className="mt-1.5 pl-6 text-xs leading-relaxed text-slate-400">{it.body}</p>
              </Card>
            )
          })}
        </div>
      ) : null}

      {/* heatmap */}
      <Card delay={0.1} className="mt-4" title="Unit × day stress heatmap"
            subtitle="Average stress index per unit per day — darker means more strain">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-1 text-left text-xs">
            <thead>
              <tr>
                <th className="w-24" />
                {a.heatmap.days.map((day) => (
                  <th key={day} className="pb-1 text-center text-[9px] font-medium text-slate-500">
                    {new Date(`${day}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric' })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {a.heatmap.rows.map((row) => (
                <tr key={row.unit}>
                  <td className="pr-2 text-right text-[11px] font-semibold text-slate-300">{row.unit}</td>
                  {row.values.map((v, i) => (
                    <td key={i} title={v != null ? `Stress index ${v}` : 'No data'}
                        className={`h-7 rounded ${heatColor(v)} transition-transform hover:scale-110`} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-slate-500">
          Low
          <span className="h-3 w-5 rounded bg-emerald-500/60" />
          <span className="h-3 w-5 rounded bg-sky-500/60" />
          <span className="h-3 w-5 rounded bg-amber-500/70" />
          <span className="h-3 w-5 rounded bg-rose-500/80" />
          High
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card delay={0.16} title="Burnout by week" subtitle="Average burnout sub-score"
              action={<Flame size={15} className="text-rose-400/80" />}>
          {a.burnout_trend.length
            ? <MiniBars data={a.burnout_trend.map((w) => ({ label: w.week, value: w.burnout }))} tone="rose" />
            : <p className="py-8 text-center text-xs text-slate-500">Not enough data yet.</p>}
        </Card>

        <Card delay={0.22} title="Fatigue by week" subtitle="Average fatigue sub-score"
              action={<HeartPulse size={15} className="text-amber-400/80" />}>
          {a.fatigue_trend.length
            ? <MiniBars data={a.fatigue_trend.map((w) => ({ label: w.week, value: w.fatigue }))} tone="amber" />
            : <p className="py-8 text-center text-xs text-slate-500">Not enough data yet.</p>}
        </Card>

        <Card delay={0.28} title="Unit comparison" subtitle="Workload vs fatigue vs stress">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-2">Unit</th>
                  <th className="px-1 py-2 text-center">Load</th>
                  <th className="px-1 py-2 text-center">Fatigue</th>
                  <th className="px-1 py-2 text-center">Stress</th>
                  <th className="px-1 py-2 text-right">Check-ins</th>
                </tr>
              </thead>
              <tbody>
                {a.unit_comparison.map((u) => (
                  <tr key={u.unit} className="border-b border-line/60 last:border-0">
                    <td className="py-2 pr-2 font-medium text-slate-200">{u.unit}</td>
                    <td className="px-1 py-2 text-center text-sky-300">{u.workload.toFixed(1)}</td>
                    <td className="px-1 py-2 text-center text-amber-300">{u.fatigue.toFixed(1)}</td>
                    <td className="px-1 py-2 text-center text-rose-300">{u.stress.toFixed(0)}</td>
                    <td className="px-1 py-2 text-right text-slate-400">{u.checkins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card delay={0.34} title="Workload → stress correlation"
              subtitle="Average stress index per workload bucket"
              action={<Activity size={15} className="text-sky-400/80" />}>
          <MiniBars data={a.correlations.workload_vs_stress.map((c) => ({ label: c.workload_bucket.split(' ')[0], value: c.avg_stress }))} />
        </Card>

        <Card delay={0.4} title="Sleep → stress correlation"
              subtitle="Average stress index per sleep quality (5 = excellent)">
          <MiniBars data={a.correlations.sleep_vs_stress.map((c) => ({ label: String(c.sleep), value: c.avg_stress }))} tone="amber" />
        </Card>

        <Card delay={0.46} title="Deployment → risk correlation"
              subtitle="Average risk level per deployment type">
          {a.correlations.deployment_vs_risk.length
            ? <MiniBars data={a.correlations.deployment_vs_risk.map((c) => ({ label: c.type, value: c.avg_risk }))} tone="rose" />
            : <p className="py-8 text-center text-xs text-slate-500">No active deployments with indicators.</p>}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card delay={0.52} title="Leave utilization" subtitle={`Year ${new Date().getFullYear()} · approved leave used vs entitlement`}>
          <ul className="space-y-3">
            {Object.entries(a.leave_utilization).map(([type, v]) => (
              <li key={type}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-300">{type}</span>
                  <span className="text-slate-500">{v.used}/{v.entitled} days · {v.pct}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-hoverc">
                  <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-violet-500" style={{ width: `${Math.min(100, v.pct)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card delay={0.58} title="Intervention effectiveness" subtitle="Are welfare actions completing?">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            {[['Total', a.intervention_effectiveness.total],
              ['Completed', a.intervention_effectiveness.completed],
              ['Completion', `${a.intervention_effectiveness.completion_rate}%`]].map(([label, val]) => (
              <div key={String(label)} className="rounded-xl bg-subtle p-3.5 ring-1 ring-line">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-extrabold text-slate-100">{val}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">
            {a.intervention_effectiveness.avg_days_to_complete != null
              ? `Average time to complete: ${a.intervention_effectiveness.avg_days_to_complete} days.`
              : 'Completion timing appears once interventions finish.'}
            {' '}Every intervention is voluntary support — tracked to improve care, not to judge.
          </p>
        </Card>
      </div>

      <div className="mt-4 space-y-3">
        <AIBanner />
        <p className="text-[11px] leading-relaxed text-slate-500">{a.note}</p>
      </div>
    </>
  )
}
