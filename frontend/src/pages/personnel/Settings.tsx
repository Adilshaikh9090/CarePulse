import { useState } from 'react'
import { Download, KeyRound, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import * as api from '../../services'
import { useAsync } from '../../hooks/useAsync'
import {
  Button, Card, DisclaimerNote, Field, Input, PageHeader, Spinner, Toggle,
} from '../../components/ui'
import { downloadJson } from '../../utils/format'

export default function Settings() {
  const { user } = useAuth()
  const consent = useAsync(() => api.fetchConsent(), true)
  const [profile, setProfile] = useState({ email: user?.email ?? '', phone: user?.phone ?? '' })
  const [pw, setPw] = useState({ current: '', next: '' })
  const [msg, setMsg] = useState<string | null>(null)

  const saveProfile = async () => {
    setMsg(null)
    try {
      await api.updateProfile({ email: profile.email, phone: profile.phone })
      setMsg('Contact details saved.')
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Save failed.') }
  }

  const changePw = async () => {
    setMsg(null)
    try {
      await api.changePassword(pw.current, pw.next)
      setMsg('Password changed.')
      setPw({ current: '', next: '' })
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Password change failed.') }
  }

  const toggleConsent = async (key: string, value: boolean) => {
    await api.updateConsent({ [key]: value })
    await consent.reload()
  }

  const exportData = async () => {
    const data = await api.exportMyData()
    downloadJson(data, `carepulse-export-${user?.personnel_id}.json`)
  }

  if (consent.status === 'loading') return <Spinner />

  return (
    <>
      <PageHeader title="Settings" subtitle="Profile, security, privacy controls and your data rights." />
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Profile & contact">
          <div className="space-y-3.5">
            <Field label="Personnel ID"><Input value={user?.personnel_id ?? ''} disabled /></Field>
            <Field label="Email"><Input value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} /></Field>
            <Field label="Phone"><Input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} /></Field>
            <Button onClick={saveProfile}>Save changes</Button>
          </div>
        </Card>

        <Card title="Security">
          <div className="space-y-3.5">
            <Field label="Current password">
              <Input type="password" value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} />
            </Field>
            <Field label="New password" hint="Minimum 8 characters">
              <Input type="password" value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} />
            </Field>
            <Button variant="ghost" onClick={changePw}><KeyRound size={14} /> Change password</Button>
          </div>
        </Card>

        <Card className="md:col-span-2" title="Consent & privacy controls"
              subtitle="You decide what continues to be collected. Changes apply immediately."
              action={<ShieldCheck size={16} className="text-emerald-400" />}>
          {consent.data && (
            <div className="grid gap-2.5 md:grid-cols-3">
              <Toggle checked={!!consent.data.wellbeing_checkins}
                      onChange={(v) => toggleConsent('wellbeing_checkins', v)}
                      label="Wellbeing check-ins" hint="Daily/weekly wellbeing entries" />
              <Toggle checked={!!consent.data.optional_feedback}
                      onChange={(v) => toggleConsent('optional_feedback', v)}
                      label="Optional feedback" hint="Free-text notes in check-ins" />
              <Toggle checked={!!consent.data.notifications_enabled}
                      onChange={(v) => toggleConsent('notifications_enabled', v)}
                      label="Notifications" hint="Welfare reminders & alerts" />
            </div>
          )}
        </Card>

        <Card className="md:col-span-2" title="Your data" subtitle="Download everything stored about you as JSON.">
          <Button variant="ghost" onClick={exportData}><Download size={14} /> Export my data</Button>
        </Card>

        {msg && (
          <p className="md:col-span-2 rounded-xl bg-sky-500/10 px-4 py-3 text-xs text-sky-200 ring-1 ring-sky-500/20">{msg}</p>
        )}
      </div>
    </>
  )
}
