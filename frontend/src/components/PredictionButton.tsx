import { motion } from 'framer-motion'
import { BrainCircuit, Loader2, Sparkles } from 'lucide-react'

/** Show-stopping action button for running an AI prediction. */
export default function PredictionButton({ onClick, loading, disabled }: {
  onClick: () => void
  loading?: boolean
  disabled?: boolean
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={loading ? undefined : { y: -3, scale: 1.02 }}
      whileTap={loading ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 380, damping: 20 }}
      className="group relative mt-1 w-full overflow-hidden rounded-2xl px-6 py-4 text-left"
    >
      {/* layered gradient background */}
      <span aria-hidden className="absolute inset-0" style={{
        background: 'linear-gradient(135deg, #0EA5E9 0%, #6366F1 50%, #8B5CF6 100%)',
      }} />
      {/* animated sheen sweep */}
      <span aria-hidden
            className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
      {/* inner glow ring */}
      <span aria-hidden
            className="absolute inset-px rounded-2xl ring-1 ring-inset ring-white/20" />
      {/* orbiting glow dot */}
      <span aria-hidden
            className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/20 blur-2xl" />

      <span className="relative flex items-center justify-between gap-3">
        <span className="flex items-center gap-3">
          <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
            {loading ? (
              <Loader2 size={20} className="animate-spin text-white" />
            ) : (
              <BrainCircuit size={20} className="text-white transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110" />
            )}
          </span>
          <span>
            <span className="block text-sm font-bold tracking-wide text-white drop-shadow-sm">
              {loading ? 'Analyzing wellbeing signals…' : 'Run AI Prediction'}
            </span>
            <span className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-white/70">
              <Sparkles size={11} className={loading ? 'animate-pulse' : ''} />
              {loading ? 'Model inference in progress' : 'Real-time risk assessment'}
            </span>
          </span>
        </span>
        <span aria-hidden
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/25 transition-all duration-300 ${loading ? 'opacity-60' : 'group-hover:bg-white/35 group-hover:translate-x-1'}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
               strokeLinecap="round" strokeLinejoin="round" aria-hidden
               className={`${loading ? 'hidden' : ''}`}>
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          {loading && <Loader2 size={14} className="animate-spin text-white" />}
        </span>
      </span>

      {/* bottom accent line */}
      <span aria-hidden className="absolute inset-x-6 -bottom-px h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </motion.button>
  )
}