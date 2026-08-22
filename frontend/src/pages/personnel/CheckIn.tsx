import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import * as api from '../../services'
import { useAsync } from '../../hooks/useAsync'
import { Button, Card, DisclaimerNote, Field, Input, PageHeader, Select, Spinner, TextArea } from '../../components/ui'

const SCALE = (labels: string[]) => labels.map((l, i) => ({ value: String(i + 1), label: l }))
const FEELING = SCALE(['Very low', 'Low', 'Okay', 'Good', 'Great'])
const QUALITY5 = SCALE(['Very poor', 'Poor', 'Average', 'Good', 'Excellent'])
const LOAD5 = SCALE(['Very light', 'Light', 'Manageable', 'Heavy', 'Overwhelming'])
const SAT5 = SCALE(['Very dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very satisfied'])

export default function CheckIn() {
  const navigate = useNavigate()
  const existing = useAsync(() => api.fetchAssessments(7), true)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    feeling: '3', sleep_quality: '3', fatigue: '2', workload: '3',
    job_satisfaction: '3', duty_hours: '9', overtime: 'no', rest_breaks: 'Adequate',
    comment: '',
  })
  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  const alreadyToday = useMemo(() => {
    if (!existing.data?.items?.length) return false
    const today = new Date().toISOString().slice(0, 10)
    return existing.data.items.some((r) => r.date === today)
  }, [existing.data])

  const submit = async () => {
    setBusy(true); setError(null)
    try {
      await api.submitCheckIn({
        feeling: Number(form.feeling), sleep_quality: Number(form.sleep_quality),
        fatigue: Number(form.fatigue), workload: Number(form.workload),
        job_satisfaction: Number(form.job_satisfaction), duty_hours: Number(form.duty_hours),
        overtime: form.overtime === 'yes', rest_breaks: form.rest_breaks,
        comment: form.comment || undefined,
      })
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <Card>
        <div className="flex flex-col items-center py-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">
            <CheckCircle2 size={26} />
          </span>
          <h2 className="mt-4 text-lg font-bold text-slate-50">Check-in recorded — thank you</h2>
          <p className="mt-1.5 max-w-sm text-sm text-slate-400">
            Your indicators were analyzed and your welfare-risk indicator has been refreshed.
          </p>
          <div className="mt-6 flex gap-3">
            <Button onClick={() => navigate('/app/prediction')}>View my AI prediction</Button>
            <Button variant="ghost" onClick={() => navigate('/app')}>Back to dashboard</Button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <>
      <PageHeader title="Daily wellbeing check-in" subtitle="Two minutes. Fully confidential. Only aggregated trends are ever visible to others." />

      {alreadyToday && (
        <DisclaimerNote>
          You already completed today's check-in — submitting again will replace the analysis but keep both entries.
        </DisclaimerNote>
      )}

      {existing.status === 'loading' ? <Spinner /> : (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Card title="How you're doing">
            <div className="space-y-3.5">
              <Field label="Overall, how do you feel today?">
                <Select value={form.feeling} onChange={set('feeling')} options={FEELING} />
              </Field>
              <Field label="Sleep quality (last night)">
                <Select value={form.sleep_quality} onChange={set('sleep_quality')} options={QUALITY5} />
              </Field>
              <Field label="Current fatigue level">
                <Select value={form.fatigue} onChange={set('fatigue')} options={LOAD5} />
              </Field>
              <Field label="Workload pressure">
                <Select value={form.workload} onChange={set('workload')} options={LOAD5} />
              </Field>
              <Field label="Job satisfaction lately">
                <Select value={form.job_satisfaction} onChange={set('job_satisfaction')} options={SAT5} />
              </Field>
            </div>
          </Card>

          <Card title="About your duties">
            <div className="space-y-3.5">
              <Field label="Duty hours today" hint="Typical range: 6–15 hours">
                <Input type="number" min={0} max={24} step={0.5} value={form.duty_hours}
                       onChange={(e) => set('duty_hours')(e.target.value)} />
              </Field>
              <Field label="Overtime today?">
                <Select value={form.overtime} onChange={set('overtime')}
                        options={[{ value: 'no', label: 'No overtime' }, { value: 'yes', label: 'Yes, worked overtime' }]} />
              </Field>
              <Field label="Rest breaks taken">
                <Select value={form.rest_breaks} onChange={set('rest_breaks')} options={[
                  { value: 'Adequate', label: 'Adequate — took regular breaks' },
                  { value: 'Limited', label: 'Limited — a few short breaks' },
                  { value: 'None', label: 'Barely any / none' },
                ]} />
              </Field>
              <Field label="Anything you'd like to add?" hint="Optional · visible only to authorized welfare reviewers">
                <TextArea rows={3} maxLength={500} value={form.comment}
                          onChange={(e) => set('comment')(e.target.value)}
                          placeholder="Optional note…" />
              </Field>
            </div>
          </Card>

          {error && (
            <p className="md:col-span-2 rounded-xl bg-rose-500/10 px-4 py-3 text-xs text-rose-200 ring-1 ring-rose-500/30">{error}</p>
          )}

          <div className="md:col-span-2 flex items-center justify-between gap-4 rounded-2xl bg-navy-800/80 p-4 ring-1 ring-white/5">
            <DisclaimerNote>Submitting runs an on-device-style model analysis to refresh your supportive welfare-risk indicator.</DisclaimerNote>
            <Button size="lg" loading={busy} onClick={submit}>Submit & analyze</Button>
          </div>
        </div>
      )}
    </>
  )
}
