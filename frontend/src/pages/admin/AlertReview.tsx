import { useState } from 'react'
import { ClipboardCheck } from 'lucide-react'
import * as api from '../../services'
import { useAsync } from '../../hooks/useAsync'
import { Badge, Button, Card, Empty, ErrorNote, PageHeader, Select, Spinner } from '../../components/ui'
import { StatCard } from '../../components/cards'
import { fmtDate, statusLabel } from '../../utils/format'

export default function AlertReview() {
  const [statusF, setStatusF] = useState('')
  const { data, status, error, reload } = useAsync(
    () => api.fetchAlerts(statusF ? `status_filter=${statusF}` : ''), true, [statusF])
  const counts = data?.open_counts ?? {}

  return (
    <>
      <PageHeader
        title="Alert review log"
        subtitle="Full history of early-warning alerts and the human decisions taken on each."
        action={
          <div className="w-48"><Select value={statusF} onChange={setStatusF} options={[
            { value: '', label: 'All statuses' },
            { value: 'open', label: 'Open' },
            { value: 'support_confirmed', label: 'Support confirmed' },
            { value: 'follow_up_scheduled', label: 'Follow-up scheduled' },
            { value: 'closed_no_action', label: 'Closed (no action)' },
          ]} /></div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="High open" value={counts.high ?? 0} tone="rose" />
        <StatCard label="Moderate open" value={counts.moderate ?? 0} tone="amber" />
        <StatCard label="Low open" value={counts.low ?? 0} tone="sky" />
      </div>

      <Card className="mt-4" title="Decision trail">
        {status === 'loading' ? <Spinner /> : error ? <ErrorNote message={error} onRetry={reload} /> :
          !data!.items.length ? (
            <Empty icon={<ClipboardCheck size={26} />} title="No alerts match this filter" />
          ) : (
          <ul className="space-y-2.5">
            {data!.items.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-4 py-3 ring-1 ring-white/5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-200">{a.title}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    <code>{a.code}</code> · {a.scope === 'unit' ? `Unit ${a.subject_label}` : a.subject_label} · detected {fmtDate(a.detected_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize`}
                        style={{ background: `${a.severity === 'high' ? '#f8717122' : a.severity === 'moderate' ? '#fbbf2422' : '#38bdf822'}`,
                                 color: a.severity === 'high' ? '#f87171' : a.severity === 'moderate' ? '#fbbf24' : '#38bdf8' }}>
                    {a.severity}
                  </span>
                  <Badge>{statusLabel(a.status)}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
