import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, BrainCircuit, CheckCircle2, FileBarChart2, Fingerprint, HeartHandshake,
  HeartPulse, Lock, Radar, ShieldAlert, ShieldCheck, Smartphone, Users,
} from 'lucide-react'
import { FOOTER_NOTE } from '../types'
import { ThemeToggle } from '../components/ThemeToggle'
import AuroraBackground from '../components/visuals/AuroraBackground'

/* ---------- animated system flow ---------- */
function FlowVisualization() {
  const nodes = [
    { id: 'checkin', label: 'Daily check-in', Icon: HeartPulse, tone: 'text-emerald-300 ring-emerald-500/40 bg-emerald-500/10' },
    { id: 'ai', label: 'AI analysis', Icon: BrainCircuit, tone: 'text-sky-300 ring-sky-500/40 bg-sky-500/10' },
    { id: 'alert', label: 'Early warning', Icon: ShieldAlert, tone: 'text-amber-300 ring-amber-500/40 bg-amber-500/10' },
    { id: 'support', label: 'Human support', Icon: HeartHandshake, tone: 'text-violet-300 ring-violet-500/40 bg-violet-500/10' },
  ]
  const [active, setActive] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % nodes.length), 1600)
    return () => clearInterval(t)
  }, [nodes.length])

  return (
    <div className="glass relative overflow-hidden rounded-3xl p-6 ring-1 ring-linestrong card-elevate sm:p-8">
      {/* traveling particles */}
      <div aria-hidden className="pointer-events-none absolute inset-x-8 top-[52px] h-0.5">
        {[0, 1, 2].map((i) => (
          <motion.span key={i}
            initial={{ left: '0%', opacity: 0 }}
            animate={{ left: ['0%', '100%'], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 2.2, delay: i * 0.7, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-[3px] h-2 w-2 rounded-full bg-gradient-to-r from-sky-400 to-violet-400 shadow shadow-sky-400/50" />
        ))}
      </div>

      <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {nodes.map(({ id, label, Icon, tone }, i) => {
          const lit = i <= active
          const isCurrent = i === active
          return (
            <div key={id} className="flex flex-col items-center gap-2 text-center">
              <motion.span animate={isCurrent ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                           transition={{ duration: 0.9 }}
                           className={`relative flex h-12 w-12 items-center justify-center rounded-2xl ring-1 transition-all duration-500 sm:h-14 sm:w-14 ${lit ? tone : 'bg-subtle text-slate-500 ring-line'}`}>
                <Icon size={20} />
                {isCurrent && (
                  <span className="absolute inset-0 animate-ping rounded-2xl ring-2 ring-current opacity-30" />
                )}
                {lit && !isCurrent && (
                  <CheckCircle2 size={13} className="absolute -right-1.5 -top-1.5 rounded-full bg-navy-900 text-emerald-400" />
                )}
              </motion.span>
              <span className={`text-[10px] font-semibold leading-tight sm:text-xs ${lit ? 'text-slate-200' : 'text-slate-600'}`}>
                {label}
              </span>
            </div>
          )
        })}
      </div>

      <motion.p key={active} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="mt-5 rounded-xl bg-subtle px-4 py-3 text-center text-[11px] leading-relaxed text-slate-400 ring-1 ring-line">
        {[ 'Personnel answer five gentle questions — always voluntary, fully confidential.',
           'The explainable AI model turns signals into a wellness-risk indicator with plain-language reasons.',
           'Concerning patterns surface as early-warning alerts for authorized welfare review.',
           'A human welfare officer reaches out with supportive, confidential care.' ][active]}
      </motion.p>
    </div>
  )
}

const FEATURES = [
  { icon: HeartPulse, title: 'Five-question daily check-in', text: 'Feeling, sleep, energy, workload and emotional fatigue — captured in under two minutes.' },
  { icon: BrainCircuit, title: 'Explainable AI indicator', text: 'Low · Moderate · High · Critical levels with stress, burnout and fatigue sub-scores — every result explained in plain language.' },
  { icon: ShieldAlert, title: 'Early-warning alert pipeline', text: 'New → reviewing → assigned → resolved. Alerts route to authorized welfare officers for human decisions only.' },
  { icon: Radar, title: 'Command wellness dashboard', text: 'Commanders see aggregated trends and a workforce wellness score — never individual records.' },
  { icon: Users, title: 'Welfare personnel register', text: 'Anonymized by default (ANON-1001…). Named access exists only for justified reviews and is audit-logged.' },
  { icon: FileBarChart2, title: 'Analytics & correlations', text: 'Heatmaps, workload→stress and sleep→stress patterns, deployment risk and intervention effectiveness.' },
  { icon: Lock, title: 'Privacy & security center', text: 'What-we-collect / why / who transparency, consent toggles, retention periods, encryption details and access history.' },
  { icon: Fingerprint, title: 'Biometrics — off by default', text: 'Optional heart-rate and sleep-device streams stay disabled unless you explicitly opt in.' },
  { icon: Smartphone, title: 'Mobile-first experience', text: 'Bottom navigation, animated check-in flow and responsive dashboards built for the field.' },
]

const TRUST = [
  'Voluntary participation',
  'Confidential responses',
  'Human review always required',
  'Never disciplinary',
]

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-navy-950">
      <AuroraBackground density={0.7} radar />
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[480px] rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30">
            <HeartPulse size={18} />
          </span>
          <span>
            <p className="text-sm font-bold tracking-tight text-slate-50">PersonnelAI</p>
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Welfare Monitoring System</p>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/login" className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-500/25 hover:bg-sky-600">
            Sign in
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-16">
        {/* hero */}
        <section className="grid items-center gap-10 pt-10 lg:grid-cols-2 lg:pt-16">
          <div className="text-center lg:text-left">
            <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                         className="inline-flex items-center gap-2 rounded-full bg-subtle px-3 py-1 text-xs text-slate-400 ring-1 ring-linestrong">
              <ShieldCheck size={13} className="text-emerald-400" /> Hackathon prototype · synthetic data only
            </motion.span>
            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.08 }}
                       className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-slate-50 sm:text-5xl">
              AI-Powered Personnel<br />
              <span className="bg-gradient-to-r from-sky-300 to-violet-300 bg-clip-text text-transparent">Stress & Welfare Monitoring</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.16 }}
                      className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-400 lg:mx-0">
              Early detection, human-led support. Personnel check in daily; our explainable AI turns
              those signals into early welfare-risk indicators so help arrives before problems escalate.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.24 }}
                        className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Link to="/login"
                    className="group inline-flex items-center gap-2 rounded-xl bg-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-600">
                Access Dashboard
                <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link to="/login"
                    className="rounded-xl px-6 py-3 text-sm font-medium text-slate-200 ring-1 ring-sky-400/40 transition hover:bg-hoverc">
                Start Wellness Check-in
              </Link>
            </motion.div>
            <ul className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-2 lg:justify-start">
              {TRUST.map((t) => (
                <li key={t} className="flex items-center gap-1.5 text-xs text-slate-400">
                  <CheckCircle2 size={13} className="text-emerald-400" /> {t}
                </li>
              ))}
            </ul>
          </div>

          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.6, delay: 0.2 }}>
            <FlowVisualization />
          </motion.div>
        </section>

        {/* features */}
        <section id="features" className="mt-20">
          <h2 className="text-center text-2xl font-extrabold tracking-tight text-slate-50">
            Everything a modern welfare system needs
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-slate-400">
            From the first daily question to the last audit log entry — designed around the person, protected by design.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }, i) => (
              <motion.div key={title}
                          initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, margin: '-60px' }}
                          transition={{ duration: 0.45, delay: (i % 3) * 0.08 }}
                          className="rounded-2xl bg-navy-800/60 p-5 ring-1 ring-line transition-all duration-300 hover:-translate-y-0.5 hover:ring-linestrong">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/25">
                  <Icon size={18} />
                </span>
                <h3 className="mt-3 text-sm font-bold text-slate-100">{title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{text}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* privacy strip */}
        <section className="mt-16 rounded-3xl bg-navy-800/50 p-6 ring-1 ring-line sm:p-8">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">
              <Lock size={20} />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-100">Privacy isn't a feature — it's the foundation</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Role-based access keeps commanders at aggregate level. Individual data opens only through
                an audited, justified welfare-review workflow. Every prediction carries the same promise:
                AI-generated wellness indicator — not a medical diagnosis; human welfare review before any intervention.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-line py-5 text-center text-[11px] text-slate-600">
        {FOOTER_NOTE}
      </footer>
    </div>
  )
}
