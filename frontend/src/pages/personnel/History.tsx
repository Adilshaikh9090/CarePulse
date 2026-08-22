import { Activity } from 'lucide-react'
import * as api from '../../services'
import { useAsync } from '../../hooks/useAsync'
import { Card, Empty, ErrorNote, PageHeader, Spinner, Badge } from '../../components/ui'
import { DataTable } from '../../components/cards'
import { RiskPie, RiskTrendChart } from '../../components/charts'
import { fmtDate, riskBadge, riskColor } from '../../utils/format'

export default function History() {
  const { data, status, error, reload } = useAsync(() => api.fetchPredictionHistory(), true)
  if (status === 'loading') return <Spinner label="Loading history…" />
  if (error) return <ErrorNote message={error} onRetry={reload} />

  const items = data?.items ?? []
  return (
    <>
      <PageHeader title="My prediction history" subtitle="How your welfare-risk indicator has moved over recent weeks." />

      {!items.length ? (
        <Card><Empty icon={<Activity size={26} />} title="No predictions yet" hint="History appears after your first check-in." /></Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3" title="Risk indicator over time">
              <RiskTrendChart items={items} />
            </Card>
            <Card className="lg:col-span-2" title="Distribution of past results">
              <RiskPie counts={data!.counts} />
              <p className="mt-1 text-center text-xs text-slate-500">
                Trend: <strong className={data!.trend === 'rising' ? 'text-rose-300' : data!.trend === 'improving' ? 'text-emerald-300' : 'text-slate-300'}>
                  {data!.trend}
                </strong>
              </p>
            </Card>
          </div>

          <Card className="mt-4" title="All recorded predictions">
            <DataTable
              rows={items}
              keyOf={(i) => i.id}
              columns={[
                { header: 'Date', cell: (i) => fmtDate(i.iso_date) },
                {
                  header: 'Level',
                  cell: (i) => <Badge tone={riskBadge(i.risk_level)}>{i.risk_level}</Badge>,
                },
                {
                  header: 'Indicator',
                  cell: (i) => (
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/5">
                        <div className="h-full rounded-full" style={{ width: `${Math.round(i.risk_score * 100)}%`, background: riskColor(i.risk_level) }} />
                      </div>
                      <span className="text-xs text-slate-400">{Math.round(i.risk_score * 100)}%</span>
                    </div>
                  ),
                },
                { header: 'Confidence', cell: (i) => `${Math.round(i.confidence * 100)}%` },
              ]}
            />
          </Card>
        </>
      )}
    </>
  )
}
