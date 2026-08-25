import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck } from 'lucide-react'
import { ThemeToggle } from '../ThemeToggle'
import BrandLogo from '../visuals/BrandLogo'
import AuroraBackground from '../visuals/AuroraBackground'

/** Shared auth shell: animated atmosphere, brand header, system status,
 *  centered glass card container. Used by /login and /signup. */
export default function AuthLayout({ children, footer }: {
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-navy-950">
      <AuroraBackground radar />

      {/* status bar */}
      <div className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-4 pt-4">
        <span className="inline-flex items-center gap-2 rounded-full bg-navy-800/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 ring-1 ring-line backdrop-blur">
          <span className="online-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
          System Online
        </span>
        <ThemeToggle />
      </div>

      {/* brand */}
      <div className="relative z-10 mx-auto mt-8">
        <BrandLogo />
      </div>

      {/* card */}
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mx-auto my-auto w-full max-w-md px-4 py-10"
      >
        {children}
      </motion.div>

      {/* secure indicator */}
      <div className="relative z-10 pb-6 text-center">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-navy-800/60 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500 ring-1 ring-line backdrop-blur">
          <ShieldCheck size={11} className="text-sky-300" /> Secure registration · encrypted session
        </p>
        {footer && (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-600">
            {footer}
          </p>
        )}
      </div>
    </div>
  )
}
