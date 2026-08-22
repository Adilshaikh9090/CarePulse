import { useState } from 'react'
import { CheckCircle2, Clock, Sparkles, XCircle } from 'lucide-react'
import * as api from '../../services'
import { useAsync } from '../../hooks/useAsync'
import { Badge, Button, Card, Empty, ErrorNote, PageHeader, Select, Spinner } from '../../components/ui'
import { fmtDate, statusLabel } from '../../utils/format'

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'completed', label: 'Completed' },
  { value: 'dismissed', label: 'Dismissed' },
]

export default function Recommendations() {
  const [filter, setFilter] = useState('')
  const list = useAsync(() => api.fetchRecommendations(filter || undefined), true, [filter])
  const [busyId, setBusyId] = useState<number | null>(null)

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
            {list.data.items.map((r) => (
              <li key={r.id} className="flex flex-col rounded-2xl bg-navy-800/80 p-4 ring-1 ring-white/5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold leading-snug text-slate-100">{r.title}</h3>
                  <Badge tone={r.status === 'pending'
                    ? 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30'
                    : r.status === 'completed' || r.status === 'accepted'
                      ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
                      : 'bg-white/5 text-slate-400 ring-1 ring-white/10'}>
                    {statusLabel(r.status)}
                  </Badge>
                </div>
                <p className="mt-1.5 flex-1 text-xs leading-relaxed text-slate-400">{r.reason}</p>
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Clock size={11} /> Suggested: {r.timeframe} · added {fmtDate(r.created_at)}
                </p>

                {r.status === 'pending' ? (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" loading={busyId === r.id} onClick={() => act(r.id, 'accepted')}>
                      <CheckCircle2 size={13} /> Accept
                    </Button>
                    <Button size="sm" variant="ghost" disabled={busyId === r.id}
                            onClick={() => act(r.id, 'dismissed')}>
                      <XCircle size={13} /> Dismiss
                    </Button>
                  </div>
                ) : (r.status === 'accepted') ? (
                  <Button size="sm" variant="subtle" className="mt-3 self-start" loading={busyId === r.id}
                          onClick={() => act(r.id, 'completed')}>
                    Mark completed
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
    </>
  )
}
