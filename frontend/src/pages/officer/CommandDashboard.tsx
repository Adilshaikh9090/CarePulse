import { Link } from 'react-router-dom'
import {
  Activity, ClipboardList, CloudRain, Flame, HeartPulse, ShieldAlert, Users,
} from 'lucide-react'
import * as api from '../../services'
import { useAsync } from '../../hooks/useAsync'
import type { RiskLevel } from '../../types'
import AIBanner from '../../components/AIBanner'
import { Card, ErrorNote, PageHeader, Spinner } from '../../components/ui'
import { MiniBars } from '../../components/charts'
import { riskBadge } from '../../utils/format'

const LEVELS: RiskLevel[] = ['Low', 'Moderate', 'High', 'Critical']
const LEVEL_BAR: Record<RiskLevel, string> = {
  Low: 'bg-emerald-500',
  Moderate: 'bg-amber-500',
  High: 'bg-rose-500',
  Critical: 'bg-fuchsia-500',
}

export default function CommandDashboard() {
  const dash = useAsync(() => api.fetchCommandDashboard(), true)

  if (dash.status === 'loading') return <Spinner label="Building the command wellness picture…" />
  if (dash.error) return <ErrorNote message={dash.error} onRetry={dash.reload} />
  const d = dash.data!
  const total = Object.values(d.risk_counts).reduce((a, b) => a + b, 0) || 1
  const score = d.workforce_wellness_score

  return (
    <>
      <PageHeader
        title="Command wellness dashboard"
        subtitle="Aggregated workforce indicators only. Individual records stay confidential and are never shown here."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card delay={0} title="Workforce wellness score" subtitle="Higher is healthier">
          <div className="flex items-end gap-2">
            <span className={`text-5xl font-extrabold leading-none ${score >= 70 ? 'text-emerald-300' : score >= 50 ? 'text-amber-300' : 'text-rose-300'}`}>
              {Math.round(score)}
            </span>
            <span className="pb-1 text-xs text-slate-500">/100</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-hoverc ring-1 ring-line">
            <div className={`h-full rounded-full bg-gradient-to-r ${score >= 70 ? 'from-emerald-500 to-teal-400' : score >= 50 ? 'from-amber-500 to-orange-400' : 'from-rose-500 to-red-400'}`}
                 style={{ width: `${score}%` }} />
          </div>
        </Card>

        <Card delay={0.06} title="Active check-ins today" subtitle="Personnel who checked in">
          <p className="flex items-end gap-2">
            <span className="text-5xl font-extrabold leading-none text-sky-300">{d.active_checkins_today}</span>
          </p>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">
            Participation is voluntary — thank responses with care, never pressure.
          </p>
        </Card>

        <Card delay={0.12} title="Open interventions" subtitle="Welfare cases in progress">
          <p className="text-5xl font-extrabold leading-none text-violet-300">{d.open_interventions}</p>
          <Link to="/admin/interventions" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-sky-300 hover:text-sky-200">
            Manage interventions →
          </Link>
        </Card>

        <Card delay={0.18} title="Needs follow-up" subtitle="High & critical indicators">
          <p className="flex items-end gap-2">
            <ShieldAlert size={26} className="pb-1 text-fuchsia-300" />
            <span className="text-5xl font-extrabold leading-none text-fuchsia-300">{d.needs_followup.length}</span>
          </p>
          <Link to="/officer/personnel?risk=High" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-sky-300 hover:text-sky-200">
            Review personnel →
          </Link>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card delay={0.24} className="md:col-span-2 lg:col-span-2" title="Risk distribution" subtitle="Latest indicator per personnel member">
          <ul className="space-y-3">
            {LEVELS.map((lv) => {
              const n = d.risk_counts[lv] || 0
              return (
                <li key={lv}>
                  <div className="flex items-center justify-between text-xs">
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${riskBadge(lv)}`}>{lv}</span>
                    <span className="font-semibold text-slate-300">{n} <span className="font-normal text-slate-500">({Math.round(100 * n / total)}%)</span></span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-hoverc">
                    <div className={`h-full rounded-full ${LEVEL_BAR[lv]}`} style={{ width: `${100 * n / total}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>

        <Card delay={0.3} className="md:col-span-2 lg:col-span-3" title="Weekly stress index" subtitle="Average across all check-ins (last 14 weeks)">
          {d.weekly_stress.length ? (
            <MiniBars data={d.weekly_stress.map((w) => ({ label: w.week, value: w.value }))} />
          ) : (
            <p className="py-8 text-center text-xs text-slate-500">No trend data yet.</p>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card delay={0.36} title="Burnout trend" subtitle="Weekly average burnout sub-score"
              action={<CloudRain size={15} className="text-rose-400/80" />}>
          {d.burnout_trend.length
            ? <MiniBars data={d.burnout_trend.map((w) => ({ label: w.week, value: w.burnout }))} tone="rose" />
            : <p className="py-6 text-center text-xs text-slate-500">Not enough data yet.</p>}
        </Card>

        <Card delay={0.42} title="Fatigue trend" subtitle="Weekly average fatigue sub-score"
              action={<HeartPulse size={15} className="text-amber-400/80" />}>
          {d.fatigue_trend.length
            ? <MiniBars data={d.fatigue_trend.map((w) => ({ label: w.week, value: w.fatigue }))} tone="amber" />
            : <p className="py-6 text-center text-xs text-slate-500">Not enough data yet.</p>}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card delay={0.48} title="Unit risk breakdown"
              subtitle="Anonymized counts per unit"
              action={<Users size={15} className="text-sky-400/80" />}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead>
                <tr className="border-b border-line text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">Unit</th>
                  <th className="px-2 py-2 text-center">Low</th>
                  <th className="px-2 py-2 text-center">Mod</th>
                  <th className="px-2 py-2 text-center">High</th>
                  <th className="px-2 py-2 text-center">Crit</th>
                  <th className="px-2 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {d.unit_risk.map((u) => (
                  <tr key={u.unit} className="border-b border-line/60 last:border-0">
                    <td className="py-2 pr-3 font-medium text-slate-200">{u.unit}</td>
                    <td className="px-2 py-2 text-center text-emerald-300">{u.low}</td>
                    <td className="px-2 py-2 text-center text-amber-300">{u.moderate}</td>
                    <td className="px-2 py-2 text-center text-rose-300">{u.high}</td>
                    <td className="px-2 py-2 text-center text-fuchsia-300">{u.critical}</td>
                    <td className="px-2 py-2 text-right text-slate-400">{u.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card delay={0.54} title="Department distribution" subtitle="Personnel per department (anonymized)"
              action={<ClipboardList size={15} className="text-violet-400/80" />}>
          <MiniBars data={d.department_distribution.map((x) => ({ label: x.department, value: x.count }))} />
        </Card>
      </div>

      <div className="mt-4 space-y-3">
        <AIBanner />
        <p className="text-[11px] leading-relaxed text-slate-500">{d.note}</p>
      </div>
    </>
  )
}
