import { useState } from 'react'
import {
  Database, Fingerprint, History, KeyRound, Lock, ScrollText, ShieldCheck, Users,
} from 'lucide-react'
import * as api from '../services'
import { useAsync } from '../hooks/useAsync'
import AIBanner from '../components/AIBanner'
import { Button, Card, ErrorNote, PageHeader, Spinner } from '../components/ui'
import { fmtDateTime } from '../utils/format'

const TABS = [
  { key: 'data', label: 'What we collect', Icon: Database },
  { key: 'security', label: 'Security', Icon: Lock },
  { key: 'consent', label: 'Consent & privacy', Icon: ShieldCheck },
  { key: 'history', label: 'Access history', Icon: History },
] as const

export default function PrivacyCenter() {
  const ov = useAsync(() => api.fetchPrivacyOverview(), true)
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('data')
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  if (ov.status === 'loading') return <Spinner label="Loading your privacy center…" />
  if (ov.error) return <ErrorNote message={ov.error} onRetry={ov.reload} />
  const d = ov.data!

  const toggleConsent = async (key: string, value: boolean) => {
    setSaving(true); setFlash(null)
    try {
      await api.updateConsent({ [key]: value })
      setFlash('Preference saved.')
      await ov.reload()
    } catch (e) {
      setFlash(e instanceof Error ? e.message : 'Could not save preference.')
    } finally { setSaving(false) }
  }

  return (
    <>
      <PageHeader title="Privacy & data security center"
                  subtitle="Understand what is collected, why, who can see it — and stay in control." />

      <div className="flex flex-wrap gap-2">
        {TABS.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setTab(key)}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold ring-1 transition ${
                    tab === key ? 'bg-sky-500/20 text-white ring-sky-400/50' : 'bg-subtle text-slate-300 ring-line hover:bg-hoverc'}`}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {tab === 'data' && (
        <>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            {[['Check-ins', d.my_data_counts.checkins], ['AI analyses', d.my_data_counts.predictions],
              ['Support steps', d.my_data_counts.recommendations]].map(([label, n]) => (
              <Card key={String(label)}>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-extrabold text-slate-100">{n}</p>
              </Card>
            ))}
            <Card>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Your export</p>
              <div className="mt-2"><Button size="sm" variant="subtle" onClick={() => api.exportMyData().then((x) => {
                const blob = new Blob([JSON.stringify(x, null, 2)], { type: 'application/json' })
                const a = document.createElement('a')
                a.href = URL.createObjectURL(blob)
                a.download = 'my-carepulse-data.json'
                a.click()
              })}>Download my data</Button></div>
            </Card>
          </div>

          <Card delay={0.08} className="mt-4" title="What we collect · why · who sees it"
                subtitle="Plain-language transparency for every data category">
            <ul className="space-y-2.5">
              {d.what_why_who.map((w) => (
                <li key={w.item} className="rounded-xl bg-subtle p-4 ring-1 ring-line">
                  <p className="text-sm font-semibold text-slate-100">{w.item}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400"><strong className="text-slate-300">Why:</strong> {w.why}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400"><strong className="text-slate-300">Who:</strong> {w.who}</p>
                </li>
              ))}
            </ul>

            <div className="mt-5">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <Users size={12} /> Role-based access matrix
              </p>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-line text-[10px] uppercase text-slate-500">
                      <th className="py-2 pr-3">Role</th><th className="py-2">Access</th><th className="py-2 pl-3">Individual rows</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.rbac_matrix.map((r) => (
                      <tr key={r.role} className="border-b border-line/60 last:border-0 align-top">
                        <td className="py-2.5 pr-3 font-semibold text-slate-200">{r.role.replace('_', ' ')}</td>
                        <td className="py-2.5 text-slate-400">{r.access}</td>
                        <td className="py-2.5 pl-3">
                          <span className={r.individual_data ? 'text-amber-300' : 'text-emerald-300'}>
                            {r.individual_data ? 'Authorized cases only' : 'No'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          <Card delay={0.14} className="mt-4" title="Retention periods" subtitle="How long each kind of data is kept">
            <ul className="space-y-2">
              {d.retention.map((r) => (
                <li key={r.data} className="flex items-center justify-between gap-3 rounded-xl bg-subtle px-3 py-2.5 text-xs ring-1 ring-line">
                  <span className="font-medium text-slate-200">{r.data}</span>
                  <span className="text-right text-slate-400">{r.retention}</span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}

      {tab === 'security' && (
        <Card delay={0} className="mt-4" title="How your information is protected"
              subtitle="Defense in depth, from sign-in to storage">
          <ul className="space-y-2.5">
            {Object.entries(d.encryption).map(([k, v]) => (
              <li key={k} className="flex items-start gap-3 rounded-xl bg-subtle p-3.5 ring-1 ring-line">
                <KeyRound size={15} className="mt-0.5 shrink-0 text-emerald-400" />
                <div>
                  <p className="text-xs font-semibold capitalize text-slate-200">{k.replace(/_/g, ' ')}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{v}</p>
                </div>
              </li>
            ))}
            <li className="flex items-start gap-3 rounded-xl bg-subtle p-3.5 ring-1 ring-line">
              <ScrollText size={15} className="mt-0.5 shrink-0 text-sky-400" />
              <div>
                <p className="text-xs font-semibold text-slate-200">Full audit trail</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                  Every access to welfare information is logged with who, what and when.
                </p>
              </div>
            </li>
          </ul>
        </Card>
      )}

      {tab === 'consent' && (
        <>
          <Card delay={0} className="mt-4" title="Your consent preferences" subtitle="Change anytime — takes effect immediately">
            {flash && <p className="mb-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 ring-1 ring-emerald-500/25">{flash}</p>}
            <ul className="space-y-2.5">
              {([['wellbeing_checkins', 'Daily wellness check-ins',
                  'Required for the core welfare-indicator service. You choose whether to respond each day.'],
                 ['optional_feedback', 'Optional feedback prompts',
                  'Occasional voluntary questions about workload and morale.'],
                 ['notifications_enabled', 'Wellness notifications & reminders',
                  'Gentle check-in reminders and supportive alerts.'],
                 ['biometric_consent', 'Biometric wellness streams (optional)',
                  'Optional heart-rate / sleep-device sharing. Off by default; needs explicit authorization.']] as const).map(
                ([key, label, hint]) => {
                  const on = Boolean((d.consent as Record<string, boolean>)[key])
                  const disabled = saving || key === 'wellbeing_checkins'
                  return (
                    <li key={key} className="flex items-center justify-between gap-4 rounded-xl bg-subtle p-3.5 ring-1 ring-line">
                      <div>
                        <p className="text-xs font-semibold text-slate-100">{label}</p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{hint}</p>
                      </div>
                      <button role="switch" aria-checked={on} disabled={disabled}
                              onClick={() => toggleConsent(key, !on)}
                              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                                on ? 'bg-emerald-500/80' : 'bg-hoverc ring-1 ring-line'} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}>
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
                      </button>
                    </li>
                  )
                })}
            </ul>
          </Card>

          <Card delay={0.06} className="mt-4" title="Biometric integration status"
                subtitle="Deliberately off by default"
                action={<Fingerprint size={16} className="text-violet-400/80" />}>
            <p className="rounded-xl bg-subtle px-4 py-3 text-xs leading-relaxed text-slate-300 ring-1 ring-line">
              Status: <strong className="uppercase text-fuchsia-300">{d.biometrics.status}</strong> ·
              {' '}enabled by default: {d.biometrics.enabled_by_default ? 'yes' : 'no'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {d.biometrics.metrics.map((m) => (
                <span key={m} className="rounded-full bg-subtle px-3 py-1.5 text-[11px] text-slate-300 ring-1 ring-line">{m}</span>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-400">{d.biometrics.notice}</p>
          </Card>
        </>
      )}

      {tab === 'history' && (
        <Card delay={0} className="mt-4" title="Recent access to your records"
              subtitle="Who viewed or changed welfare information, and when">
          <ul className="space-y-2">
            {d.access_history.map((a, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-subtle px-3 py-2.5 text-xs ring-1 ring-line">
                <div>
                  <p className="font-medium text-slate-200">{a.action}</p>
                  <p className="text-[11px] text-slate-500">{a.actor} ({a.role.replace('_', ' ')}) → {a.resource}</p>
                </div>
                <span className="text-[11px] text-slate-500">{fmtDateTime(a.timestamp)}</span>
              </li>
            ))}
            {!d.access_history.length && <li className="text-xs text-slate-500">No recorded activity yet.</li>}
          </ul>
        </Card>
      )}

      <div className="mt-4 space-y-3">
        <AIBanner />
      </div>
    </>
  )
}
