import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Filter, Search, UserSearch } from 'lucide-react'
import * as api from '../../services'
import { useAsync } from '../../hooks/useAsync'
import type { RiskLevel } from '../../types'
import AIBanner from '../../components/AIBanner'
import { Card, Empty, ErrorNote, PageHeader, Spinner } from '../../components/ui'
import { fmtDate, riskBadge } from '../../utils/format'

const LEVELS: (RiskLevel | 'all')[] = ['all', 'Low', 'Moderate', 'High', 'Critical']
const FOLLOWUP_LABEL: Record<string, string> = {
  none: '—',
  new: 'Alert · new',
  reviewing: 'In review',
  assigned: 'Officer assigned',
  resolved: 'Resolved',
  overdue: 'Overdue',
}

function subCell(v: number | null | undefined) {
  if (v == null) return <span className="text-slate-600">—</span>
  const cls = v >= 70 ? 'text-rose-300' : v >= 40 ? 'text-amber-300' : 'text-emerald-300'
  return <span className={`font-semibold ${cls}`}>{v}</span>
}

export default function PersonnelTable() {
  const [q, setQ] = useState('')
  const [risk, setRisk] = useState<RiskLevel | 'all'>('all')
  const [followupOnly, setFollowupOnly] = useState(false)
  const [showNames, setShowNames] = useState(false)

  const params = useMemo(() => {
    const p = new URLSearchParams()
    if (q.trim()) p.set('q', q.trim())
    if (risk !== 'all') p.set('risk', risk)
    if (followupOnly) p.set('followup', 'true')
    if (showNames) p.set('show_names', 'true')
    return p.toString()
  }, [q, risk, followupOnly, showNames])

  const table = useAsync(() => api.fetchPersonnelTable(params), true, [params])

  return (
    <>
      <PageHeader
        title="Personnel welfare register"
        subtitle="Authorized welfare view. Identities stay anonymized unless a named review is justified — every access is audit-logged."
      />

      <Card delay={0}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={q} onChange={(e) => setQ(e.target.value)}
                   placeholder="Search unit / designation…"
                   className="w-full rounded-xl bg-subtle py-2.5 pl-9 pr-3 text-xs text-slate-200 ring-1 ring-line outline-none transition focus:ring-linestrong" />
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-400">
            <Filter size={13} /> Risk
            <select value={risk} onChange={(e) => setRisk(e.target.value as RiskLevel | 'all')}
                    className="rounded-lg bg-subtle px-2.5 py-2 text-xs text-slate-200 ring-1 ring-line outline-none focus:ring-linestrong">
              {LEVELS.map((l) => <option key={l} value={l}>{l === 'all' ? 'All levels' : l}</option>)}
            </select>
          </label>

          <button onClick={() => setFollowupOnly((v) => !v)}
                  className={`rounded-lg px-3 py-2 text-xs font-medium ring-1 transition ${
                    followupOnly ? 'bg-fuchsia-500/15 text-fuchsia-200 ring-fuchsia-500/40' : 'bg-subtle text-slate-300 ring-line hover:bg-hoverc'}`}>
            Needs follow-up
          </button>

          <button onClick={() => setShowNames((v) => !v)}
                  title="Named access is logged for accountability"
                  className={`rounded-lg px-3 py-2 text-xs font-medium ring-1 transition ${
                    showNames ? 'bg-amber-500/15 text-amber-200 ring-amber-500/40' : 'bg-subtle text-slate-300 ring-line hover:bg-hoverc'}`}>
            {showNames ? 'Names shown · logged' : 'Anonymous view'}
          </button>
        </div>

        {table.status === 'loading' ? <Spinner label="Loading personnel indicators…" />
          : table.error ? <ErrorNote message={table.error} onRetry={table.reload} />
          : !table.data?.items.length ? (
            <Empty icon={<UserSearch size={24} />} title="No matching personnel"
                   hint="Try widening the filters." />
          ) : (
            <>
              {/* Mobile card layout */}
              <div className="mt-4 space-y-3 md:hidden">
                {table.data.items.map((r) => (
                  <Link key={r.user_id ?? r.anon_id}
                        to={`/officer/personnel/${r.user_id}`}
                        className="block rounded-xl bg-subtle p-3.5 ring-1 ring-line transition hover:ring-linestrong">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-xs font-semibold text-slate-100 truncate">{r.display_name || r.anon_id}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${riskBadge(r.risk_level)}`}>
                        {r.risk_level}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-500">{r.unit}{r.personnel_id ? ` · ${r.personnel_id}` : ''}</p>
                    <div className="mt-2.5 grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-navy-950/40 px-2 py-1.5 text-center">
                        <p className="text-[9px] uppercase text-slate-500">Stress</p>
                        {subCell(r.stress_score)}
                      </div>
                      <div className="rounded-lg bg-navy-950/40 px-2 py-1.5 text-center">
                        <p className="text-[9px] uppercase text-slate-500">Burnout</p>
                        {subCell(r.burnout_score)}
                      </div>
                      <div className="rounded-lg bg-navy-950/40 px-2 py-1.5 text-center">
                        <p className="text-[9px] uppercase text-slate-500">Fatigue</p>
                        {subCell(r.fatigue_score)}
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500">
                      <span>Check-in: {fmtDate(r.last_checkin)}</span>
                      <span className={
                        r.follow_up_status === 'overdue' ? 'font-semibold text-fuchsia-300'
                          : r.follow_up_status !== 'none' ? 'text-amber-300' : 'text-slate-600'}>
                        {FOLLOWUP_LABEL[r.follow_up_status] || r.follow_up_status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Desktop table layout */}
              <div className="mt-4 hidden overflow-x-auto md:block">
                <table className="w-full min-w-[860px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-line text-[10px] uppercase tracking-wide text-slate-500">
                      <th className="py-2.5 pr-3">Person</th>
                      <th className="px-2 py-2.5">Unit</th>
                      <th className="px-2 py-2.5">Indicator</th>
                      <th className="px-2 py-2.5 text-center">Stress</th>
                      <th className="px-2 py-2.5 text-center">Burnout</th>
                      <th className="px-2 py-2.5 text-center">Fatigue</th>
                      <th className="px-2 py-2.5">Last check-in</th>
                      <th className="px-2 py-2.5">Deployment</th>
                      <th className="px-2 py-2.5">Follow-up</th>
                      <th className="px-2 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {table.data.items.map((r) => (
                      <tr key={r.user_id ?? r.anon_id}
                          className="border-b border-line/60 transition-colors last:border-0 hover:bg-hoverc/50">
                        <td className="py-3 pr-3">
                          <p className="font-mono text-[11px] font-semibold text-slate-100">{r.display_name || r.anon_id}</p>
                          {r.personnel_id && r.display_name && (
                            <p className="font-mono text-[10px] text-slate-500">{r.personnel_id}</p>
                          )}
                        </td>
                        <td className="px-2 py-3 text-slate-300">{r.unit}</td>
                        <td className="px-2 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${riskBadge(r.risk_level)}`}>
                            {r.risk_level}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-center">{subCell(r.stress_score)}</td>
                        <td className="px-2 py-3 text-center">{subCell(r.burnout_score)}</td>
                        <td className="px-2 py-3 text-center">{subCell(r.fatigue_score)}</td>
                        <td className="px-2 py-3 text-slate-400">{fmtDate(r.last_checkin)}</td>
                        <td className="px-2 py-3 text-slate-400">{r.deployment_status || '—'}</td>
                        <td className="px-2 py-3">
                          <span className={
                            r.follow_up_status === 'overdue' ? 'font-semibold text-fuchsia-300'
                              : r.follow_up_status !== 'none' ? 'text-amber-300' : 'text-slate-600'}>
                            {FOLLOWUP_LABEL[r.follow_up_status] || r.follow_up_status}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-right">
                          <Link to={`/officer/personnel/${r.user_id}`}
                                className="inline-flex items-center gap-1 rounded-lg bg-subtle px-2.5 py-1.5 text-[11px] font-medium text-sky-300 ring-1 ring-line transition hover:bg-hoverc hover:text-sky-200">
                            <Eye size={12} /> Detail
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
      </Card>

      <div className="mt-4 space-y-3">
        <AIBanner />
        <p className="text-[11px] leading-relaxed text-slate-500">
          Sub-score columns are AI-generated wellness indicators (0–100). They are not medical
          diagnoses — human welfare review is required before any intervention.
        </p>
      </div>
    </>
  )
}
