import { BrainCircuit } from 'lucide-react'

const STEPS = ['Collecting indicators…', 'Analyzing patterns…', 'Comparing with model…', 'Preparing explanation…']

export default function AIProcessing({ label = 'Running AI analysis' }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/85 backdrop-blur-sm">
      <div className="flex w-[min(90vw,340px)] flex-col items-center rounded-2xl bg-navy-800/90 px-6 py-8 ring-1 ring-linestrong backdrop-blur-xl">
        <span className="relative flex h-16 w-16 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-sky-500/20" />
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/40">
            <BrainCircuit size={26} />
          </span>
        </span>
        <p className="mt-4 text-sm font-semibold text-slate-100">{label}</p>
        <ul className="mt-3 space-y-1 text-center">
          {STEPS.map((s, i) => (
            <li key={s} className="text-[11px] text-slate-500" style={{ animationDelay: `${i * 0.4}s` }}>
              {s}
            </li>
          ))}
        </ul>
        <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-hoverc">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-sky-500 to-violet-500" />
        </div>
        <p className="mt-3 text-[10px] text-slate-600">Your responses stay confidential and are never shared with peers.</p>
      </div>
    </div>
  )
}
