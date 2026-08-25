import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, Briefcase, CalendarCheck, CloudRain, HeartPulse, Plane,
} from 'lucide-react'
import * as api from '../../services'
import { useAsync } from '../../hooks/useAsync'
import AIBanner from '../../components/AIBanner'
import { Button, Card, Empty, ErrorNote, PageHeader, Spinner } from '../../components/ui'
import { WellbeingTrendsChart } from '../../components/charts'
import { fmtDate, fmtDateTime, riskBadge } from '../../utils/format'

export default function PersonnelDetail() {
  const { userId = '' } = useParams()
  const detail = useAsync(() => api.fetchPersonnelDetail(userId), true)

  if (detail.status === 'loading') return <Spinner label="Loading welfare profile…" />
  if (detail.error) return <ErrorNote message={detail.error} onRetry={detail.reload} />
  const d = detail.data!

  return (
    <>
      <PageHeader
        title={`Welfare profile · ${d.profile.anon_id}`}
        subtitle={`${d.profile.unit || '—'}${d.profile.designation ? ` · ${d.profile.designation}` : ''}${d.profile.deployment_status ? ` · ${d.profile.deployment_status} deployment` : ''}`}
        action={<Link to="/officer/personnel"><Button variant="ghost" size="sm"><ArrowLeft size={14} /> Register</Button></Link>}
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <Card delay={0} className="lg:col-span-2" title="Latest AI indicator"
              subtitle={d.latest_prediction?.created_at ? `Updated ${fmtDateTime(d.latest_prediction.created_at)}` : 'No analysis yet'}>
          {d.latest_prediction ? (
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${riskBadge(d.latest_prediction.risk_level)}`}>
                  {d.latest_prediction.risk_level}
                </span>
                <span className="text-xs text-slate-400">score {Math.round(d.latest_prediction.risk_score * 100)}% · confidence {Math.round(d.latest_prediction.confidence * 100)}%</span>
              </div>

              {d.latest_prediction.sub_scores && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {([['Stress', d.latest_prediction.sub_scores.stress],
                     ['Burnout', d.latest_prediction.sub_scores.burnout],
                     ['Fatigue', d.latest_prediction.sub_scores.fatigue]] as const).map(([label, v]) => (
                    <div key={label} className="rounded-xl bg-subtle p-3 ring-1 ring-line text-center">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
                      <p className={`mt-1 text-xl font-extrabold ${v >= 70 ? 'text-rose-300' : v >= 40 ? 'text-amber-300' : 'text-emerald-300'}`}>{v}</p>
                    </div>
                  ))}
                </div>
              )}

              <ul className="mt-4 space-y-1.5">
                {d.latest_prediction.top_factors.map((f) => (
                  <li key={f.name} className="flex items-center gap-2 text-xs text-slate-300">
                    <span className={`h-1.5 w-1.5 rounded-full ${f.direction === 'increasing' ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                    <span className="flex-1 truncate">{f.name}</span>
                    <span className="font-semibold">{f.direction === 'increasing' ? '+' : '−'}{Math.round(f.impact * 100)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <Empty icon={<CalendarCheck size={22} />} title="No check-ins recorded" />
          )}
        </Card>

        <Card delay={0.06} className="lg:col-span-3" title="Profile snapshot"
              subtitle={`Service: ${d.profile.years_of_service != null ? `${d.profile.years_of_service} yrs` : '—'} · Leave: ${d.profile.leave_balance_summary || '—'}`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <Briefcase size={12} /> Deployments (last 6)
              </p>
              <ul className="mt-2 space-y-1.5">
                {d.deployments.length ? d.deployments.map((dep, i) => (
                  <li key={i} className="rounded-lg bg-subtle px-3 py-2 text-xs ring-1 ring-line">
                    <span className="font-medium text-slate-200">{dep.type}</span>
                    <span className="text-slate-500"> · {dep.location} · </span>
                    <span className={dep.status === 'active' ? 'font-semibold text-emerald-300' : 'text-slate-500'}>
                      {dep.status}
                    </span>
                    <span className="block text-[10px] text-slate-600">
                      {fmtDate(dep.started_on)} – {dep.ended_on ? fmtDate(dep.ended_on) : 'present'}
                    </span>
                  </li>
                )) : <li className="text-xs text-slate-500">None recorded.</li>}
              </ul>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <Plane size={12} /> Leave history
              </p>
              <ul className="mt-2 space-y-1.5">
                {d.leave_records.length ? d.leave_records.slice(0, 6).map((lv, i) => (
                  <li key={i} className="rounded-lg bg-subtle px-3 py-2 text-xs ring-1 ring-line">
                    <span className="font-medium text-slate-200">{lv.type}</span>
                    <span className="text-slate-500"> · {lv.days} days · {lv.status}</span>
                    <span className="block text-[10px] text-slate-600">{fmtDate(lv.start_date)} – {fmtDate(lv.end_date)}</span>
                  </li>
                )) : <li className="text-xs text-slate-500">None recorded.</li>}
              </ul>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card delay={0.12} title="30-day trends" subtitle="Stress index, sleep & workload">
          {d.trends.some((t) => t.stress_index != null)
            ? <TrendFallback rows={d.recent_checkins} />
            : <Empty icon={<CloudRain size={20} />} title="Not enough data" hint="Charts appear after more check-ins." />}
        </Card>

        <Card delay={0.18} title="Recent check-ins" subtitle="Most recent first"
              action={<HeartPulse size={15} className="text-emerald-400/80" />}>
          <ul className="space-y-2">
            {d.recent_checkins.slice(0, 8).map((c, i) => (
              <li key={i} className="rounded-xl bg-subtle px-3 py-2.5 ring-1 ring-line">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-200">{fmtDate(c.date)}</span>
                  <span className="text-slate-500">
                    feeling {c.feeling}/5 · sleep {c.sleep_quality}/5 · load {c.workload}/5
                    {c.energy_level ? ` · energy ${c.energy_level}/4` : ''}
                  </span>
                </div>
                {c.comment && <p className="mt-1 text-[11px] italic leading-relaxed text-slate-400">“{c.comment}”</p>}
              </li>
            ))}
            {!d.recent_checkins.length && <li className="text-xs text-slate-500">No check-ins yet.</li>}
          </ul>
        </Card>
      </div>

      {d.interventions.length > 0 && (
        <div className="mt-4">
          <Card delay={0.24} title="Intervention history" subtitle="Welfare support record">
            <ul className="space-y-2">
              {d.interventions.map((iv) => (
                <li key={iv.id} className="rounded-xl bg-subtle px-3 py-2.5 ring-1 ring-line">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
                    <span className="font-medium text-slate-200">{iv.action}</span>
                    <span className="text-slate-500">{iv.officer} · {fmtDate(iv.created_at)} · {iv.status}</span>
                  </div>
                  {iv.notes && <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{iv.notes}</p>}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      <div className="mt-4 space-y-3">
        <AIBanner />
        <p className="text-[11px] leading-relaxed text-slate-500">
          You are viewing authorized welfare information. Any follow-up must be supportive,
          voluntary and confidential — never disciplinary.
        </p>
      </div>
    </>
  )
}

function TrendFallback({ rows }: { rows: { date: string; feeling: number; workload: number; sleep_quality: number }[] }) {
  // derive a lightweight trend list when full assessment rows are unavailable
  const items = rows.slice(0, 10).map((r) => ({
    date: r.date,
    feeling: r.feeling,
    sleep_quality: r.sleep_quality,
    fatigue: Math.max(1, r.workload),
    workload: r.workload,
    job_satisfaction: 3,
    duty_hours: 8,
    overtime: false,
    rest_breaks: 'Adequate' as const,
    comment: null,
  }))
  return <WellbeingTrendsChart rows={items} />
}
