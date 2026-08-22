import { useState } from 'react'
import * as api from '../../services'
import { useAsync } from '../../hooks/useAsync'
import { Card, ErrorNote, PageHeader, Select, Spinner, Badge } from '../../components/ui'
import { DataTable, StatCard } from '../../components/cards'
import { ActivityAreaChart, UnitBarsChart } from '../../components/charts'

export default function Analytics() {
  const [days, setDays] = useState('30')
  const overview = useAsync(() => api.fetchAnalyticsOverview(Number(days)), true, [days])
  const trends = useAsync(() => api.fetchUnitTrends(Number(days)), true, [days])

  if (overview.status === 'loading') return <Spinner label="Crunching system analytics…" />
  if (overview.error) return <ErrorNote message={overview.error} onRetry={overview.reload} />
  const o = overview.data!

  return (
    <>
      <PageHeader
        title="System analytics"
        subtitle="Aggregate activity and wellbeing patterns across the organization."
        action={
          <div className="w-40">
            <Select value={days} onChange={setDays} options={[
              { value: '7', label: 'Last 7 days' },
              { value: '30', label: 'Last 30 days' },
              { value: '90', label: 'Last 90 days' },
            ]} />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Check-ins" value={o.assessments_in_window} sub={`last ${days} days`} tone="sky" />
        <StatCard label="Predictions run" value={o.predictions_in_window} sub={`last ${days} days`} tone="violet" />
        <StatCard label="Active users" value={`${o.users.active}/${o.users.total}`} sub="accounts enabled" tone="emerald" />
        <StatCard label="Open alerts" value={o.open_alerts} sub="early-warning queue" tone="amber" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3" title="Daily check-in volume & stress index"
              subtitle="Stress index = average self-reported strain (0–100)">
          <ActivityAreaChart daily={o.daily_activity} />
        </Card>
        <Card className="lg:col-span-2" title="Role distribution"
              subtitle="Accounts by access level">
          <ul className="space-y-2">
            {Object.entries(o.users.by_role).map(([role, n]) => (
              <li key={role} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5 ring-1 ring-white/5">
                <span className="text-sm capitalize text-slate-300">{role.replace('_', ' ')}</span>
                <Badge>{n as number}</Badge>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Interventions by status: {(Object.entries(o.interventions_by_status) as [string, number][])
              .map(([s, n]) => `${s.replace('_', ' ')}: ${n}`).join(' · ') || 'none'}
          </p>
        </Card>
      </div>

      <Card className="mt-4" title="Unit-level wellbeing averages" subtitle={`Indexed to 0–100 · window ${days}d`}
            action={<Badge>anonymized</Badge>}>
        {trends.status === 'loading' ? <Spinner /> : (
          <div className="grid gap-4 lg:grid-cols-2">
            <UnitBarsChart units={(trends.data?.units ?? []).map((u) => ({
              unit: u.unit, avg_workload: u.avg_workload, avg_fatigue: u.avg_fatigue, avg_sleep: u.avg_sleep,
            }))} />
            <DataTable
              rows={trends.data?.units ?? []}
              keyOf={(u) => u.unit}
              columns={[
                { header: 'Unit', cell: (u) => u.unit },
                { header: 'Workload', cell: (u) => `${Math.round(u.avg_workload / 5 * 100)}` },
                { header: 'Fatigue', cell: (u) => `${Math.round(u.avg_fatigue / 5 * 100)}` },
                { header: 'Sleep', cell: (u) => `${Math.round(u.avg_sleep / 5 * 100)}` },
                { header: 'Assessments', cell: (u) => u.assessments },
              ]}
            />
          </div>
        )}
      </Card>
    </>
  )
}
