import { useState } from 'react'
import { BrainCircuit, RefreshCw, SlidersHorizontal } from 'lucide-react'
import * as api from '../../services'
import { useAsync } from '../../hooks/useAsync'
import AIProcessing from '../../components/AIProcessing'
import {
  Button, Card, DisclaimerNote, Empty, ErrorNote, Field, Input, PageHeader, Spinner,
} from '../../components/ui'
import { FactorBar, GaugeRing } from '../../components/cards'

const FIELDS = [
  { key: 'workload_score', label: 'Workload score (1–10)', def: 6 },
  { key: 'fatigue_score', label: 'Fatigue score (1–10)', def: 5 },
  { key: 'sleep_quality', label: 'Sleep quality (1–5)', def: 3 },
  { key: 'duty_hours', label: 'Average duty hours/day (0–24)', def: 9 },
  { key: 'overtime_frequency', label: 'Overtime frequency (0–10)', def: 4 },
  { key: 'job_satisfaction', label: 'Job satisfaction (1–10)', def: 6 },
  { key: 'rest_break_quality', label: 'Rest break quality (1–5)', def: 3 },
  { key: 'self_reported_stress', label: 'Self-reported stress (1–10)', def: 5 },
  { key: 'recent_workload_change', label: 'Recent workload change (-3 to +3)', def: 0 },
] as const

export default function Prediction() {
  const latest = useAsync(() => api.fetchLatestPrediction(), true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, number>>(
    () => Object.fromEntries(FIELDS.map((f) => [f.key, f.def])))
  const [result, setResult] = useState<null | Awaited<ReturnType<typeof api.runPrediction>>>(null)

  const run = async () => {
    setBusy(true); setError(null)
    try {
      setResult(await api.runPrediction(values))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Prediction failed.')
    } finally {
      setBusy(false)
    }
  }

  const shown = result ?? latest.data
  if (latest.status === 'loading') return <Spinner label="Loading prediction…" />

  return (
    <>
      <PageHeader
        title="AI welfare-risk prediction"
        subtitle="Explainable indicator from your wellbeing signals — with the reasoning behind it."
      />

      {busy && <AIProcessing label="Analyzing your wellbeing indicators" />}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2" title="Try a what-if scenario"
              subtitle="Adjust indicators to see how they'd shift your risk level"
              action={<SlidersHorizontal size={15} className="text-slate-500" />}>
          <div className="space-y-3">
            {FIELDS.map((f) => (
              <Field key={f.key} label={f.label}>
                <Input type="number" step="0.1" value={values[f.key]}
                       onChange={(e) => setValues((v) => ({ ...v, [f.key]: Number(e.target.value) }))} />
              </Field>
            ))}
            <Button className="w-full" loading={busy} onClick={run}>
              <BrainCircuit size={15} /> Run prediction
            </Button>
            {error && <ErrorNote message={error} />}
          </div>
        </Card>

        <div className="space-y-4 lg:col-span-3">
          {!shown ? (
            <Card><Empty icon={<BrainCircuit size={26} />} title="No prediction yet"
                         hint="Complete a check-in or run a scenario on the left." /></Card>
          ) : (
            <>
              <Card title="Current indicator">
                <div className="flex flex-wrap items-center gap-5">
                  <GaugeRing score={shown.risk_score} level={shown.risk_level} size={160} />
                  <div className="min-w-[180px] flex-1 space-y-2 text-sm text-slate-300">
                    <p>Model confidence: <strong>{Math.round(shown.confidence * 100)}%</strong></p>
                    <p className="text-xs leading-relaxed text-slate-400">{shown.explanation}</p>
                  </div>
                </div>
                <ul className="mt-4 space-y-2">
                  {(shown.recommendations ?? []).map((r) => (
                    <li key={r} className="rounded-xl bg-white/[0.03] px-3 py-2 text-xs text-slate-300 ring-1 ring-white/5">• {r}</li>
                  ))}
                </ul>
              </Card>

              <Card title="Why this result?" subtitle="Per-factor sensitivity analysis against a neutral baseline">
                <ol className="space-y-2">
                  {(shown.all_factors ?? shown.top_factors).map((f, i) => (
                    <FactorBar key={f.name} {...f} rank={i + 1} />
                  ))}
                </ol>
              </Card>

              <DisclaimerNote>{shown.disclaimer}</DisclaimerNote>

              <p className="text-right text-[11px] text-slate-600">
                <RefreshCw size={11} className="mr-1 inline" />
                model_version {shown.model_version}
              </p>
            </>
          )}
        </div>
      </div>
    </>
  )
}
