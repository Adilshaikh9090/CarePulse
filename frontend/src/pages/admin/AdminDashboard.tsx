import { Link } from 'react-router-dom'
import { AlertTriangle, ClipboardList, HeartPulse, Users } from 'lucide-react'
import * as api from '../../services'
import { useAsync } from '../../hooks/useAsync'
import { useAuth } from '../../context/AuthContext'
import { Card, ErrorNote, PageHeader, Spinner } from '../../components/ui'
import { StatCard } from '../../components/cards'
import { RiskPie, UnitBarsChart } from '../../components/charts'

export default function AdminDashboard() {
  const { user } = useAuth()
  const overview = useAsync(() => api.fetchOverviewReport(), true)
  const units = useAsync(() => api.fetchUnitTrends(30), true)

  if (overview.status === 'loading') return <Spinner label="Loading command overview…" />
  if (overview.error) return <ErrorNote message={overview.error} onRetry={overview.reload} />
  const o = overview.data!

  return (
    <>
      <PageHeader
        title={`Welfare command overview`}
        subtitle={`Signed in as ${user?.full_name} · aggregated, anonymized view — no individual data on this page.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard delay={0} label="Personnel tracked" value={o.total_personnel} icon={<Users size={15} />} sub="synthetic records" />
        <StatCard delay={0.08} label="High-risk indicators" value={o.current_risk_distribution.High} tone="rose"
                  icon={<AlertTriangle size={15} />} sub={`${Math.round((o.current_risk_distribution.High / Math.max(o.total_personnel, 1)) * 100)}% of personnel`} />
        <StatCard delay={0.16} label="Open alerts" value={o.open_alerts} tone="amber" icon={<ClipboardList size={15} />} sub="awaiting review" />
        <StatCard delay={0.24} label="Active interventions" value={(Object.values(o.interventions_by_status) as number[])
                    .reduce((a, b) => a + b, 0)}
                  tone="emerald" icon={<HeartPulse size={15} />} sub="support in progress" />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="md:col-span-2 lg:col-span-2" title="Current risk distribution"
              subtitle="Latest indicator per personnel member">
          <RiskPie counts={o.current_risk_distribution} />
        </Card>

        <Card className="md:col-span-2 lg:col-span-3" title="Unit wellbeing comparison"
              subtitle="Average workload / fatigue / sleep (indexed 0–100)">
          {units.data?.units?.length
            ? <UnitBarsChart units={units.data.units} />
            : <Spinner />}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Link to="/admin/early-warning" className="glass group rounded-2xl p-4 ring-1 ring-line card-elevate transition-all duration-300 hover:-translate-y-1 hover:ring-sky-500/40">
          <p className="text-sm font-semibold text-slate-100">Early Warning Center</p>
          <p className="mt-1 text-xs text-slate-400">{o.open_alerts} open signals need welfare review.</p>
          <p className="mt-2 text-xs font-medium text-sky-300 group-hover:text-sky-200">Open →</p>
        </Link>
        <Link to="/admin/interventions" className="glass group rounded-2xl p-4 ring-1 ring-line card-elevate transition-all duration-300 hover:-translate-y-1 hover:ring-sky-500/40">
          <p className="text-sm font-semibold text-slate-100">Interventions</p>
          <p className="mt-1 text-xs text-slate-400">{(Object.values(o.interventions_by_status) as number[]).reduce((a, b) => a + b, 0)} total · track support actions.</p>
          <p className="mt-2 text-xs font-medium text-sky-300 group-hover:text-sky-200">Manage →</p>
        </Link>
        <Link to="/admin/reports" className="glass group rounded-2xl p-4 ring-1 ring-line card-elevate transition-all duration-300 hover:-translate-y-1 hover:ring-sky-500/40">
          <p className="text-sm font-semibold text-slate-100">Reports & exports</p>
          <p className="mt-1 text-xs text-slate-400">{o.pending_recommendations} recommendations pending across personnel.</p>
          <p className="mt-2 text-xs font-medium text-sky-300 group-hover:text-sky-200">View →</p>
        </Link>
      </div>
    </>
  )
}
