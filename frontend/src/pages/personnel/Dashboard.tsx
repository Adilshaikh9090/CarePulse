import { Link } from 'react-router-dom'
import { CalendarCheck, ChevronRight, Moon, Sparkles, TrendingUp } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import * as api from '../../services'
import { useAsync } from '../../hooks/useAsync'
import AIProcessing from '../../components/AIProcessing'
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

  if (latest.status === 'loading' && history.status === 'loading') return <Spinner label="Loading your wellbeing space…" />
  const pred = latest.data

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user?.full_name.split(' ')[0]}`}
        subtitle="Your personal wellbeing overview. Everything here stays confidential."
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
          <Card className="lg:col-span-2" title="Current welfare-risk indicator" subtitle={pred.timestamp ? `Updated ${fmtDate(pred.timestamp)}` : undefined}>
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

          <Card className="lg:col-span-3" title="What the model noticed" subtitle="Top contributing factors right now">
            <ul className="space-y-2">
              {pred.top_factors.map((f) => (
                <li key={f.name} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5 ring-1 ring-white/5">
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
        <Card className="lg:col-span-3"
              title="30-day wellbeing trends"
              subtitle="Stress index vs fatigue, workload and sleep quality"
              action={<Link to="/app/checkin"><Button variant="subtle" size="sm">New check-in</Button></Link>}>
          {history.data?.items?.length ? (
            <WellbeingTrendsChart rows={history.data.items} />
          ) : history.error ? <ErrorNote message={history.error} onRetry={history.reload} /> :
            <Empty icon={<TrendingUp size={24} />} title="Not enough data yet" hint="Charts appear after a few days of check-ins." />}
        </Card>

        <Card className="lg:col-span-2" title="Pending recommendations"
              action={<Link to="/app/recommendations"><Button variant="ghost" size="sm">All</Button></Link>}>
          {recs.data?.items?.length ? (
            <ul className="space-y-2">
              {recs.data.items.slice(0, 4).map((r) => (
                <li key={r.id} className="flex items-start gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2.5 ring-1 ring-white/5">
                  <Sparkles size={14} className="mt-0.5 shrink-0 text-violet-300" />
                  <div>
                    <p className="text-xs font-medium leading-snug text-slate-200">{r.title}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{r.timeframe}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon={<Moon size={22} />} title="You're all caught up" hint="New suggestions appear after your next check-in." />
          )}
        </Card>
      </div>

      <div className="mt-4">
        <DisclaimerNote>
          Welfare-risk indicators are supportive signals — never diagnoses or employment judgments.
          Individual responses remain confidential; only anonymized aggregates are visible to authorized staff.
        </DisclaimerNote>
      </div>

      <ChatAssistant />
    </>
  )
}
