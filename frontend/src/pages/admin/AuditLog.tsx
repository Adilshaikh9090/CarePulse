import { useState } from 'react'
import { Search, ScrollText } from 'lucide-react'
import * as api from '../../services'
import { get } from '../../api/client'
import { useAsync } from '../../hooks/useAsync'
import { Badge, Card, Empty, ErrorNote, Input, PageHeader, Spinner } from '../../components/ui'
import { DataTable } from '../../components/cards'
import { fmtDateTime } from '../../utils/format'
import type { AuditEntry } from '../../types'

export default function AuditLogPage() {
  const [q, setQ] = useState('')
  const { data, status, error, reload } = useAsync(() => {
    const path = q.trim() ? `/welfare/audit-log/search?q=${encodeURIComponent(q.trim())}` : '/admin/audit-log?limit=150'
    return get<{ items: AuditEntry[] }>(path)
  }, true, [q])

  return (
    <>
      <PageHeader
        title="Audit log"
        subtitle="Immutable record of every welfare-relevant action — who did what, and when."
      />

      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search actions, actors, resources…" className="pl-9" />
      </div>

      <Card className="mt-4" title={`${data?.items.length ?? 0} entries`}>
        {status === 'loading' ? <Spinner /> : error ? <ErrorNote message={error} onRetry={reload} /> :
          !data!.items.length ? (
            <Empty icon={<ScrollText size={26} />} title="No audit entries match your search" />
          ) : (
            <DataTable
              rows={data!.items}
              keyOf={(a) => a.timestamp + a.action}
              columns={[
                { header: 'When', cell: (a) => <span className="whitespace-nowrap text-xs text-slate-400">{fmtDateTime(a.timestamp)}</span> },
                {
                  header: 'Actor',
                  cell: (a) => (
                    <div>
                      <p className="font-medium text-slate-200">{a.actor}</p>
                      <p className="text-[11px] capitalize text-slate-500">{a.role?.replace('_', ' ')}</p>
                    </div>
                  ),
                },
                { header: 'Action', cell: (a) => a.action },
                { header: 'Resource', cell: (a) => <Badge>{a.resource}</Badge> },
              ]}
            />
          )}
      </Card>
    </>
  )
}
