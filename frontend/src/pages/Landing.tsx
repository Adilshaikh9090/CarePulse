import { Link } from 'react-router-dom'
import { ArrowRight, BrainCircuit, CheckCircle2, FileBarChart2, HeartPulse, Lock, ShieldAlert } from 'lucide-react'
import { FOOTER_NOTE } from '../types'

const FEATURES = [
  { icon: CalendarCheckIcon, title: 'Weekly Wellbeing Check-Ins', text: 'Two-minute confidential check-ins track sleep, fatigue, workload and satisfaction over time.' },
  { icon: BrainCircuit, title: 'AI Risk Indicators', text: 'A RandomForest model converts wellbeing signals into Low / Moderate / High welfare-risk indicators — with plain-language explanations.' },
  { icon: ShieldAlert, title: 'Early Warning Center', text: 'Aggregated trends surface unit-level pressure before it becomes burnout, triggering supportive review.' },
  { icon: HeartPulse, title: 'Supportive Interventions', text: 'Recommendations route to authorized welfare officers for human review — never automated judgments.' },
  { icon: FileBarChart2, title: 'Reports & Analytics', text: 'Anonymized dashboards give leadership the aggregate picture while individual responses stay private.' },
  { icon: Lock, title: 'Privacy by Design', text: 'Role-based access, consent controls, full audit trail, and personal data export — confidentiality is built in.' },
]

function CalendarCheckIcon(props: { size?: number; className?: string }) {
  return (
    <svg width={props.size ?? 20} height={props.size ?? 20} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4" />
    </svg>
  )
}

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-navy-950">
      {/* ambient background */}
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
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Predictive Welfare Monitoring</p>
          </span>
        </div>
        <Link to="/login" className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-navy-950 hover:bg-sky-400">
          Sign in
        </Link>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-16">
        <section className="pt-14 text-center sm:pt-20">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.04] px-3 py-1 text-xs text-slate-400 ring-1 ring-white/10">
            <CheckCircle2 size={13} className="text-emerald-400" /> Hackathon prototype · synthetic data only
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-slate-50 sm:text-5xl">
            Predict stress risk early.<br />
            <span className="bg-gradient-to-r from-sky-300 to-violet-300 bg-clip-text text-transparent">Support your people sooner.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-400">
            PersonnelAI turns routine wellbeing check-ins into early, explainable welfare-risk indicators —
            so support reaches personnel before problems escalate. Human review always stays in the loop.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/login"
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-6 py-3 text-sm font-semibold text-navy-950 shadow-lg shadow-sky-500/25 transition hover:bg-sky-400">
              Launch demo <ArrowRight size={16} />
            </Link>
            <a href="#features"
               className="rounded-xl px-6 py-3 text-sm font-medium text-slate-300 ring-1 ring-white/15 hover:bg-white/5">
              Explore features
            </a>
          </div>
        </section>

        <section id="features" className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl bg-navy-800/60 p-5 ring-1 ring-white/5 transition hover:ring-white/15">
              <span className="inline-flex rounded-xl bg-sky-500/10 p-2.5 text-sky-300"><Icon /></span>
              <h3 className="mt-3 text-sm font-semibold text-slate-100">{title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{text}</p>
            </div>
          ))}
        </section>

        <section className="mt-14 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-5">
          <p className="text-sm font-semibold text-amber-200">Important notice</p>
          <p className="mt-1.5 text-xs leading-relaxed text-amber-100/70">
            This is a demonstration prototype trained on synthetic data. AI outputs are supportive welfare indicators,
            not medical diagnoses or employment judgments. All information shown is fictional.
          </p>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/5 py-4 text-center text-[11px] text-slate-600">
        {FOOTER_NOTE}
      </footer>
    </div>
  )
}
