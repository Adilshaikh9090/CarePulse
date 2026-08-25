import { Activity, CloudRain, HeartPulse, Sparkles } from 'lucide-react'
import * as api from '../../services'
import { useAsync } from '../../hooks/useAsync'
import type { RiskFactorT } from '../../types'
import AIBanner from '../../components/AIBanner'
import { Card, Empty, ErrorNote, PageHeader, Spinner } from '../../components/ui'
import { fmtDate, riskBadge } from '../../utils/format'

const SUB_META = [
  { key: 'stress' as const, label: 'Stress', Icon: Activity,
    blurb: 'Pressure you feel from duties and workload.' },
  { key: 'burnout' as const, label: 'Burnout', Icon: CloudRain,
    blurb: 'Long-horizon exhaustion from sustained strain.' },
  { key: 'fatigue' as const, label: 'Fatigue', Icon: HeartPulse,
    blurb: 'Physical and mental tiredness right now.' },
]

function tone(v: number) {
  return v >= 70 ? 'text-rose-300' : v >= 40 ? 'text-amber-300' : 'text-emerald-300'
}
function ringColor(v: number) {
  return v >= 70 ? '#fb7185' : v >= 40 ? '#fbbf24' : '#34d399'
}

function ScoreDial({ label, value, Icon }: { label: string; value: number; Icon: typeof Activity }) {
  const r = 52
  const c = 2 * Math.PI * r
  return (
    <div className="flex flex-col items-center rounded-2xl bg-subtle p-5 ring-1 ring-line">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        <Icon size={13} /> {label}
      </p>
      <div className="relative mt-3 h-32 w-32">
        <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
          <circle cx="64" cy="64" r={r} fill="none" stroke="currentColor"
                  className="text-hoverc" strokeWidth="10" />
          <circle cx="64" cy="64" r={r} fill="none" stroke={ringColor(value)} strokeWidth="10"
                  strokeLinecap="round" strokeDasharray={c}
                  strokeDashoffset={c - (c * Math.min(Math.max(value, 0), 100)) / 100} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-3xl font-extrabold ${tone(value)}`}>{value}</span>
        </div>
      </div>
      <span className="mt-2 text-[10px] text-slate-500">of 100</span>
    </div>
  )
}

function FactorChip({ f }: { f: RiskFactorT }) {
  const inc = f.direction === 'increasing'
  return (
    <span title={f.description}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ring-1 ${
            inc ? 'bg-rose-500/10 text-rose-200 ring-rose-500/30'
                : 'bg-emerald-500/10 text-emerald-200 ring-emerald-500/30'}`}>
      <Activity size={11} />
      {f.name} {inc ? '+' : '−'}{Math.round(f.impact * 100)}%
    </span>
  )
}

export default function AiAnalytics() {
  const latest = useAsync(() => api.fetchLatestPrediction(), true)

  if (latest.status === 'loading') return <Spinner label="Loading your AI wellness insights…" />
  if (latest.error) return <ErrorNote message={latest.error} onRetry={latest.reload} />
  const pred = latest.data
  if (!pred) {
    return (
      <>
        <PageHeader title="AI analytics & insights" subtitle="Personal wellness indicators explained." />
        <Card><Empty icon={<Sparkles size={26} />} title="No analysis yet"
                     hint="Complete a daily check-in to generate your personal indicators." /></Card>
      </>
    )
  }

  const subs = pred.sub_scores ?? { stress: 0, burnout: 0, fatigue: 0 }
  const recs = pred.recommendations || []

  return (
    <>
      <PageHeader title="AI analytics & insights"
                  subtitle={`Latest analysis ${pred.created_at || pred.timestamp ? fmtDate(pred.created_at || pred.timestamp!) : ''} · level ${pred.risk_level}`}
                  action={<span className={`rounded-full px-3 py-1 text-xs font-bold ${riskBadge(pred.risk_level)}`}>{pred.risk_level}</span>} />

      <div className="grid gap-4 md:grid-cols-3">
        {SUB_META.map(({ key, label, Icon }, i) => (
          <Card key={key} delay={i * 0.06}>
            <ScoreDial label={label} value={subs[key] ?? 0} Icon={Icon} />
            <p className="mt-3 text-center text-xs leading-relaxed text-slate-400">{SUB_META[i].blurb}</p>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card delay={0.18} className="lg:col-span-3" title="Contributing factors"
              subtitle="How much each signal moves your indicator">
          <div className="space-y-2">
            {(pred.all_factors || pred.top_factors).slice(0, 8).map((f) => (
              <div key={f.name} className="rounded-xl bg-subtle px-3 py-2.5 ring-1 ring-line">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-slate-200">{f.name}</p>
                  <FactorChip f={f} />
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-hoverc">
                  <div className={`h-full rounded-full ${f.direction === 'increasing' ? 'bg-gradient-to-r from-rose-500 to-red-400' : 'bg-gradient-to-r from-emerald-500 to-teal-400'}`}
                       style={{ width: `${Math.min(100, Math.round(f.impact * 100))}%` }} />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">{f.description}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card delay={0.24} className="lg:col-span-2" title="Recommended interventions"
              subtitle="Voluntary steps that fit your current pattern">
          {recs.length ? (
            <ul className="space-y-2">
              {recs.map((r) => (
                <li key={r} className="flex items-start gap-2 rounded-xl bg-subtle px-3 py-2.5 ring-1 ring-line text-xs leading-relaxed text-slate-300">
                  <Sparkles size={13} className="mt-0.5 shrink-0 text-violet-300" /> {r}
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon={<Sparkles size={20} />} title="Nothing needed right now" hint="Your indicators look steady." />
          )}
          <p className="mt-4 rounded-xl bg-subtle px-3 py-2.5 text-[11px] leading-relaxed text-slate-400 ring-1 ring-line">
            {pred.explanation}
          </p>
        </Card>
      </div>

      <div className="mt-4 space-y-3">
        <AIBanner text={pred.disclaimer} />
      </div>
    </>
  )
}
