import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

/** Logo image + text with a slow pulsing glow. */
export default function BrandLogo({ to = '/', size = 40 }: { to?: string; size?: number }) {
  return (
    <Link to={to} className="group relative inline-flex items-center gap-3">
      <span className="relative flex items-center justify-center">
        <span aria-hidden
              className="pulse-glow absolute h-14 w-14 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.30), transparent 70%)' }} />
        <img src="/logo.png" alt="PersonnelAI logo" width={size} height={size}
             className="relative rounded-lg object-cover" />
      </span>
      <span className="text-left leading-tight">
        <span className="block text-base font-extrabold tracking-[0.18em] text-slate-50">
          PERSONNELAI
        </span>
        <span className="block text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-500">
          Predictive Welfare Monitoring
        </span>
      </span>
    </Link>
  )
}

export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`inline-block ${className}`}
    >
      <BrandLogo />
    </motion.span>
  )
}
