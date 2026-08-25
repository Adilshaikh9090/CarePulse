import { Link } from 'react-router-dom'
import {
  Activity, CalendarCheck, ChevronRight, CloudRain, FlaskConical, HeartHandshake,
  LifeBuoy, Mail, Moon, Phone, Plane, TrendingUp,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import * as api from '../../services'
import { useAsync } from '../../hooks/useAsync'
import AIProcessing from '../../components/AIProcessing'
import AIBanner from '../../components/AIBanner'
import ChatAssistant from '../../components/ChatAssistant'
import { Card, DisclaimerNote, Empty, ErrorNote, PageHeader, Spinner, Button } from '../../components/ui'
import { GaugeRing } from '../../components/cards'
import { WellbeingTrendsChart } from '../../components/charts'
import { fmtDate, riskBadge } from '../../utils/format'

export default function PersonnelDashboard() {
  const { user } = useAuth()
  const latest = useAsync(() => api.fetchLatestPrediction(), true)
  const history = useAsync(() => api.fetchAssessments(30), true)
  const recs = useAsync(() => api.fetchRecommendations('pending'), true)
  const duties = useAsync(() => api.fetchDuties(), true)
  const leave = useAsync(() => api.fetchLeave(), true)

  if (latest.status === 'loading' && history.status === 'loading') return <Spinner label="Loading your wellbeing space…" />
  const pred = latest.data

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user?.full_name.split(' ')[0]}`}
        subtitle="Your personal wellbeing overview. Everything here stays confidential."
        action={<Link to="/app/prediction-demo"><Button variant="subtle" size="sm"><FlaskConical size={14} /> Try Demo</Button></Link>}
      />

      {latest.status === 'loading' && <AIProcessing label="Fetching your latest indicators" />}

      {!pred ? (
        <Card>
          <Empty
            title="No assessment yet"
            hint="Complete your daily check-in to unlock your AI welfare-risk indicator and personalized recommendations."
            icon={<CalendarCheck size={28} />}
          />
          <div className="flex justify-center pb-4">
            <Link to="/app/checkin"><Button>Start daily check-in</Button></Link>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          <Card delay={0} className="lg:col-span-2" title="Current welfare-risk indicator" subtitle={pred.timestamp ? `Updated ${fmtDate(pred.timestamp)}` : undefined}>
            <div className="flex items-center gap-4">
              <GaugeRing score={pred.risk_score} level={pred.risk_level} />
              <div className="space-y-2 text-sm">
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${riskBadge(pred.risk_level)}`}>
                  {pred.risk_level}
                </span>
                <p className="text-xs leading-relaxed text-slate-400">
                  Model confidence <strong className="text-slate-200">{Math.round(pred.confidence * 100)}%</strong>
                </p>
                <Link to="/app/prediction" className="inline-flex items-center gap-1 text-xs font-medium text-sky-300 hover:text-sky-200">
                  View full explanation <ChevronRight size={13} />
                </Link>
              </div>
            </div>
          </Card>

          <Card delay={0.08} className="lg:col-span-3" title="What the model noticed" subtitle="Top contributing factors right now">
            {pred.sub_scores && (
              <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {([['Stress', pred.sub_scores.stress, Activity],
                   ['Burnout', pred.sub_scores.burnout, CloudRain],
                   ['Fatigue', pred.sub_scores.fatigue, TrendingUp]] as const).map(([label, val, Icon]) => (
                  <div key={label} className="rounded-xl bg-subtle p-3 ring-1 ring-line">
                    <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-500">
                      <Icon size={11} /> {label}
                    </p>
                    <div className="mt-1.5 flex items-baseline justify-between">
                      <span className={`text-lg font-extrabold ${val >= 70 ? 'text-rose-300' : val >= 40 ? 'text-amber-300' : 'text-emerald-300'}`}>
                        {val}
                      </span>
                      <span className="text-[10px] text-slate-600">/100</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <ul className="space-y-2">
              {pred.top_factors.map((f) => (
                <li key={f.name} className="flex items-center gap-3 rounded-xl bg-subtle px-3 py-2.5 ring-1 ring-line">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${f.direction === 'increasing' ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-200">{f.name}</p>
                    <p className="truncate text-[11px] text-slate-500">{f.description}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-slate-300">{Math.round(f.impact * 100)}%</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card delay={0.16} className="lg:col-span-3"
              title="30-day wellbeing trends"
              subtitle="Stress index vs fatigue, workload and sleep quality"
              action={<Link to="/app/checkin"><Button variant="subtle" size="sm">New check-in</Button></Link>}>
          {history.data?.items?.length ? (
            <WellbeingTrendsChart rows={history.data.items} />
          ) : history.error ? <ErrorNote message={history.error} onRetry={history.reload} /> :
            <Empty icon={<TrendingUp size={24} />} title="Not enough data yet" hint="Charts appear after a few days of check-ins." />}
        </Card>

        <Card delay={0.24} className="lg:col-span-2" title="Pending recommendations"
              action={<Link to="/app/recommendations"><Button variant="ghost" size="sm">All</Button></Link>}>
          {recs.data?.items?.length ? (
            <ul className="space-y-2">
              {recs.data.items.slice(0, 4).map((r) => {
                const dot = r.tier === 'high' ? 'bg-rose-400' : r.tier === 'recommended' ? 'bg-amber-400' : 'bg-sky-400'
                return (
                  <li key={r.id} className="flex items-start gap-2.5 rounded-xl bg-subtle px-3 py-2.5 ring-1 ring-line">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
                    <div>
                      <p className="text-xs font-medium leading-snug text-slate-200">{r.title}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">{r.timeframe}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <Empty icon={<Moon size={22} />} title="You're all caught up" hint="New suggestions appear after your next check-in." />
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card delay={0.28} className="md:col-span-2" title="Upcoming duties" subtitle="Next scheduled assignments">
          {duties.data?.items?.length ? (
            <ul className="space-y-2">
              {duties.data.items.slice(0, 4).map((d) => (
                <li key={d.id} className="flex items-center gap-3 rounded-xl bg-subtle px-3 py-2.5 ring-1 ring-line">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-300 ring-1 ring-sky-500/25">
                    <CalendarCheck size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-200">{d.title}</p>
                    <p className="text-[11px] text-slate-500">{fmtDate(d.date)} · {d.shift} shift · {d.location}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon={<CalendarCheck size={22} />} title="No upcoming duties" hint="New assignments will appear here." />
          )}
        </Card>

        <Card delay={0.34} title="Leave balance" subtitle={`Year ${leave.data?.year ?? new Date().getFullYear()}`}
              action={<Plane size={15} className="text-sky-400/80" />}>
          {leave.data?.summary ? (
            <ul className="space-y-2.5">
              {Object.entries(leave.data.summary).slice(0, 4).map(([type, v]) => (
                <li key={type}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium text-slate-300">{type}</span>
                    <span className="text-slate-500">{v.remaining}/{v.entitled} left</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-hoverc">
                    <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-violet-500"
                         style={{ width: `${Math.round(100 * v.used / Math.max(v.entitled, 1))}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon={<Plane size={20} />} title="Leave data loading" />
          )}
        </Card>

        <Card delay={0.4} title="Support & emergency" subtitle="Always voluntary, always confidential"
              action={<LifeBuoy size={15} className="text-emerald-400/80" />}>
          <ul className="space-y-2 text-xs">
            <li className="flex items-center gap-2 rounded-xl bg-subtle px-3 py-2.5 ring-1 ring-line">
              <HeartHandshake size={14} className="shrink-0 text-emerald-400" />
              <div><p className="font-medium text-slate-200">Welfare officer</p>
                <p className="text-[11px] text-slate-500">Confidential talk — request via support plan</p></div>
            </li>
            <li className="flex items-center gap-2 rounded-xl bg-subtle px-3 py-2.5 ring-1 ring-line">
              <Phone size={14} className="shrink-0 text-sky-400" />
              <div><p className="font-medium text-slate-200">KIRAN helpline</p>
                <p className="text-[11px] text-slate-500">1800-599-0019 · 24×7 · free</p></div>
            </li>
            <li className="flex items-center gap-2 rounded-xl bg-subtle px-3 py-2.5 ring-1 ring-line">
              <Mail size={14} className="shrink-0 text-violet-400" />
              <div><p className="font-medium text-slate-200">AASRA</p>
                <p className="text-[11px] text-slate-500">aasra.info · 24×7 crisis support</p></div>
            </li>
          </ul>
        </Card>
      </div>

      <div className="mt-4 space-y-3">
        <AIBanner />
        <DisclaimerNote>
          Welfare-risk indicators are supportive signals — never diagnoses or employment judgments.
          Individual responses remain confidential; only anonymized aggregates are visible to authorized staff.
        </DisclaimerNote>
      </div>

      <ChatAssistant />
    </>
  )
}
