import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity, ArrowLeft, ArrowRight, BatteryLow, CheckCircle2, CloudRain, Gauge,
  HeartPulse, MoonStar, Smile,
} from 'lucide-react'
import * as api from '../../services'
import { useAsync } from '../../hooks/useAsync'
import type { Prediction } from '../../types'
import AIBanner from '../../components/AIBanner'
import AIProcessing from '../../components/AIProcessing'
import SupportPlanCard from '../../components/SupportPlanCard'
import { Button, Card, DisclaimerNote, PageHeader, TextArea } from '../../components/ui'

const LEVEL_STYLE: Record<string, { chip: string; bar: string; text: string }> = {
  Low:      { chip: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/40', bar: 'from-emerald-500 to-teal-400', text: 'text-emerald-300' },
  Moderate: { chip: 'bg-amber-500/15 text-amber-300 ring-amber-500/40', bar: 'from-amber-500 to-orange-400', text: 'text-amber-300' },
  High:     { chip: 'bg-rose-500/15 text-rose-300 ring-rose-500/40', bar: 'from-rose-500 to-red-400', text: 'text-rose-300' },
  Critical: { chip: 'bg-fuchsia-600/20 text-fuchsia-300 ring-fuchsia-500/50', bar: 'from-fuchsia-600 to-purple-500', text: 'text-fuchsia-300' },
}

interface Question {
  key: string
  icon: typeof Smile
  title: string
  hint: string
  options: { value: number; label: string; emoji?: string }[]
}

const QUESTIONS: Question[] = [
  {
    key: 'feeling', icon: Smile, title: "Overall, how are you feeling today?",
    hint: 'There are no wrong answers — this helps us support you.',
    options: [
      { value: 1, label: 'Very poor' }, { value: 2, label: 'Poor' },
      { value: 3, label: 'Okay' }, { value: 4, label: 'Good' }, { value: 5, label: 'Very good' },
    ],
  },
  {
    key: 'sleep_quality', icon: MoonStar, title: 'How was your sleep last night?',
    hint: 'Rest quality is one of the strongest wellbeing signals.',
    options: [
      { value: 1, label: 'Very poor' }, { value: 2, label: 'Poor' },
      { value: 3, label: 'Average' }, { value: 4, label: 'Good' }, { value: 5, label: 'Excellent' },
    ],
  },
  {
    key: 'energy_level', icon: BatteryLow, title: 'How is your energy level today?',
    hint: 'Think about how drained or refreshed you feel right now.',
    options: [
      { value: 1, label: 'High — feeling fresh' }, { value: 2, label: 'Moderate' },
      { value: 3, label: 'Low — running on fumes' }, { value: 4, label: 'Very low — exhausted' },
    ],
  },
  {
    key: 'workload', icon: Gauge, title: 'How heavy is your workload these days?',
    hint: 'An honest picture helps your welfare team plan fair duty rosters.',
    options: [
      { value: 1, label: 'Light' }, { value: 2, label: 'Manageable' },
      { value: 3, label: 'Heavy' }, { value: 4, label: 'Extremely heavy' },
    ],
  },
  {
    key: 'emotional_fatigue', icon: HeartPulse, title: 'How emotionally fatigued do you feel?',
    hint: 'Emotional tiredness is common in demanding roles — sharing it stays confidential.',
    options: [
      { value: 1, label: 'None' }, { value: 2, label: 'Slight' }, { value: 3, label: 'Moderate' },
      { value: 4, label: 'High' }, { value: 5, label: 'Very high' },
    ],
  },
]

export default function CheckIn() {
  const navigate = useNavigate()
  const existing = useAsync(() => api.fetchAssessments(7), true)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Prediction | null>(null)
  const [error, setError] = useState<string | null>(null)

  const q = QUESTIONS[step]
  const totalSteps = QUESTIONS.length + 1 // questions + comment step
  const progress = Math.round(((result ? totalSteps : step) / totalSteps) * 100)

  const alreadyToday = useMemo(() => {
    if (!existing.data?.items?.length) return false
    const today = new Date().toISOString().slice(0, 10)
    return existing.data.items.some((r) => r.date === today)
  }, [existing.data])

  const choose = (v: number) => {
    setAnswers((a) => ({ ...a, [q.key]: v }))
    setTimeout(() => setStep((s) => Math.min(s + 1, QUESTIONS.length)), 220)
  }

  const submit = async () => {
    setBusy(true); setError(null)
    try {
      const r = await api.submitCheckIn({
        feeling: answers.feeling ?? 3,
        sleep_quality: answers.sleep_quality ?? 3,
        energy_level: answers.energy_level ?? undefined,
        workload: answers.workload ?? 2,
        emotional_fatigue: answers.emotional_fatigue ?? undefined,
        comment: comment || undefined,
      })
      setResult(r.prediction)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed.')
    } finally { setBusy(false) }
  }

  if (busy) return <AIProcessing label="Analyzing your wellness indicators…" />

  if (result) return <ResultView prediction={result} onDashboard={() => navigate('/app')}
    onRefresh={async () => { const fresh = await api.fetchLatestPrediction(); if (fresh) setResult(fresh) }} />

  if (alreadyToday) {
    return (
      <>
        <PageHeader title="Daily wellbeing check-in" subtitle="Two minutes. Fully confidential." />
        <DisclaimerNote>
          You've already completed today's check-in — one entry per day keeps your trend accurate.
          Please come back tomorrow.
        </DisclaimerNote>
        <div className="mt-4 flex gap-3">
          <Button onClick={() => navigate('/app/prediction')}>View my latest indicator</Button>
          <Button variant="ghost" onClick={() => navigate('/app')}>Back to dashboard</Button>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Daily wellbeing check-in"
                  subtitle="Two minutes. Fully confidential. Only aggregated trends are ever visible to others." />

      {/* progress */}
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-hoverc">
        <motion.div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-violet-500"
                    animate={{ width: `${Math.max(progress, 6)}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }} />
      </div>

      <div className="mt-5">
        <AnimatePresence mode="wait">
          {step < QUESTIONS.length ? (
            <motion.div key={q.key}
                        initial={{ opacity: 0, x: 42 }} animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -42 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>
              <Card>
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30">
                    <q.icon size={20} />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Question {step + 1} of {QUESTIONS.length}
                    </p>
                    <h2 className="text-base font-bold text-slate-50">{q.title}</h2>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-400">{q.hint}</p>

                <div className={`mt-4 grid gap-2.5 ${q.options.length > 4 ? 'grid-cols-2 sm:grid-cols-5' : q.options.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : ''}`}>
                  {q.options.map((o) => {
                    const active = answers[q.key] === o.value
                    return (
                      <button key={o.value} onClick={() => choose(o.value)}
                              className={`rounded-xl px-3 py-3.5 text-center text-xs font-semibold ring-1 transition-all duration-200 ${
                                active
                                  ? 'bg-sky-500/25 text-white ring-sky-400/60 shadow-lg shadow-sky-500/10'
                                  : 'bg-subtle text-slate-300 ring-line hover:bg-hoverc hover:text-slate-100 hover:ring-linestrong'}`}>
                        {o.label}
                      </button>
                    )
                  })}
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <Button variant="ghost" size="sm" disabled={step === 0}
                          onClick={() => setStep((s) => s - 1)}>
                    <span className="flex items-center gap-1"><ArrowLeft size={14} /> Back</span>
                  </Button>
                  <span className="text-[11px] text-slate-500">Your answers stay private.</span>
                </div>
              </Card>
            </motion.div>
          ) : (
            <motion.div key="final"
                        initial={{ opacity: 0, x: 42 }} animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -42 }} transition={{ duration: 0.32 }}>
              <Card title="Anything you'd like to add?"
                    subtitle="Optional · visible only to authorized welfare reviewers">
                <TextArea rows={4} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)}
                          placeholder="Optional note for your own record or a welfare reviewer…" />
                <div className="mt-4 flex items-center justify-between">
                  <Button variant="ghost" size="sm" onClick={() => setStep(QUESTIONS.length - 1)}>
                    <span className="flex items-center gap-1"><ArrowLeft size={14} /> Back</span>
                  </Button>
                  <Button size="lg" loading={busy} onClick={submit}>
                    Submit & analyze <ArrowRight size={16} />
                  </Button>
                </div>
                {error && (
                  <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-200 ring-1 ring-rose-500/30">{error}</p>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-4">
        <AIBanner />
      </div>
    </>
  )
}

function ResultView({ prediction, onDashboard, onRefresh }: { prediction: Prediction; onDashboard: () => void; onRefresh?: () => Promise<void> }) {
  const navigate = useNavigate()
  const style = LEVEL_STYLE[prediction.risk_level] || LEVEL_STYLE.Low
  const score = Math.round(prediction.risk_score * 100)
  const subs = prediction.sub_scores
  const planItems = prediction.recommendation_items ?? []

  return (
    <>
      <PageHeader title="Today's wellness result" subtitle="Reviewed privately by you first — always." />

      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <Card>
          <div className="flex flex-col items-center py-2 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">
              <CheckCircle2 size={26} />
            </span>
            <h2 className="mt-4 text-lg font-bold text-slate-50">Check-in recorded — thank you</h2>

            {/* risk gauge */}
            <div className="mt-6 w-full max-w-md">
              <div className="flex items-end justify-between">
                <span className="text-xs text-slate-400">Wellness-risk indicator</span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${style.chip}`}>
                  {prediction.risk_level}
                </span>
              </div>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-hoverc ring-1 ring-line">
                <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }}
                            transition={{ duration: 0.9, ease: 'easeOut' }}
                            className={`h-full rounded-full bg-gradient-to-r ${style.bar}`} />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                <span>Healthy</span><span className={style.text}>{score}% · confidence {Math.round(prediction.confidence * 100)}%</span><span>Needs care</span>
              </div>
            </div>

            {/* sub-scores */}
            {subs && (
              <div className="mt-6 grid w-full max-w-md grid-cols-1 sm:grid-cols-3 gap-2.5">
                {([['Stress', subs.stress, Activity], ['Burnout', subs.burnout, CloudRain], ['Fatigue', subs.fatigue, HeartPulse]] as const).map(
                  ([label, val, Icon]) => (
                    <div key={label} className="rounded-xl bg-subtle p-3 ring-1 ring-line">
                      <p className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-slate-500">
                        <Icon size={11} /> {label}
                      </p>
                      <p className={`mt-1 text-center text-lg font-extrabold ${val >= 70 ? 'text-rose-300' : val >= 40 ? 'text-amber-300' : 'text-emerald-300'}`}>
                        {val}<span className="text-[10px] font-medium text-slate-500">/100</span>
                      </p>
                    </div>
                  ))}
              </div>
            )}

            {/* factor chips */}
            {prediction.top_factors?.length > 0 && (
              <div className="mt-6 w-full max-w-md">
                <p className="text-left text-xs font-semibold text-slate-300">What's driving your indicator</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {prediction.top_factors.map((f) => (
                    <span key={f.name}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ring-1 ${
                            f.direction === 'increasing'
                              ? 'bg-rose-500/10 text-rose-200 ring-rose-500/30'
                              : 'bg-emerald-500/10 text-emerald-200 ring-emerald-500/30'}`}>
                      <Activity size={11} />
                      {f.name} {f.direction === 'increasing' ? '+' : '−'}{Math.round(f.impact * 100)}%
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-400">{prediction.explanation}</p>
          </div>
        </Card>
      </motion.div>

      {planItems.length > 0 && (
        <div className="mt-4">
          <SupportPlanCard items={planItems} onChanged={onRefresh ? async () => { await onRefresh() } : () => {}}
                           followUp={prediction.follow_up} />
        </div>
      )}

      <div className="mt-4 space-y-3">
        <AIBanner text={prediction.disclaimer} />
        <div className="flex flex-wrap gap-3">
          <Button onClick={onDashboard}>Back to dashboard</Button>
          <Button variant="ghost" onClick={() => navigate('/app/history')}>View my history</Button>
        </div>
      </div>
    </>
  )
}
