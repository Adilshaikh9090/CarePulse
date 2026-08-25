import { useRef, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import {
  Activity, BadgeCheck, BarChart3, BrainCircuit, CheckCircle2, CircleDashed,
  Crosshair, FlaskConical, Loader2, MoonStar, ShieldCheck, Sparkles,
  Target, TriangleAlert, X,
} from 'lucide-react'
import { AnimatePresence, motion, useMotionValue, useSpring } from 'framer-motion'
import * as api from '../../services'
import type { DemoPrediction } from '../../types'
import { AnimatedNumber } from '../../components/visuals/motion'
import { Button, DisclaimerNote, PageHeader } from '../../components/ui'

/* ---------- scenario presets (mapped to the existing PredictRequest contract) ---------- */
const SCENARIOS = [
  {
    id: 'low', label: 'Low Risk', subtext: 'Stable workload, good rest',
    icon: ShieldCheck, tone: '#34d399',
    tile: 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/30',
    payload: { workload_score: 3, fatigue_score: 2, sleep_quality: 4, duty_hours: 7,
               overtime_frequency: 0, job_satisfaction: 8, rest_break_quality: 4,
               self_reported_stress: 2, recent_workload_change: 0 },
    fallbackActions: ['Continue regular wellbeing check-ins', 'Keep a consistent sleep routine', 'Maintain current workload balance'],
  },
  {
    id: 'moderate', label: 'Moderate Risk', subtext: 'Rising workload and fatigue',
    icon: Activity, tone: '#fbbf24',
    tile: 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30',
    payload: { workload_score: 6, fatigue_score: 6, sleep_quality: 3, duty_hours: 9,
               overtime_frequency: 3, job_satisfaction: 6, rest_break_quality: 3,
               self_reported_stress: 5, recent_workload_change: 1 },
    fallbackActions: ['Encourage adequate rest period', 'Review recent duty-hour patterns', 'Schedule a follow-up check-in'],
  },
  {
    id: 'high', label: 'High Risk', subtext: 'Multiple elevated indicators',
    icon: TriangleAlert, tone: '#f87171',
    tile: 'bg-gradient-to-br from-rose-400 to-red-500 shadow-lg shadow-rose-500/30',
    payload: { workload_score: 9, fatigue_score: 8, sleep_quality: 2, duty_hours: 12,
               overtime_frequency: 8, job_satisfaction: 4, rest_break_quality: 2,
               self_reported_stress: 8, recent_workload_change: 2 },
    fallbackActions: ['Review current workload', 'Offer an optional confidential welfare consultation', 'Protect recovery time this week'],
  },
] as const

const STEPS = [
  { label: 'Data validation', icon: ShieldCheck },
  { label: 'Workload analysis', icon: BarChart3 },
  { label: 'Fatigue analysis', icon: MoonStar },
  { label: 'Risk estimation', icon: Crosshair },
  { label: 'Recommendation generation', icon: Sparkles },
]
const STEP_MS = 430
const MIN_ANIM_MS = STEPS.length * STEP_MS + STEP_MS

const BURST = Array.from({ length: 10 }, (_, i) => {
  const a = (i / 10) * Math.PI * 2
  return { x: Math.cos(a) * 42, y: Math.sin(a) * 42 }
})

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/* ---------- shared reveal variants (blur-to-sharp cascade) ---------- */
const cardVariants = {
  hidden: { opacity: 0, y: 26, filter: 'blur(10px)' },
  show: (i: number) => ({
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 0.55, delay: i * 0.13, ease: [0.22, 1, 0.36, 1] as const },
  }),
}

export default function PredictionDemo() {
  const [activeId, setActiveId] = useState<typeof SCENARIOS[number]['id'] | null>(null)
  const [phase, setPhase] = useState<'idle' | 'processing' | 'done'>('idle')
  const [stepIdx, setStepIdx] = useState(0)
  const [demo, setDemo] = useState<DemoPrediction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  const processing = phase === 'processing'

  const runScenario = async (id: typeof SCENARIOS[number]['id']) => {
    if (processing) return
    const scenario = SCENARIOS.find((s) => s.id === id)!
    setActiveId(id)
    setError(null)
    setDemo(null)
    setStepIdx(0)
    setPhase('processing')

    // fire API immediately; animation runs its minimum duration in parallel
    const apiCall = api.runDemoPrediction(scenario.payload)
    for (let i = 1; i <= STEPS.length; i++) {
      setTimeout(() => setStepIdx(i), i * STEP_MS)
    }
    const [result] = await Promise.all([apiCall, sleep(MIN_ANIM_MS)]).catch(() => [null])

    setPhase('done')
    if (result) {
      setDemo(result)
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    } else {
      setError('Prediction service unavailable. Please try again.')
    }
  }

  return (
    <>
      <PageHeader
        title="AI prediction demo"
        subtitle="Run the real welfare-risk model on preset scenarios — nothing is saved to your record."
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-violet-300 ring-1 ring-violet-500/25">
            <FlaskConical size={12} /> Live demo
          </span>
        }
      />

      {/* ---------- scenario picker ---------- */}
      <div className="grid gap-4 sm:grid-cols-3" style={{ perspective: 900 }}>
        {SCENARIOS.map((s, i) => (
          <ScenarioCard key={s.id} s={s} i={i}
                        active={activeId === s.id} processing={processing}
                        onRun={() => runScenario(s.id)} />
        ))}
      </div>

      {/* ---------- error banner ---------- */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0, x: [0, -7, 7, -4, 4, 0] }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.45 }}
            className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-rose-500/10 px-4 py-3 ring-1 ring-rose-500/30"
          >
            <p className="text-sm text-rose-200">Prediction service unavailable. Please try again.</p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost"
                      onClick={() => activeId && runScenario(activeId)}>Retry</Button>
              <Button size="sm" variant="ghost" onClick={() => setError(null)} aria-label="Dismiss">
                <X size={14} />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- processing stepper ---------- */}
      <AnimatePresence mode="wait">
        {processing && (
          <motion.div
            key="stepper"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="glass relative mx-auto mt-5 w-full max-w-md overflow-hidden rounded-2xl p-6 ring-1 ring-line card-elevate"
          >
            {/* scanning sheen */}
            <motion.span aria-hidden
              className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-sky-400/[0.07] to-transparent"
              initial={{ x: '-140%' }} animate={{ x: '340%' }}
              transition={{ repeat: Infinity, duration: 2.2, ease: 'linear' }} />

            {/* brain header */}
            <div className="flex items-center gap-4">
              <span className="relative flex h-14 w-14 items-center justify-center">
                <span aria-hidden className="absolute inset-0 rounded-full animate-spin"
                      style={{
                        background: 'conic-gradient(from 0deg, rgba(56,189,248,0), rgba(56,189,248,.55), rgba(139,92,246,.55), rgba(56,189,248,0))',
                        animationDuration: '2.4s',
                        mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
                        WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
                      }} />
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/40">
                  <BrainCircuit size={22} />
                </span>
              </span>
              <div>
                <p className="bg-gradient-to-r from-sky-300 via-violet-300 to-sky-300 bg-clip-text text-sm font-semibold text-transparent">
                  AI analysis in progress
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Running RandomForest inference on the selected scenario
                </p>
              </div>
            </div>

            {/* vertical stepper */}
            <ul className="relative mt-5 space-y-4 pl-1">
              <span aria-hidden className="absolute bottom-3 left-[15px] top-3 w-px bg-linestrong" />
              <motion.span aria-hidden
                className="absolute left-[15px] top-3 w-px bg-gradient-to-b from-sky-400 to-emerald-400"
                initial={false}
                animate={{ height: `${Math.min((stepIdx / STEPS.length) * 100, 100)}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }} />
              {[...STEPS.map((st) => st.label), 'Analysis Complete'].map((label, i) => {
                const isFinal = i === STEPS.length
                const done = stepIdx > i
                const current = stepIdx === i
                const StepIcon = isFinal ? Target : STEPS[i].icon
                return (
                  <motion.li key={label} layout className="relative flex items-center gap-3 pl-7">
                    <span className="absolute -left-1 flex h-[31px] items-center">
                      {done ? (
                        <motion.span initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }}
                                     transition={{ type: 'spring', stiffness: 420, damping: 18 }}>
                          <CheckCircle2 size={19} className={isFinal ? 'fill-emerald-500/20 text-emerald-400' : 'fill-sky-500/20 text-sky-400'} />
                        </motion.span>
                      ) : current ? (
                        <Loader2 size={17} className="animate-spin text-sky-400" />
                      ) : (
                        <CircleDashed size={16} className="text-slate-600" />
                      )}
                    </span>
                    <StepIcon size={14} className={`shrink-0 ${done ? 'text-sky-300/80' : current ? 'text-sky-300' : 'text-slate-600'}`} />
                    <motion.span
                      animate={{ x: done || current ? 3 : 0 }}
                      className={`text-sm transition-colors ${
                        isFinal && done ? 'font-semibold text-emerald-300'
                        : done ? 'text-slate-200' : current ? 'font-medium text-sky-300' : 'text-slate-500'}`}>
                      {label}{isFinal && !done ? '…' : ''}
                    </motion.span>
                    {isFinal && stepIdx > STEPS.length - 1 && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                                   transition={{ type: 'spring', stiffness: 380, damping: 14 }}
                                   className="relative ml-auto flex h-6 w-6 items-center justify-center">
                        {BURST.map((b, k) => (
                          <motion.span key={k} aria-hidden
                            className="absolute h-1 w-1 rounded-full bg-emerald-400"
                            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                            animate={{ x: b.x, y: b.y, opacity: 0, scale: 0.4 }}
                            transition={{ duration: 0.75, delay: k * 0.02, ease: 'easeOut' }} />
                        ))}
                        <BadgeCheck size={22} className="text-emerald-400" />
                      </motion.span>
                    )}
                  </motion.li>
                )
              })}
            </ul>

            {/* progress bar */}
            <div className="mt-5 flex items-center gap-3">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-hoverc">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-violet-500"
                            initial={false}
                            animate={{ width: `${Math.min((stepIdx / (STEPS.length + 1)) * 100, 100)}%` }}
                            transition={{ duration: 0.35, ease: 'easeOut' }} />
              </div>
              <AnimatedNumber value={Math.min(Math.round((stepIdx / (STEPS.length + 1)) * 100), 100)}
                              suffix="%" className="w-10 text-right text-[11px] font-semibold text-slate-400" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- result section ---------- */}
      <div ref={resultRef}>
        <AnimatePresence mode="wait">
          {!processing && demo && (
            <motion.div key={`${activeId}-${demo.risk_score}`}
                        initial="hidden" animate="show" exit={{ opacity: 0, y: -14, transition: { duration: 0.25 } }}
                        className="mt-5 space-y-4">
              {/* gauge */}
              <motion.section variants={cardVariants} custom={0}
                              className="glass overflow-hidden rounded-2xl ring-1 ring-line card-elevate">
                <header className="flex items-start justify-between px-5 pt-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">Risk indicator</h3>
                    <p className="mt-0.5 text-xs text-slate-400">RandomForest ensemble output on the selected scenario</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-hoverc px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    <Target size={11} /> Result
                  </span>
                </header>
                <div className="flex flex-wrap items-center gap-8 px-5 pb-6 pt-2 sm:flex-nowrap">
                  <motion.div initial={{ scale: 0.85, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: 'spring', stiffness: 220, damping: 20, delay: 0.15 }}
                              className="relative mx-auto shrink-0">
                    <span aria-hidden className="absolute inset-4 rounded-full blur-2xl"
                          style={{ background: `${levelColor(demo.risk_level)}26` }} />
                    <DemoGauge score={demo.risk_score} level={demo.risk_level} />
                  </motion.div>
                  <div className="min-w-[210px] flex-1 space-y-3">
                    <motion.span initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                 transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.35 }}
                                 className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide ${levelBadge(demo.risk_level)}`}>
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                              style={{ background: levelColor(demo.risk_level) }} />
                        <span className="relative inline-flex h-2 w-2 rounded-full"
                              style={{ background: levelColor(demo.risk_level) }} />
                      </span>
                      {demo.risk_level} risk
                    </motion.span>
                    <p className="text-4xl font-extrabold tracking-tight text-slate-50">
                      <AnimatedNumber value={Math.round(demo.risk_score * 100)} suffix="%" />
                    </p>
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Model confidence</span>
                        <span className="font-semibold text-slate-300">{Math.round(demo.confidence * 100)}%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-hoverc">
                        <motion.div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-400"
                                    initial={{ width: 0 }} animate={{ width: `${demo.confidence * 100}%` }}
                                    transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] }} />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.section>

              {/* why this result */}
              <motion.section variants={cardVariants} custom={1}
                              className="glass rounded-2xl ring-1 ring-line card-elevate">
                <header className="px-5 pt-4 pb-1">
                  <h3 className="text-sm font-semibold text-slate-100">Why this result?</h3>
                  <p className="mt-0.5 text-xs text-slate-400">Top contributing factors · per-factor sensitivity analysis</p>
                </header>
                <ol className="space-y-4 px-5 pb-5 pt-2">
                  {demo.top_factors.slice(0, 3).map((f, i) => (
                    <li key={f.name}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex items-center gap-2 font-medium text-slate-200">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-hoverc text-[10px] font-bold text-slate-400">{i + 1}</span>
                          {f.name}
                        </span>
                        <span className={`text-xs font-bold ${f.direction === 'increasing' ? 'text-rose-300' : 'text-emerald-300'}`}>
                          <AnimatedNumber value={Math.round(f.impact * 100)} suffix="%" />
                        </span>
                      </div>
                      <div className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-hoverc">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(f.impact * 100, 4)}%` }}
                          transition={{ duration: 1, delay: 0.35 + i * 0.18, ease: [0.22, 1, 0.36, 1] }}
                          className={`h-full rounded-full ${f.direction === 'increasing'
                            ? 'bg-gradient-to-r from-rose-400/50 via-rose-400 to-rose-300'
                            : 'bg-gradient-to-r from-emerald-400/50 via-emerald-400 to-emerald-300'}`}
                          style={{ boxShadow: `0 0 12px ${f.direction === 'increasing' ? '#f8717155' : '#34d39955'}` }} />
                        <motion.span aria-hidden
                          className="absolute inset-y-0 w-1/4 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                          initial={{ x: '-160%' }} animate={{ x: '420%' }}
                          transition={{ delay: 1.35 + i * 0.18, duration: 0.85, ease: 'easeInOut' }} />
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{f.description}</p>
                    </li>
                  ))}
                </ol>
                {demo.top_factors[0] && (
                  <div className="mx-5 mb-5 rounded-xl border-l-2 border-sky-400/70 bg-subtle px-4 py-3 ring-1 ring-line">
                    <p className="text-xs leading-relaxed text-slate-300">
                      <Sparkles size={13} className="mr-1.5 inline text-sky-400" />
                      <strong className="text-slate-100">{demo.top_factors[0].name}</strong> is currently the strongest contributor to this result.
                    </p>
                  </div>
                )}
              </motion.section>

              {/* recommended actions */}
              <motion.section variants={cardVariants} custom={2}
                              className="glass rounded-2xl ring-1 ring-line card-elevate">
                <header className="px-5 pt-4 pb-1">
                  <h3 className="text-sm font-semibold text-slate-100">Recommended actions</h3>
                  <p className="mt-0.5 text-xs text-slate-400">Supportive, voluntary next steps — never disciplinary</p>
                </header>
                <ul className="grid gap-3 px-5 pb-5 pt-2 sm:grid-cols-3">
                  {(demo.plan?.length ? demo.plan.slice(0, 3) : fallbackCards(activeId)).map((a, i) => (
                    <motion.li key={a.title}
                               initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
                               whileHover={{ y: -4 }}
                               transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.55 + i * 0.12 }}
                               className="glass relative overflow-hidden rounded-xl p-4 pt-5 ring-1 ring-line">
                      <span aria-hidden className="absolute inset-x-0 top-0 h-[2.5px]"
                            style={{ background: `linear-gradient(90deg, transparent, ${a.tier === 'high' ? '#f87171' : a.tier === 'recommended' ? '#fbbf24' : '#38bdf8'}, transparent)` }} />
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tierChip(a.tier)}`}>
                        {a.tier === 'high' && (
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute h-full w-full animate-ping rounded-full bg-rose-400 opacity-70" />
                            <span className="relative h-1.5 w-1.5 rounded-full bg-rose-400" />
                          </span>
                        )}
                        {tierLabel(a.tier)}
                      </span>
                      <p className="mt-2 text-sm font-semibold leading-snug text-slate-100">{a.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">{a.reason}</p>
                    </motion.li>
                  ))}
                </ul>
              </motion.section>

              <motion.div variants={cardVariants} custom={3}>
                <DisclaimerNote>{demo.disclaimer}</DisclaimerNote>
              </motion.div>

              <motion.p variants={cardVariants} custom={4}
                        className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] text-slate-500">
                <span><FlaskConical size={11} className="mr-1 inline" />Demo Mode — synthetic scenario data.</span>
                <span>model_version {demo.model_version}</span>
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

/* ================= scenario card ================= */
function ScenarioCard({ s, i, active, processing, onRun }: {
  s: typeof SCENARIOS[number]; i: number; active: boolean; processing: boolean; onRun: () => void
}) {
  const rx = useMotionValue(0)
  const ry = useMotionValue(0)
  const srx = useSpring(rx, { stiffness: 240, damping: 20 })
  const sry = useSpring(ry, { stiffness: 240, damping: 20 })

  const onMove = (e: MouseEvent<HTMLButtonElement>) => {
    if (processing) return
    const r = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    ry.set(px * 8); rx.set(-py * 8)
    e.currentTarget.style.setProperty('--mx', `${((px + 0.5) * 100).toFixed(1)}%`)
    e.currentTarget.style.setProperty('--my', `${((py + 0.5) * 100).toFixed(1)}%`)
  }
  const onLeave = () => { rx.set(0); ry.set(0) }

  return (
    <motion.button
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 240, damping: 22, delay: i * 0.09 }}
      whileHover={processing ? undefined : { y: -5 }}
      whileTap={processing ? undefined : { scale: 0.98 }}
      onMouseMove={onMove} onMouseLeave={onLeave}
      onClick={onRun} disabled={processing} aria-pressed={active}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 800 }}
      className={`group glass relative overflow-hidden rounded-2xl p-5 text-left ring-1 card-elevate transition-shadow duration-300 ${
        processing && !active ? 'opacity-40 saturate-50' : ''
      } ${active ? '' : 'ring-line hover:ring-linestrong'}`}
    >
      {/* mouse spotlight */}
      <span aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: 'radial-gradient(180px circle at var(--mx, 50%) var(--my, 50%), rgba(56,189,248,0.10), transparent 72%)' }} />
      {/* sliding active glow */}
      {active && (
        <motion.span aria-hidden layoutId="demo-active-ring"
                     transition={{ type: 'spring', stiffness: 300, damping: 32 }}
                     className="pointer-events-none absolute inset-0 rounded-2xl"
                     style={{ boxShadow: `inset 0 0 0 1.5px ${s.tone}66, 0 14px 44px -14px ${s.tone}66` }} />
      )}

      <div className="relative">
        <motion.span
          animate={active ? { scale: [1, 1.08, 1] } : undefined}
          transition={active ? { repeat: Infinity, duration: 2, ease: 'easeInOut' } : undefined}
          className={`inline-flex rounded-xl p-2.5 text-white ${s.tile}`}>
          <s.icon size={20} />
        </motion.span>
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-100">
          {s.label}
          <ChevronSlide visible={!processing} />
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">{s.subtext}</p>
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
          {active ? (processing ? 'Running…' : 'Active — click to re-run') : 'Click to run demo'}
        </p>
      </div>
    </motion.button>
  )
}

function ChevronSlide({ visible }: { visible: boolean }) {
  return (
    <motion.span aria-hidden
      animate={{ x: visible ? [0, 4, 0] : 0, opacity: visible ? 1 : 0 }}
      transition={visible ? { repeat: Infinity, duration: 1.6, ease: 'easeInOut' } : { duration: 0.2 }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.5"
           strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
    </motion.span>
  )
}

/* ================= gauge ================= */
function DemoGauge({ score, level }: { score: number; level: 'Low' | 'Moderate' | 'High' | 'Critical' }) {
  const size = 196, R = 78, C = 2 * Math.PI * R, cx = size / 2, cy = size / 2
  const color = levelColor(level)
  const angle = score * 2 * Math.PI - Math.PI / 2
  const tipX = cx + R * Math.cos(angle)
  const tipY = cy + R * Math.sin(angle)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${level} risk, ${Math.round(score * 100)} percent`}>
      <defs>
        <linearGradient id={`gg-${level}`} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} stopOpacity="0.45" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>

      {/* rotating decorative dashed ring */}
      <g className="animate-spin" style={{ animationDuration: '46s', transformOrigin: `${cx}px ${cy}px` }}>
        <circle cx={cx} cy={cy} r={R + 14} fill="none" stroke="var(--gauge-track)" strokeWidth="1.5"
                strokeDasharray="2 7" opacity="0.7" />
      </g>

      {/* three zone arcs */}
      {[['#34d399', -90], ['#fbbf24', 30], ['#f87171', 150]].map(([zc, rot], k) => (
        <circle key={k} cx={cx} cy={cy} r={R} fill="none" stroke={zc as string} strokeWidth="11"
                opacity="0.14" strokeLinecap="round"
                strokeDasharray={`${C / 3 - 7} ${C}`} transform={`rotate(${rot as number} ${cx} ${cy})`} />
      ))}

      {/* value arc */}
      <motion.circle
        cx={cx} cy={cy} r={R} fill="none" stroke={`url(#gg-${level})`} strokeWidth="11"
        strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
        style={{ filter: `drop-shadow(0 0 7px ${color}88)` }}
        initial={{ strokeDasharray: `0 ${C}` }}
        animate={{ strokeDasharray: `${C * Math.min(score, 1)} ${C}` }}
        transition={{ duration: 1.25, delay: 0.35, ease: [0.22, 1, 0.36, 1] }} />

      {/* glowing tip dot riding the arc end */}
      <motion.g initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.45, type: 'spring', stiffness: 300, damping: 16 }}
                style={{ transformOrigin: `${tipX}px ${tipY}px` }}>
        <circle cx={tipX} cy={tipY} r={8} fill={color} opacity="0.28" />
        <circle cx={tipX} cy={tipY} r={3.6} fill="#fff" stroke={color} strokeWidth="2" />
      </motion.g>

      {/* center overlay */}
      <foreignObject x={cx - 62} y={cy - 40} width={124} height={84}>
        <div className="flex h-full flex-col items-center justify-center">
          <p className="text-[32px] font-extrabold leading-none tracking-tight text-slate-50 dark:text-slate-50"
             style={{ color: 'var(--gauge-text)' }}>
            <AnimatedNumber value={Math.round(score * 100)} suffix="%" />
          </p>
          <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.2em]" style={{ color: color }}>
            {level} risk
          </p>
        </div>
      </foreignObject>
    </svg>
  )
}

/* ================= small helpers ================= */
function levelColor(level: string) {
  return level === 'High' ? '#f87171' : level === 'Moderate' ? '#fbbf24' : '#34d399'
}
function levelBadge(level: string) {
  return level === 'High' ? 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30'
       : level === 'Moderate' ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30'
       : 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
}
function tierChip(tier?: string) {
  return tier === 'high' ? 'bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/25'
       : tier === 'recommended' ? 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/25'
       : 'bg-sky-500/10 text-sky-300 ring-1 ring-sky-500/25'
}
function tierLabel(tier?: string) {
  return tier === 'high' ? 'High Priority' : tier === 'recommended' ? 'Recommended' : 'Optional'
}
function fallbackCards(id: typeof SCENARIOS[number]['id'] | null) {
  const s = SCENARIOS.find((x) => x.id === id)
  return (s?.fallbackActions ?? []).map((title) => ({
    title, reason: 'Suggested supportive step for this scenario.', timeframe: '', tier: 'optional',
  }))
}
