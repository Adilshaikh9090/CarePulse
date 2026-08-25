import { useState } from 'react'
import { BellPlus, CheckCircle2, Clock, LifeBuoy, Sparkles, XCircle } from 'lucide-react'
import * as api from '../../services'
import { useAsync } from '../../hooks/useAsync'
import type { RecommendationItem } from '../../types'
import { Badge, Button, Card, Empty, ErrorNote, Modal, PageHeader, Select, Spinner } from '../../components/ui'
import { fmtDate, statusLabel } from '../../utils/format'

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'completed', label: 'Completed' },
  { value: 'dismissed', label: 'Dismissed' },
]

const TIER_META = {
  high: { label: 'High Priority', dot: 'bg-rose-400', chip: 'bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/25' },
  recommended: { label: 'Recommended', dot: 'bg-amber-400', chip: 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/25' },
  optional: { label: 'Optional', dot: 'bg-sky-400', chip: 'bg-sky-500/10 text-sky-300 ring-1 ring-sky-500/25' },
} as const

function TierChip({ item }: { item: RecommendationItem }) {
  const meta = TIER_META[item.tier ?? (item.priority <= 2 ? 'recommended' : 'optional')]
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.chip}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

export default function Recommendations() {
  const [filter, setFilter] = useState('')
  const list = useAsync(() => api.fetchRecommendations(filter || undefined), true, [filter])
  const [busyId, setBusyId] = useState<number | null>(null)
  const [supportItem, setSupportItem] = useState<RecommendationItem | null>(null)

  const act = async (id: number, action: string) => {
    setBusyId(id)
    try {
      await api.recommendAction(id, action)
      await list.reload()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Personalized welfare recommendations"
        subtitle="Supportive, voluntary actions suggested by your wellbeing patterns."
        action={
          <div className="w-40"><Select value={filter} onChange={setFilter} options={FILTERS} /></div>
        }
      />

      {list.status === 'loading' ? <Spinner /> : list.error ? <ErrorNote message={list.error} onRetry={list.reload} /> :
        !list.data?.items.length ? (
          <Card><Empty icon={<Sparkles size={26} />} title="Nothing here right now" hint="New recommendations appear after your next check-in." /></Card>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {list.data.items.map((r) => {
              const done = r.status === 'completed' || r.status === 'accepted'
              const snoozed = !!r.snoozed_until && new Date(r.snoozed_until) > new Date()
              return (
                <li key={r.id} className={`flex flex-col glass rounded-2xl p-4 ring-1 ring-line card-elevate ${done ? 'opacity-70' : ''}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <TierChip item={r} />
                    <Badge tone={r.status === 'pending'
                      ? 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30'
                      : done
                        ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
                        : 'bg-hoverc text-slate-400 ring-1 ring-linestrong'}>
                      {statusLabel(r.status)}
                    </Badge>
                  </div>
                  <h3 className="mt-2 text-sm font-semibold leading-snug text-slate-100">{r.title}</h3>
                  <p className="mt-1.5 flex-1 text-xs leading-relaxed text-slate-400">{r.reason}</p>

                  {(r.actions?.length ?? 0) > 0 && !done && (
                    <ul className="mt-2 space-y-1">
                      {r.actions!.map((a) => (
                        <li key={a} className="text-[11px] leading-relaxed text-slate-300">• {a}</li>
                      ))}
                    </ul>
                  )}

                  <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Clock size={11} /> Suggested: {r.timeframe} · added {fmtDate(r.created_at)}
                    {snoozed && <> · reminder set {fmtDate(r.snoozed_until!)}</>}
                  </p>

                  {!done ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" loading={busyId === r.id} onClick={() => act(r.id, 'completed')}>
                        <CheckCircle2 size={13} /> Mark as Done
                      </Button>
                      {!snoozed && (
                        <Button size="sm" variant="ghost" disabled={busyId === r.id}
                                onClick={() => act(r.id, 'remind_later')}>
                          <BellPlus size={13} /> Remind Me Later
                        </Button>
                      )}
                      {r.support_text && (
                        <Button size="sm" variant="ghost" onClick={() => setSupportItem(r)}>
                          <LifeBuoy size={13} /> View Support
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" disabled={busyId === r.id}
                              onClick={() => act(r.id, 'dismissed')}>
                        <XCircle size={13} /> Dismiss
                      </Button>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}

      <Modal open={!!supportItem} onClose={() => setSupportItem(null)}
             title={supportItem ? `${supportItem.title} — support` : 'Support'}>
        <p className="mb-3 rounded-lg bg-sky-500/10 px-3 py-2 text-xs leading-relaxed text-sky-200/90 ring-1 ring-sky-500/20">
          Support is always voluntary and confidential — choosing help never affects your record.
        </p>
        <ul className="space-y-2.5">
          {supportItem?.support_text?.split('\n').filter(Boolean).map((line) => (
            <li key={line} className="flex items-start gap-2 text-sm leading-relaxed text-slate-300">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-400/80" />
              {line}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-end">
          <Button size="sm" variant="ghost" onClick={() => setSupportItem(null)}>Close</Button>
        </div>
      </Modal>
    </>
  )
}
