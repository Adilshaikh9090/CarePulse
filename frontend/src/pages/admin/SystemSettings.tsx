import { useEffect, useState } from 'react'
import {
  Bell, Cpu, Layers, RefreshCcw, Save, ShieldCheck, Users,
} from 'lucide-react'
import * as api from '../../services'
import { useAsync } from '../../hooks/useAsync'
import type { ModelConfigT } from '../../types'
import AIBanner from '../../components/AIBanner'
import {
  Badge, Button, Card, ErrorNote, Field, Input, PageHeader, Spinner, Toggle,
} from '../../components/ui'

const TABS = [
  { key: 'units', label: 'Units', Icon: Layers },
  { key: 'roles', label: 'Roles & permissions', Icon: ShieldCheck },
  { key: 'settings', label: 'System settings', Icon: Users },
  { key: 'model', label: 'AI model config', Icon: Cpu },
  { key: 'notifications', label: 'Notification settings', Icon: Bell },
] as const

export default function SystemSettings() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('units')

  return (
    <>
      <PageHeader title="System administration"
                  subtitle="Configuration, access control and AI model governance." />

      <div className="flex flex-wrap gap-2">
        {TABS.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setTab(key)}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold ring-1 transition ${
                    tab === key ? 'bg-sky-500/20 text-white ring-sky-400/50' : 'bg-subtle text-slate-300 ring-line hover:bg-hoverc'}`}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === 'units' && <UnitsTab />}
        {tab === 'roles' && <RolesTab />}
        {tab === 'settings' && <SettingsTab />}
        {tab === 'model' && <ModelTab />}
        {tab === 'notifications' && <NotificationsTab />}
      </div>

      <div className="mt-4"><AIBanner /></div>
    </>
  )
}

function flashMsg(setter: (v: string | null) => void) {
  setter('Saved.')
  setTimeout(() => setter(null), 2500)
}

/* ---------------- units ---------------- */
function UnitsTab() {
  const units = useAsync(() => api.fetchAdminUnits(), true)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [location, setLocation] = useState('')
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const create = async () => {
    setBusy(true); setErr(null)
    try {
      await api.createAdminUnit({ name, code, location })
      setName(''); setCode(''); setLocation('')
      flashMsg(setFlash)
      await units.reload()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not create unit.')
    } finally { setBusy(false) }
  }

  if (units.status === 'loading') return <Spinner />
  if (units.error) return <ErrorNote message={units.error} onRetry={units.reload} />

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card title="Create unit" subtitle="Register a new organizational unit" className="lg:col-span-1">
        <div className="space-y-3">
          <Field label="Unit name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Unit Foxtrot" /></Field>
          <Field label="Unit code"><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. UF-01" /></Field>
          <Field label="Location"><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. North Sector" /></Field>
          {err && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-200 ring-1 ring-rose-500/30">{err}</p>}
          {flash && <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 ring-1 ring-emerald-500/25">{flash}</p>}
          <Button loading={busy} disabled={!name || !code} onClick={create}>Create unit</Button>
        </div>
      </Card>

      <Card title="Registered units" subtitle={`${units.data?.items.length ?? 0} units`} className="lg:col-span-2">
        <ul className="space-y-2">
          {units.data?.items.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-subtle px-3.5 py-3 ring-1 ring-line">
              <div>
                <p className="text-sm font-semibold text-slate-100">{u.name}</p>
                <p className="text-[11px] text-slate-500">{u.code} · {u.location || '—'}</p>
              </div>
              <Badge>{u.strength} personnel</Badge>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

/* ---------------- roles ---------------- */
function RolesTab() {
  const perms = useAsync(() => api.fetchPermissionsMatrix(), true)
  if (perms.status === 'loading') return <Spinner />
  if (perms.error) return <ErrorNote message={perms.error} onRetry={perms.reload} />

  return (
    <Card title="Role-based permission matrix" subtitle="Least-privilege by design — individual welfare data is restricted to authorized review workflows">
      <div className="grid gap-4 md:grid-cols-2">
        {perms.data!.roles.map((r) => (
          <div key={r.role} className="rounded-xl bg-subtle p-4 ring-1 ring-line">
            <p className="text-sm font-bold capitalize text-slate-100">{r.role.replace('_', ' ')}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {r.permissions.map((p) => (
                <code key={p} className="rounded bg-navy-700/70 px-2 py-1 font-mono text-[10px] text-sky-300 ring-1 ring-line">{p}</code>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

/* ---------------- system + notification settings ---------------- */
function SettingsTab() {
  const st = useAsync(() => api.fetchSystemSettings(), true)
  const [form, setForm] = useState<Record<string, unknown> | null>(null)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  useEffect(() => {
    if (st.data && !form) setForm({ ...st.data.system })
  }, [st.data, form])

  if (st.status === 'loading') return <Spinner />
  if (st.error) return <ErrorNote message={st.error} onRetry={st.reload} />
  if (!form) return null

  const save = async () => {
    setBusy(true)
    try {
      await api.saveSystemSettings({ system: form })
      flashMsg(setFlash)
    } finally { setBusy(false) }
  }

  return (
    <Card title="System settings" subtitle="Platform-level behavior">
      <div className="grid max-w-xl gap-4">
        <Field label="Session timeout (minutes)">
          <Input type="number" min={30} value={String(form.session_timeout_minutes ?? 720)}
                 onChange={(e) => setForm({ ...form, session_timeout_minutes: Number(e.target.value) })} />
        </Field>
        <Toggle checked={Boolean(form.maintenance_mode)} label="Maintenance mode"
                hint="Shows a friendly notice; blocks new check-ins while enabled."
                onChange={(v) => setForm({ ...form, maintenance_mode: v })} />
        <Field label="Data region label">
          <Input value={String(form.data_region ?? '')}
                 onChange={(e) => setForm({ ...form, data_region: e.target.value })} />
        </Field>
        {flash && <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 ring-1 ring-emerald-500/25">{flash}</p>}
        <Button loading={busy} onClick={save}><span className="inline-flex items-center gap-1.5"><Save size={14} /> Save settings</span></Button>
      </div>
    </Card>
  )
}

function NotificationsTab() {
  const st = useAsync(() => api.fetchSystemSettings(), true)
  const [form, setForm] = useState<Record<string, unknown> | null>(null)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  useEffect(() => {
    if (st.data && !form) setForm({ ...st.data.notifications })
  }, [st.data, form])

  if (!form) return st.status === 'loading' ? <Spinner /> : null

  const channels = ['in_app', 'email', 'sms']
  const active = Array.isArray(form.channels) ? form.channels as string[] : []

  const save = async () => {
    setBusy(true)
    try {
      await api.saveSystemSettings({ notifications: form })
      flashMsg(setFlash)
    } finally { setBusy(false) }
  }

  return (
    <Card title="Notification settings" subtitle="Gentle defaults — reminders stay supportive and quiet at night">
      <div className="grid max-w-xl gap-4">
        <Field label="Check-in reminder cadence (days of inactivity)">
          <Input type="number" min={1} max={30} value={String(form.checkin_reminder_days ?? 7)}
                 onChange={(e) => setForm({ ...form, checkin_reminder_days: Number(e.target.value) })} />
        </Field>
        <Field label="Quiet hours (no reminders sent)">
          <Input value={String(form.quiet_hours ?? '22:00-06:00')}
                 onChange={(e) => setForm({ ...form, quiet_hours: e.target.value })} />
        </Field>
        <Field label="Channels">
          <div className="flex flex-wrap gap-2">
            {channels.map((c) => {
              const on = active.includes(c)
              return (
                <button key={c}
                        onClick={() => setForm({ ...form, channels: on ? active.filter((x) => x !== c) : [...active, c] })}
                        className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold ring-1 transition ${
                          on ? 'bg-sky-500/20 text-sky-200 ring-sky-400/50' : 'bg-subtle text-slate-400 ring-line hover:bg-hoverc'}`}>
                  {c.replace('_', '-')}
                </button>
              )
            })}
          </div>
        </Field>
        <Toggle checked={Boolean(form.high_risk_notify_officers)} label="Notify welfare officers on high-risk alerts"
                hint="Officers receive in-app alerts for authorized follow-up only."
                onChange={(v) => setForm({ ...form, high_risk_notify_officers: v })} />
        {flash && <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 ring-1 ring-emerald-500/25">{flash}</p>}
        <Button loading={busy} onClick={save}><span className="inline-flex items-center gap-1.5"><Save size={14} /> Save notification settings</span></Button>
      </div>
    </Card>
  )
}

/* ---------------- model config ---------------- */
function ModelTab() {
  const cfg = useAsync(() => api.fetchModelConfig(), true)
  const [th, setTh] = useState<ModelConfigT['thresholds'] | null>(null)
  const [busy, setBusy] = useState(false)
  const [retraining, setRetraining] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  useEffect(() => {
    if (cfg.data && !th) setTh({ ...cfg.data.thresholds })
  }, [cfg.data, th])

  if (cfg.status === 'loading') return <Spinner />
  if (cfg.error) return <ErrorNote message={cfg.error} onRetry={cfg.reload} />
  const c = cfg.data!

  const save = async () => {
    if (!th) return
    setBusy(true)
    try {
      await api.saveModelConfig({ thresholds: th })
      flashMsg(setFlash)
      await cfg.reload()
    } finally { setBusy(false) }
  }

  const retrain = async () => {
    setRetraining(true)
    try {
      await api.retrainModel()
      flashMsg(setFlash)
      await cfg.reload()
    } finally { setRetraining(false) }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Model card" subtitle="Transparency for the welfare-risk model">
        <dl className="space-y-2 text-xs">
          {[['Version', c.model_version], ['Algorithm', c.algorithm],
            ['Training records', c.training_records.toLocaleString()], ['Features', c.features]].map(([k, v]) => (
            <div key={String(k)} className="flex justify-between gap-3 rounded-lg bg-subtle px-3 py-2 ring-1 ring-line">
              <dt className="text-slate-400">{k}</dt><dd className="font-semibold text-slate-200">{v}</dd>
            </div>
          ))}
          {Object.entries(c.metrics).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 rounded-lg bg-subtle px-3 py-2 ring-1 ring-line">
              <dt className="text-slate-400">{k}</dt>
              <dd className="font-semibold text-emerald-300">{typeof v === 'number' ? v.toFixed(3) : String(v)}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card title="Risk thresholds" subtitle="Applied to new predictions only">
        <div className="grid max-w-sm gap-3.5">
          {(['moderate_min', 'high_min', 'critical_min', 'confidence_floor'] as const).map((k) => (
            <Field key={k} label={`${k.replace(/_/g, ' ')} (${th ? th[k].toFixed(2) : ''})`}>
              <input type="range" min={0} max={1} step={0.01} value={th ? th[k] : 0}
                     onChange={(e) => th && setTh({ ...th, [k]: Number(e.target.value) })}
                     className="w-full accent-sky-500" />
            </Field>
          ))}
          {flash && <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 ring-1 ring-emerald-500/25">{flash}</p>}
          <div className="flex gap-2">
            <Button loading={busy} onClick={save}><Save size={14} /> Save thresholds</Button>
            <Button variant="subtle" loading={retraining} onClick={retrain}>
              <RefreshCcw size={14} /> Retrain model
            </Button>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">{c.note}</p>
        </div>
      </Card>
    </div>
  )
}
