import { TrendingDown, TrendingUp, Minus } from 'lucide-react'

const MIN = -3
const MAX = 3

function toneFor(v: number): string {
  if (v <= -1) return 'text-emerald-300 bg-emerald-500/10 ring-emerald-500/25'
  if (v >= 1) return 'text-amber-300 bg-amber-500/10 ring-amber-500/25'
  return 'text-slate-300 bg-subtle ring-line'
}

function faceFor(v: number): string {
  if (v <= -1) return 'Workload decreasing — easing up'
  if (v >= 1) return 'Workload increasing — busier than usual'
  return 'No notable change'
}

/** Touch-friendly slider for the -3..+3 workload change scale (mobile + desktop). */
export default function WorkloadChangeSlider({ value, onChange }: {
  value: string
  onChange: (v: string) => void
}) {
  const num = Number(value ?? 0)
  const clamped = Number.isFinite(num) ? Math.max(MIN, Math.min(MAX, num)) : 0
  const pct = ((clamped - MIN) / (MAX - MIN)) * 100

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${toneFor(clamped)}`}>
          {clamped > 0 ? <TrendingUp size={12} /> : clamped < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
          {clamped > 0 ? `+${clamped}` : clamped}
        </span>
        <span className="text-[10px] text-slate-500">{faceFor(clamped)}</span>
      </div>

      <input
        type="range"
        min={MIN}
        max={MAX}
        step={1}
        value={clamped}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full cursor-pointer appearance-none"
        style={{
          background: `linear-gradient(to right, #34d399 ${((0 - MIN) / (MAX - MIN)) * 100}%, #38bdf8 ${((0 - MIN) / (MAX - MIN)) * 100}%, #38bdf8 ${pct}%, rgba(56,189,248,0.18) ${pct}%)`,
          height: 6,
          borderRadius: 999,
          accentColor: clamped < 0 ? '#34d399' : clamped > 0 ? '#fbbf24' : '#38bdf8',
        }}
      />

      <div className="mt-1 flex items-center justify-between text-[9px] font-medium text-slate-500">
        <span>−3 decrease</span>
        <span className="flex items-center gap-1 text-slate-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> 0 no change
        </span>
        <span>+3 increase</span>
      </div>

      <div className="mt-1.5 flex gap-1">
        {[MIN, -2, -1, 0, 1, 2, MAX].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(String(v))}
            aria-pressed={clamped === v}
            className={`flex-1 rounded-lg py-1 text-[11px] font-semibold ring-1 transition ${
              clamped === v
                ? 'bg-sky-500/25 text-sky-200 ring-sky-400/50'
                : 'bg-subtle text-slate-400 ring-line hover:bg-hoverc hover:text-slate-200'
            }`}
          >
            {v > 0 ? `+${v}` : v}
          </button>
        ))}
      </div>
    </div>
  )
}