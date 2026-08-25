import { CalendarCheck, Bell, HeartPulse, ShieldAlert } from 'lucide-react'
import * as api from '../services'
import { useAsync } from '../hooks/useAsync'
import { Button, Card, Empty, ErrorNote, PageHeader, Spinner } from '../components/ui'
import { fmtDateTime } from '../utils/format'

const CAT_META: Record<string, { Icon: typeof Bell; chip: string }> = {
  checkin_reminder: { Icon: CalendarCheck, chip: 'bg-sky-500/10 text-sky-300 ring-sky-500/25' },
  support: { Icon: HeartPulse, chip: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/25' },
  alert: { Icon: ShieldAlert, chip: 'bg-rose-500/10 text-rose-300 ring-rose-500/25' },
}

export default function NotificationCenter() {
  const list = useAsync(() => api.fetchNotifications(), true)

  if (list.status === 'loading') return <Spinner label="Loading your inbox…" />
  if (list.error) return <ErrorNote message={list.error} onRetry={list.reload} />
  const items = list.data?.items ?? []

  const markAll = async () => { await api.markAllNotificationsRead(); list.reload() }

  return (
    <>
      <PageHeader title="Notification center"
                  subtitle="Gentle reminders and supportive updates only — never disciplinary."
                  action={list.data && list.data.unread_count > 0 ? (
                    <Button variant="subtle" size="sm" onClick={markAll}>Mark all read ({list.data.unread_count})</Button>
                  ) : undefined} />

      <Card delay={0}>
        {items.length ? (
          <ul className="space-y-2">
            {items.map((n) => {
              const meta = CAT_META[n.category] ?? { Icon: Bell, chip: 'bg-subtle text-slate-300 ring-line' }
              return (
                <li key={n.id}
                    className={`flex items-start gap-3 rounded-xl p-3.5 ring-1 ring-line transition-colors ${
                      !n.read ? 'bg-sky-500/[0.06]' : 'bg-subtle'}`}>
                  <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${meta.chip}`}>
                    <meta.Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-100">{n.title}</p>
                      {!n.read && <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[9px] font-bold uppercase text-sky-300">new</span>}
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{n.body}</p>
                    <p className="mt-1 text-[10px] text-slate-600">{fmtDateTime(n.created_at)}</p>
                  </div>
                  {!n.read && (
                    <Button size="sm" variant="ghost"
                            onClick={() => api.markNotificationRead(n.id).then(list.reload)}>
                      Mark read
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <Empty icon={<Bell size={24} />} title="Inbox zero" hint="Reminders and supportive updates will land here." />
        )}
      </Card>
    </>
  )
}
