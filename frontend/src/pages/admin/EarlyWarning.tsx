import { useState } from 'react'
import { AlertTriangle, ArrowRightCircle, ShieldCheck, UserCheck } from 'lucide-react'
import * as api from '../../services'
import { useAsync } from '../../hooks/useAsync'
import {
  Badge, Button, Card, Empty, ErrorNote, Field, PageHeader, Select, Spinner,
} from '../../components/ui'
import { StatCard } from '../../components/cards'
import { fmtDateTime, sevColor, statusLabel } from '../../utils/format'

const STATUS_TONE: Record<string, string> = {
  new: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30',
  reviewing: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30',
  assigned: 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30',
  resolved: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
  closed_no_action: 'bg-subtle text-slate-400 ring-1 ring-line',
  open: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30',
}

export default function EarlyWarning() {
  const [sev, setSev] = useState('')
  const [st, setSt] = useState('')
  const query = [
    sev ? `severity=${sev}` : '',
    st ? `status=${st}` : '',
  ].filter(Boolean).join('&')
  const { data, status, error, reload } = useAsync(() => api.fetchAlerts(query), true, [query])
  const officers = useAsync(() => api.fetchWelfareOfficers(), true)
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

  const moveStatus = async (id: number, next: string, assign_officer_id?: number) => {
    setReviewing(id)
    try {
      const res = await api.setAlertStatus(id, next, assign_officer_id)
      setFlash(`${res.message}${res.assigned_officer ? ` · ${res.assigned_officer}` : ''}`)
      await reload()
    } catch (e) {
      setFlash(e instanceof Error ? e.message : 'Status update failed.')
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
          <div className="flex gap-2">
            <div className="w-40"><Select value={sev} onChange={setSev} options={[
              { value: '', label: 'All severities' },
              { value: 'critical', label: 'Critical' },
              { value: 'high', label: 'High severity' },
              { value: 'moderate', label: 'Moderate' },
              { value: 'low', label: 'Low' },
            ]} /></div>
            <div className="w-40"><Select value={st} onChange={setSt} options={[
              { value: '', label: 'All statuses' },
              { value: 'new', label: 'New' },
              { value: 'reviewing', label: 'Reviewing' },
              { value: 'assigned', label: 'Assigned' },
              { value: 'resolved', label: 'Resolved' },
            ]} /></div>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Critical open" value={counts.critical ?? 0} tone="violet" icon={<AlertTriangle size={15} />} sub="immediate review" />
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
          <article key={a.id} className="glass rounded-2xl p-4 ring-1 ring-line card-elevate">
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
                  {a.reason_code && (
                    <code className="rounded bg-subtle px-1.5 py-0.5 text-[10px] text-slate-400 ring-1 ring-line">
                      {statusLabel(a.reason_code)}
                    </code>
                  )}
                </div>
                <h3 className="mt-1.5 text-sm font-semibold text-slate-100">{a.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  <strong className="text-slate-300">Detected factors:</strong> {(a.factors ?? []).join(', ') || '—'}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  <strong className="text-slate-300">Suggested support:</strong> {a.recommendation}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Badge tone={STATUS_TONE[a.status] || STATUS_TONE.open}>{statusLabel(a.status)}</Badge>
                {a.assigned_officer_name && (
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <UserCheck size={11} /> {a.assigned_officer_name}
                  </span>
                )}
              </div>
            </div>

            {/* v2 status pipeline */}
            {['new', 'reviewing', 'open'].includes(a.status) && decisionFor !== a.id && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {a.status === 'new' && (
                  <Button size="sm" variant="subtle" loading={reviewing === a.id}
                          onClick={() => moveStatus(a.id, 'reviewing')}>
                    Start review <ArrowRightCircle size={13} />
                  </Button>
                )}
                {officers.data?.items?.length ? (
                  <select defaultValue=""
                          disabled={reviewing === a.id}
                          onChange={(e) => { if (e.target.value) moveStatus(a.id, 'assigned', Number(e.target.value)) }}
                          className="rounded-lg bg-subtle px-2.5 py-1.5 text-[11px] text-slate-200 ring-1 ring-line outline-none focus:ring-linestrong">
                    <option value="" disabled>Assign welfare officer…</option>
                    {officers.data.items.map((o) => (
                      <option key={o.id} value={o.id}>{o.name} — {o.designation}</option>
                    ))}
                  </select>
                ) : null}
                {a.status !== 'new' && (
                  <Button size="sm" variant="ghost" loading={reviewing === a.id}
                          onClick={() => moveStatus(a.id, 'resolved')}>
                    Mark resolved
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setDecisionFor(a.id)}>
                  Full review…
                </Button>
              </div>
            )}

            {decisionFor === a.id && (
              <div className="mt-3 space-y-2.5 rounded-xl bg-subtle p-3 ring-1 ring-linestrong">
                <Field label="Reviewer notes (optional)">
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                            className="w-full rounded-lg border-0 bg-navy-700 px-3 py-2 text-xs text-slate-100 ring-1 ring-linestrong focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                  <Button size="sm" variant="ghost" disabled={reviewing === a.id}
                          onClick={() => setDecisionFor(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </>
  )
}
