import { useEffect, useState } from 'react'
import { BrainCircuit, Check, Loader2 } from 'lucide-react'

const STEPS = [
  'Collecting your wellbeing indicators…',
  'Analyzing patterns in check-ins…',
  'Comparing risk factors against the model…',
  'Preparing your explanation…',
]

const STEP_MS = 1000

export default function AIProcessing({ label = 'Analyzing your wellbeing indicators' }: { label?: string }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    setStep(0)
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length)), STEP_MS)
    return () => clearInterval(t)
  }, [])

  const done = step >= STEPS.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/85 p-4 backdrop-blur-sm">
      <div className="relative w-[min(92vw,360px)] overflow-hidden rounded-3xl bg-navy-800/90 px-6 py-8 text-center ring-1 ring-linestrong card-elevate backdrop-blur-xl">
        {/* top glow */}
        <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-sky-500/20 blur-3xl" />

        {/* animated orb */}
        <span className="relative mx-auto flex h-20 w-20 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-sky-500/25" style={{ animationDuration: '1.6s' }} />
          <span className="absolute inset-1 animate-spin rounded-full border border-transparent border-t-sky-400 border-r-sky-400/40" style={{ animationDuration: '1.4s' }} />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/25 to-violet-500/25 text-sky-300 ring-1 ring-sky-500/40">
            <BrainCircuit size={30} className={done ? '' : 'animate-pulse'} />
          </span>
        </span>

        <h3 className="mt-5 text-base font-bold text-slate-50">{label}</h3>
        <p className="mt-1 text-xs text-slate-500">This usually takes a few seconds</p>

        {/* progressive steps */}
        <ol className="mx-auto mt-5 max-w-[280px] space-y-2 text-left">
          {STEPS.map((s, i) => {
            const active = i === step && !done
            const complete = i < step || done
            return (
              <li
                key={s}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-xs transition-all duration-500 ${
                  active
                    ? 'bg-sky-500/10 text-sky-100 ring-1 ring-sky-500/30'
                    : complete
                      ? 'text-slate-400'
                      : 'text-slate-600'
                }`}
              >
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1 transition-all duration-300 ${
                  complete
                    ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
                    : active
                      ? 'bg-sky-500/15 text-sky-300 ring-sky-500/40'
                      : 'bg-subtle text-slate-600 ring-line'
                }`}>
                  {complete ? <Check size={11} strokeWidth={3} /> : active ? <Loader2 size={11} className="animate-spin" /> : i + 1}
                </span>
                <span className={active ? 'font-medium' : ''}>{s}</span>
              </li>
            )
          })}
        </ol>

        {/* progress bar */}
        <div className={`relative mt-5 h-1.5 w-full overflow-hidden rounded-full bg-hoverc ${done ? 'opacity-40' : ''}`}>
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sky-500 to-violet-500 transition-all duration-700 ease-out"
            style={{ width: `${(step / STEPS.length) * 100}%`, transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }}
          />
          <div className="absolute inset-y-0 w-1/3 animate-pulse rounded-full bg-white/10 blur-[2px]" />
        </div>
        {done && <p className="mt-2 text-[11px] font-medium text-emerald-300">Almost done — finalizing your result…</p>}

        <p className="mt-4 text-[10px] text-slate-600">Your responses stay confidential and are never shared with peers.</p>
      </div>
    </div>
  )
}