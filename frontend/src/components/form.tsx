import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

const baseInput =
  'w-full rounded-lg border-0 bg-navy-700 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 ring-1 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:cursor-not-allowed disabled:opacity-60'
const okRing = 'ring-line hover:ring-linestrong focus:bg-navy-600'
const errRing = 'ring-rose-500/50 focus:ring-rose-500/60'

function Desc({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  if (error) return <span id={id} role="alert" className="mt-1 block text-[11px] font-medium text-rose-300">{error}</span>
  if (hint) return <span id={id} className="mt-1 block text-[11px] text-slate-500">{hint}</span>
  return null
}

export function FormField({ label, type = 'text', value, onChange, onBlur, placeholder,
                            autoComplete, required, minLength, maxLength, error, hint,
                            helperText, disabled, icon }: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  placeholder?: string
  autoComplete?: string
  required?: boolean
  minLength?: number
  maxLength?: number
  error?: string
  hint?: string
  helperText?: string
  disabled?: boolean
  icon?: LucideIcon
}) {
  const id = useId()
  const descId = error || hint ? `${id}-desc` : undefined
  const Icon = icon
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-slate-300">{label}</label>
      <div className="relative">
        {Icon && (
          <Icon size={15}
                className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${error ? 'text-rose-400' : 'text-slate-500'}`} />
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={[descId, helperText ? `${id}-help` : undefined].filter(Boolean).join(' ') || undefined}
          className={`${baseInput} ${error ? errRing : okRing} ${Icon ? 'pl-9' : ''}`}
        />
      </div>
      {helperText && !error && !hint &&
        <span id={`${id}-help`} className="mt-1 block text-[11px] text-slate-500">{helperText}</span>}
      <Desc id={descId ?? ''} error={error} hint={hint} />
    </div>
  )
}

function strength(pw: string): { score: number; label: string } {
  if (!pw) return { score: 0, label: '' }
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++
  if (/\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  const labels = ['Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Strong']
  return { score: s, label: labels[s] }
}

const METER = [
  '', 'bg-rose-500', 'bg-amber-500',
  'bg-sky-500', 'bg-emerald-500', 'bg-emerald-400',
]

export function PasswordField({ label, value, onChange, onBlur, autoComplete = 'new-password',
                                required, minLength = 8, error, disabled, meter, matchState, icon }: {
  label: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  autoComplete?: string
  required?: boolean
  minLength?: number
  error?: string
  disabled?: boolean
  meter?: boolean
  matchState?: 'idle' | 'matching' | 'match' | 'mismatch'
  icon?: LucideIcon
}) {
  const id = useId()
  const [show, setShow] = useState(false)
  const descId = `${id}-desc`
  const st = strength(value)
  const Icon = icon
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-slate-300">{label}</label>
      <div className="relative">
        {Icon && (
          <Icon size={15}
                className={`pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 transition-colors ${error ? 'text-rose-400' : 'text-slate-500'}`} />
        )}
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={descId}
          placeholder="••••••••"
          className={`${baseInput} pr-10 ${error ? errRing : okRing} ${Icon ? 'pl-9' : ''} ${matchState === 'match' && !error ? 'ring-emerald-500/40' : ''}`}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          tabIndex={0}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition-colors hover:text-sky-300"
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {meter && value.length > 0 && (
        <div className="mt-1.5 flex items-center gap-1.5" aria-hidden>
          <div className="flex flex-1 gap-1">
            {[1, 2, 3, 4].map((i) => (
              <span key={i}
                    className={`h-1 flex-1 rounded-full transition-colors duration-300 ${st.score >= i ? METER[st.score] : 'bg-navy-600'}`} />
            ))}
          </div>
          <span className={`text-[10px] font-medium ${st.score >= 4 ? 'text-emerald-300' : st.score >= 3 ? 'text-sky-300' : 'text-amber-300'}`}>
            {st.label}
          </span>
        </div>
      )}
      <Desc id={descId} error={error}
            hint={!error && matchState === 'match' ? 'Passwords match' :
                  !error && matchState === 'mismatch' ? 'Passwords do not match yet' :
                  minLength ? `At least ${minLength} characters.` : undefined} />
    </div>
  )
}

/** Glassmorphism select trigger — pairs with UnitDropdown for the animated menu. */
export function SelectTrigger({ id, label, children, open, onClick, error, disabled }: {
  id?: string
  label: string
  children: ReactNode
  open: boolean
  onClick: () => void
  error?: string
  disabled?: boolean
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-slate-300">{label}</label>
      <button
        type="button"
        id={id}
        onClick={onClick}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={error ? true : undefined}
        className={`${baseInput} flex items-center justify-between gap-2 text-left ${
          open ? 'ring-2 ring-sky-500/50 bg-navy-600' : error ? errRing : okRing
        }`}
      >
        {children}
      </button>
      <Desc id={`${id ?? ''}-desc`} error={error} />
    </div>
  )
}

export function FormGrid({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-4 ${className}`}>{children}</div>
}

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 flex items-start justify-between gap-3 rounded-xl bg-rose-500/10 px-4 py-3 ring-1 ring-rose-500/30"
    >
      <p className="text-xs leading-relaxed text-rose-200">{message}</p>
      {onDismiss && (
        <button onClick={onDismiss} className="text-xs font-semibold text-rose-300 hover:text-rose-200"
                aria-label="Dismiss">✕</button>
      )}
    </motion.div>
  )
}

export function GradientButton({ children, loading, onClick, type = 'submit', className = '' }: {
  children: ReactNode
  loading?: boolean
  onClick?: () => void
  type?: 'submit' | 'button'
  className?: string
}) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={loading}
      whileHover={loading ? undefined : { y: -2 }}
      whileTap={loading ? undefined : { scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      className={`group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-6 py-3 text-sm font-semibold text-white transition-shadow disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      style={{
        background: 'linear-gradient(135deg, #38BDF8 0%, #60A5FA 55%, #3B82F6 100%)',
        boxShadow: '0 10px 30px -8px rgba(56,189,248,0.45)',
      }}
    >
      <span aria-hidden
            className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.18), transparent 55%)' }} />
      <span aria-hidden
            className="absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-sky-200/70 to-transparent" />
      {loading ? (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ) : null}
      {children}
    </motion.button>
  )
}