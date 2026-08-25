import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, BadgeCheck, Check, Copy, IdCard, Lock, Mail,
  Phone, ShieldCheck, User,
} from 'lucide-react'
import { ErrorBanner, FormField, FormGrid, GradientButton, PasswordField } from '../components/form'
import UnitDropdown from '../components/UnitDropdown'
import AuthLayout from '../components/layout/AuthLayout'
import { useAuth } from '../context/AuthContext'
import * as api from '../services'

type Values = {
  full_name: string
  email: string
  phone: string
  unit_id: string
  designation: string
  password: string
  confirm: string
}

const EMPTY: Values = {
  full_name: '', email: '', phone: '', unit_id: '',
  designation: '', password: '', confirm: '',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const FIELDS: (keyof Values)[] =
  ['full_name', 'email', 'phone', 'unit_id', 'designation', 'password', 'confirm']

function validate(field: keyof Values, v: Values): string | undefined {
  switch (field) {
    case 'full_name':
      if (!v.full_name.trim()) return 'Please enter your full name'
      if (v.full_name.trim().split(/\s+/).length < 2)
        return 'Please enter your first and last name'
      return undefined
    case 'email':
      if (!v.email.trim() || !EMAIL_RE.test(v.email.trim()))
        return 'Enter a valid email address'
      return undefined
    case 'phone': {
      const digits = v.phone.replace(/\D/g, '')
      if (digits.length > 0 && digits.length < 7) return 'Enter a valid phone number'
      return undefined
    }
    case 'unit_id':
      if (!v.unit_id) return 'Select your duty unit'
      return undefined
    case 'password':
      if (v.password.length < 8) return 'Password must be at least 8 characters'
      return undefined
    case 'confirm':
      if (!v.confirm || v.confirm !== v.password) return 'Passwords do not match'
      return undefined
    default:
      return undefined
  }
}

/* ---------- motion ---------- */
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
}
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
} as const

export default function Register() {
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const [units, setUnits] = useState<{ id: number; name: string }[]>([])
  const [values, setValues] = useState<Values>(EMPTY)
  const [touched, setTouched] = useState<Partial<Record<keyof Values, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [banner, setBanner] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [createdPassword, setCreatedPassword] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api.fetchUnits().then((d) => {
      setUnits(d.items)
      if (d.items.length) setValues((f) => ({ ...f, unit_id: String(d.items[0].id) }))
    }).catch(() => undefined)
  }, [])

  const errorFor = (field: keyof Values): string | undefined =>
    touched[field] || submitted ? validate(field, values) : undefined

  const setField = (field: keyof Values) => (input: string) => {
    setValues((v) => ({ ...v, [field]: input }))
    if (submitted || touched[field]) setTouched((t) => ({ ...t, [field]: true }))
  }
  const blurField = (field: keyof Values) => () =>
    setTouched((t) => ({ ...t, [field]: true }))

  const matchState: 'idle' | 'matching' | 'match' | 'mismatch' =
    values.confirm === '' ? 'idle'
      : values.confirm === values.password ? 'match' : 'mismatch'

  const copyId = async () => {
    if (!createdId) return
    try {
      await navigator.clipboard.writeText(createdId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable */ }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setBanner(null)
    if (FIELDS.some((f) => validate(f, values))) return

    setLoading(true)
    try {
      const data = await api.register({
        full_name: values.full_name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim() || undefined,
        designation: values.designation.trim() || undefined,
        unit_id: values.unit_id ? Number(values.unit_id) : null,
        password: values.password,
      })
      setCreatedId(data.user.personnel_id)
      setCreatedPassword(values.password)
      setValues(EMPTY)
      setTouched({})
      setSubmitted(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      setBanner(msg && !msg.startsWith('Request failed')
        ? msg : 'Unable to create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const continueToDashboard = async () => {
    if (!createdId) return
    setLoading(true)
    try {
      await signIn(createdId, createdPassword)
      navigate('/app')
    } catch {
      navigate('/login')
    } finally {
      setLoading(false)
    }
  }

  /* ================= success state ================= */
  if (createdId) {
    const burst = Array.from({ length: 14 }, (_, i) => {
      const a = (i / 14) * Math.PI * 2
      return { x: Math.cos(a) * 74, y: Math.sin(a) * 74 }
    })
    return (
      <AuthLayout footer={<><ShieldCheck size={12} /> Staff accounts are provisioned by administrators</>}>
        <div className="glass relative overflow-hidden rounded-3xl border-glow p-8 text-center ring-1 ring-linestrong card-elevate">
          <div className="relative mx-auto h-20 w-20">
            {burst.map((p, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                animate={{ opacity: 0, x: p.x, y: p.y, scale: 0.4 }}
                transition={{ duration: 0.9, delay: 0.35, ease: 'easeOut' }}
                className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-sky-400"
                aria-hidden
              />
            ))}
            <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
              <circle cx="32" cy="32" r="29" fill="rgba(52,211,153,0.08)"
                      stroke="rgba(52,211,153,0.4)" strokeWidth="2" />
              <motion.path
                d="M19 33.5 28 42l17-19"
                fill="none" stroke="#34D399" strokeWidth="4"
                strokeLinecap="round" strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, delay: 0.25, ease: 'easeOut' }}
              />
            </svg>
          </div>

          <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                     className="mt-4 text-xl font-bold tracking-tight text-slate-50">
            Account created
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                    className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-slate-400">
            Welcome aboard. Save your unique Personnel ID now — you&apos;ll need it for every future sign-in.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.75, type: 'spring', stiffness: 220, damping: 22 }}
            className="mt-7 rounded-2xl bg-navy-700/70 px-5 py-5 ring-1 ring-line"
          >
            <p className="flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              <IdCard size={12} /> Your Personnel ID
            </p>
            <div className="mt-3 flex items-center justify-center gap-3">
              <code className="text-[26px] font-bold leading-none tracking-[0.12em] text-sky-300">
                {createdId}
              </code>
              <button
                type="button"
                onClick={copyId}
                aria-label={copied ? 'Copied' : 'Copy Personnel ID'}
                title={copied ? 'Copied!' : 'Copy'}
                className="rounded-lg p-2 text-slate-400 ring-1 ring-line transition-all hover:bg-hoverc hover:text-sky-300"
              >
                {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
              </button>
            </div>
            {copied && (
              <p className="mt-2 text-[10px] font-medium uppercase tracking-widest text-emerald-300">
                Copied to clipboard
              </p>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.95 }}>
            <GradientButton type="button" loading={loading} onClick={continueToDashboard}>
              Continue to Dashboard
              <ArrowRight size={16}
                          className="transition-transform duration-300 group-hover:translate-x-1" />
            </GradientButton>
          </motion.div>
        </div>
      </AuthLayout>
    )
  }

  /* ================= form state ================= */
  return (
    <AuthLayout footer={<><ShieldCheck size={12} /> Staff accounts are provisioned by administrators</>}>
      <form
        onSubmit={submit}
        noValidate
        className="glass relative rounded-3xl border-glow p-6 ring-1 ring-linestrong card-elevate sm:p-8"
      >
        {banner && <ErrorBanner message={banner} onDismiss={() => setBanner(null)} />}

        <motion.div variants={stagger} initial="hidden" animate="show">
          <motion.div variants={item}>
            <h1 className="text-xl font-bold tracking-tight text-slate-50">Create your account</h1>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              For new personnel only. Your Personnel ID is assigned automatically.
            </p>
          </motion.div>

          <fieldset disabled={loading} className="min-w-0">
            <FormGrid className="mt-6">
              <motion.div variants={item} className="sm:col-span-2">
                <FormField label="Full name" value={values.full_name} onChange={setField('full_name')}
                           onBlur={blurField('full_name')} placeholder="e.g. Priya Sharma"
                           autoComplete="name" required icon={User} error={errorFor('full_name')} />
              </motion.div>
              <motion.div variants={item}>
                <FormField label="Email" type="email" value={values.email} onChange={setField('email')}
                           onBlur={blurField('email')} placeholder="you@example.com"
                           autoComplete="email" required icon={Mail} error={errorFor('email')} />
              </motion.div>
              <motion.div variants={item}>
                <FormField label="Phone (optional)" type="tel" value={values.phone}
                           onChange={setField('phone')} onBlur={blurField('phone')}
                           placeholder="+91 …" autoComplete="tel" icon={Phone}
                           error={errorFor('phone')} />
              </motion.div>
              <motion.div variants={item}>
                <UnitDropdown label="Duty unit" value={values.unit_id}
                              onChange={setField('unit_id')} error={errorFor('unit_id')}
                              options={[{ value: '', label: 'Select unit…' },
                                        ...units.map((u) => ({ value: String(u.id), label: u.name }))]}
                              disabled={loading} />
              </motion.div>
              <motion.div variants={item}>
                <FormField label="Designation (optional)" value={values.designation}
                           onChange={setField('designation')} placeholder="e.g. Patrol Officer"
                           icon={BadgeCheck} />
              </motion.div>
              <motion.div variants={item}>
                <PasswordField label="Password" value={values.password} onChange={setField('password')}
                               onBlur={blurField('password')} meter icon={Lock}
                               error={errorFor('password')} />
              </motion.div>
              <motion.div variants={item}>
                <PasswordField label="Confirm password" value={values.confirm}
                               onChange={setField('confirm')} onBlur={blurField('confirm')}
                               icon={Lock} matchState={matchState} error={errorFor('confirm')} />
              </motion.div>
            </FormGrid>

            {/* Personnel ID info card */}
            <motion.div variants={item}
                        className="mt-5 flex items-start gap-3 rounded-xl bg-navy-700/60 px-4 py-3 ring-1 ring-line">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30">
                <IdCard size={14} />
              </span>
              <p className="text-[11px] leading-relaxed text-slate-400">
                <span className="font-semibold text-slate-200">Personnel ID assigned automatically.</span>{' '}
                After registration you&apos;ll receive a unique ID (e.g. <code className="text-sky-300">CPF-1503</code>)
                — keep it safe, it&apos;s your sign-in identity.
              </p>
            </motion.div>

            <motion.div variants={item} className="mt-6">
              <GradientButton loading={loading}>
                {loading ? 'Creating account…' : 'Create Account'}
                {!loading && (
                  <ArrowRight size={16}
                              className="transition-transform duration-300 group-hover:translate-x-1.5" />
                )}
              </GradientButton>
            </motion.div>
          </fieldset>

          <motion.p variants={item}
                    className="mt-5 border-t border-line pt-4 text-center text-xs text-slate-400">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-sky-300 transition-colors hover:text-sky-200">
              Sign in
            </Link>
          </motion.p>
        </motion.div>
      </form>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-600 sm:hidden">
        <Lock size={12} /> Your ID is assigned automatically
      </p>
    </AuthLayout>
  )
}
