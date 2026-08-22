import { useState } from 'react'
import { AlertTriangle, ShieldCheck } from 'lucide-react'
import * as api from '../../services'
import { useAsync } from '../../hooks/useAsync'
import {
  Badge, Button, Card, Empty, ErrorNote, Field, PageHeader, Select, Spinner,
} from '../../components/ui'
import { StatCard } from '../../components/cards'
import { fmtDateTime, sevColor, statusLabel } from '../../utils/format'

export default function EarlyWarning() {
  const [sev, setSev] = useState('')
  const { data, status, error, reload } = useAsync(() => api.fetchAlerts(sev ? `severity=${sev}` : ''), true, [sev])
  const [reviewing, setReviewing] = useState<number | null>(null)
  const [decisionFor, setDecisionFor] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [flash, setFlash] = useState<string | null>(null)

  const decide = async (id: number, decision: string) => {
    setReviewing(id)
    try {
      const res = await api.reviewAlert(id, decision, notes || undefined)
      setFlash(res.message)
      setDecisionFor(null); setNotes('')
      await reload()
    } catch (e) {
      setFlash(e instanceof Error ? e.message : 'Review failed.')
    } finally {
      setReviewing(null)
    }
  }

  if (status === 'loading') return <Spinner label="Loading early-warning signals…" />
  if (error) return <ErrorNote message={error} onRetry={reload} />
  const counts = data!.open_counts

  return (
    <>
      <PageHeader
        title="Early Warning Center"
        subtitle="Aggregated and individual signals that may warrant supportive human review. No automated actions are taken."
        action={
          <div className="w-44"><Select value={sev} onChange={setSev} options={[
            { value: '', label: 'All severities' },
            { value: 'high', label: 'High severity' },
            { value: 'moderate', label: 'Moderate' },
            { value: 'low', label: 'Low' },
          ]} /></div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="High-severity open" value={counts.high ?? 0} tone="rose" icon={<AlertTriangle size={15} />} sub="priority review" />
        <StatCard label="Moderate open" value={counts.moderate ?? 0} tone="amber" sub="watch closely" />
        <StatCard label="Low / informational" value={counts.low ?? 0} tone="sky" sub="monitor" />
      </div>

      {flash && (
        <p className="mt-4 rounded-xl bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200 ring-1 ring-emerald-500/25">{flash}</p>
      )}

      <div className="mt-4 space-y-3">
        {!data!.items.length && <Card><Empty icon={<ShieldCheck size={26} />} title="No open alerts" hint="All clear for this filter." /></Card>}
        {data!.items.map((a) => (
          <article key={a.id} className="rounded-2xl bg-navy-800/80 p-4 ring-1 ring-white/5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
                        style={{ background: `${sevColor(a.severity)}22`, color: sevColor(a.severity) }}>
                    {a.severity}
                  </span>
                  <Badge>{a.scope === 'unit' ? `Unit · ${a.subject_label}` : a.subject_label}</Badge>
                  <code className="text-[11px] text-slate-500">{a.code}</code>
                  <span className="text-[11px] text-slate-600">{fmtDateTime(a.detected_at)}</span>
                </div>
                <h3 className="mt-1.5 text-sm font-semibold text-slate-100">{a.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  <strong className="text-slate-300">Detected factors:</strong> {(a.factors ?? []).join(', ') || '—'}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  <strong className="text-slate-300">Suggested support:</strong> {a.recommendation}
                </p>
              </div>
              <Badge tone={a.status !== 'open'
                ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
                : 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30'}>
                {statusLabel(a.status)}
              </Badge>
            </div>

            {a.status === 'open' && (
              decisionFor === a.id ? (
                <div className="mt-3 space-y-2.5 rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/10">
                  <Field label="Reviewer notes (optional)">
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                              className="w-full rounded-lg border-0 bg-navy-700 px-3 py-2 text-xs text-slate-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-sky-500"
                              placeholder="Context for the welfare team…" maxLength={1000} />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" loading={reviewing === a.id} onClick={() => decide(a.id, 'confirm_support')}>
                      Confirm & arrange support
                    </Button>
                    <Button size="sm" variant="subtle" disabled={reviewing === a.id}
                            onClick={() => decide(a.id, 'follow_up')}>
                      Schedule follow-up
                    </Button>
                    <Button size="sm" variant="ghost" disabled={reviewing === a.id}
                            onClick={() => decide(a.id, 'no_action')}>
                      Close — no action needed
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-3"><Button size="sm" variant="subtle" onClick={() => setDecisionFor(a.id)}>
                  Review alert
                </Button></div>
              )
            )}
          </article>
        ))}
      </div>
    </>
  )
}
