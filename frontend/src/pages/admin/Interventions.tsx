import { useState } from 'react'
import { HeartPulse, Plus, Search } from 'lucide-react'
import * as api from '../../services'
import { useAsync } from '../../hooks/useAsync'
import {
  Badge, Button, Card, Empty, ErrorNote, Field, Input, Modal,
  PageHeader, Select, Spinner,
} from '../../components/ui'
import { DataTable } from '../../components/cards'
import { StatCard } from '../../components/cards'
import { fmtDate, riskBadge, statusLabel } from '../../utils/format'

const STATUSES = ['pending', 'in_review', 'support_offered', 'completed']

export default function Interventions() {
  const [statusF, setStatusF] = useState('')
  const [search, setSearch] = useState('')
  const { data, status, error, reload } = useAsync(() => {
    const params = new URLSearchParams()
    if (statusF) params.set('status_filter', statusF)
    if (search.trim()) params.set('search', search.trim())
    return api.fetchInterventions(params.toString())
  }, true, [statusF, search])

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ subject: '', action: '', risk: 'Moderate', dueDays: '7' })
  const [busy, setBusy] = useState(false)
  const [rowBusy, setRowBusy] = useState<number | null>(null)

  const create = async () => {
    setBusy(true)
    try {
      await api.createIntervention({
        unit_id: form.subject ? undefined : 1,
        risk_level: form.risk,
        action: form.action || 'Welfare follow-up',
        due_days: Number(form.dueDays) || 7,
      })
      setModalOpen(false); setForm({ subject: '', action: '', risk: 'Moderate', dueDays: '7' })
      await reload()
    } finally { setBusy(false) }
  }

  const advance = async (id: number, current: string) => {
    const next = STATUSES[Math.min(STATUSES.indexOf(current) + 1, STATUSES.length - 1)]
    if (next === current) return
    setRowBusy(id)
    try {
      await api.updateIntervention(id, { status: next })
      await reload()
    } finally { setRowBusy(null) }
  }

  const counts = data?.counts ?? {}
  return (
    <>
      <PageHeader
        title="Welfare interventions"
        subtitle="Human-led support actions triggered by alerts or welfare judgment. All changes are audit-logged."
        action={<Button onClick={() => setModalOpen(true)}><Plus size={15} /> New intervention</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-4">
        {STATUSES.map((s) => (
          <StatCard key={s} label={statusLabel(s)} value={counts[s] ?? 0}
                    tone={s === 'completed' ? 'emerald' : s === 'pending' ? 'amber' : s === 'in_review' ? 'sky' : 'violet'} />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="w-48"><Select value={statusF} onChange={setStatusF} options={[
          { value: '', label: 'All statuses' },
          ...STATUSES.map((s) => ({ value: s, label: statusLabel(s) })),
        ]} /></div>
        <div className="relative min-w-[220px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
                 placeholder="Search subject, action, officer…" className="pl-9" />
        </div>
      </div>

      <Card className="mt-4" title={`${data?.items.length ?? 0} interventions`}>
        {status === 'loading' ? <Spinner /> : error ? <ErrorNote message={error} onRetry={reload} /> :
          !data!.items.length ? (
            <Empty icon={<HeartPulse size={26} />} title="No interventions found" hint="Try clearing the filters." />
          ) : (
            <DataTable
              rows={data!.items}
              keyOf={(i) => i.id}
              columns={[
                { header: 'Subject / Unit', cell: (i) => <span className="font-medium text-slate-200">{i.subject_label}</span> },
                { header: 'Risk', cell: (i) => <Badge tone={riskBadge(i.risk_level)}>{i.risk_level}</Badge> },
                { header: 'Action', cell: (i) => <span className="max-w-xs block truncate">{i.action}</span> },
                { header: 'Officer', cell: (i) => i.officer || '—' },
                { header: 'Due', cell: (i) => fmtDate(i.due_date) },
                {
                  header: 'Status',
                  cell: (i) => (
                    <button disabled={rowBusy === i.id || i.status === 'completed'}
                            onClick={() => advance(i.id, i.status)}
                            title="Click to advance to next stage"
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 transition
                              ${i.status === 'completed'
                                ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/40'
                                : i.status === 'pending'
                                  ? 'bg-amber-500/15 text-amber-300 ring-amber-500/40 hover:bg-amber-500/25'
                                  : i.status === 'in_review'
                                    ? 'bg-sky-500/15 text-sky-300 ring-sky-500/40 hover:bg-sky-500/25'
                                    : 'bg-violet-500/15 text-violet-300 ring-violet-500/40 hover:bg-violet-500/25'}`}>
                      {statusLabel(i.status)}
                    </button>
                  ),
                },
              ]}
            />
          )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create intervention">
        <div className="space-y-3.5">
          <Field label="Action description">
            <Input value={form.action} onChange={(e) => setForm((f) => ({ ...f, action: e.target.value }))}
                   placeholder="e.g. Unit workload rebalancing review" />
          </Field>
          <Field label="Risk level">
            <Select value={form.risk} onChange={(v) => setForm((f) => ({ ...f, risk: v }))}
                    options={['Low', 'Moderate', 'High'].map((r) => ({ value: r, label: r }))} />
          </Field>
          <Field label="Due within (days)">
            <Input type="number" min={1} max={60} value={form.dueDays}
                   onChange={(e) => setForm((f) => ({ ...f, dueDays: e.target.value }))} />
          </Field>
          <p className="text-[11px] leading-relaxed text-slate-500">
            The intervention is assigned to an available welfare officer and logged in the audit trail.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button loading={busy} onClick={create}>Create</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
