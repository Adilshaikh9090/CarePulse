import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

/** Shield + AI pulse mark with a slow pulsing glow. */
export default function BrandLogo({ to = '/', size = 40 }: { to?: string; size?: number }) {
  return (
    <Link to={to} className="group relative inline-flex items-center gap-3">
      <span className="relative flex items-center justify-center">
        <span aria-hidden
              className="pulse-glow absolute h-14 w-14 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.30), transparent 70%)' }} />
        <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
          <defs>
            <linearGradient id="brandGrad" x1="6" y1="4" x2="34" y2="36">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#60A5FA" />
            </linearGradient>
          </defs>
          <path d="M20 3.5 33 8.5v9.2c0 7.6-5.1 14-13 17.3C12.1 31.7 7 25.3 7 17.7V8.5L20 3.5Z"
                stroke="url(#brandGrad)" strokeWidth="2" strokeLinejoin="round" fill="rgba(56,189,248,0.08)" />
          <path d="M11.5 20h4.2l2.4-5.5 3.8 10 2.4-4.5h4.2"
                stroke="url(#brandGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
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
