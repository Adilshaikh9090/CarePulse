import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, IdCard, KeyRound, Lock, ShieldCheck, User, X } from 'lucide-react'
import { ApiError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import * as api from '../services'
import { FormField, GradientButton, PasswordField } from '../components/form'
import AuthLayout from '../components/layout/AuthLayout'

const DEMOS = [
  { id: 'CPF-1501', role: 'Personnel — Demo soldier' },
  { id: 'WELFARE-01', role: 'Welfare Officer — Meera Krishnan' },
  { id: 'CMDR-01', role: 'Commander — Col. R. Iyer' },
  { id: 'ADMIN-01', role: 'Administrator — Vikram Desai' },
]

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
}
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
} as const

export default function Login() {
  const { signIn, loading, error } = useAuth()
  const navigate = useNavigate()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [otpStep, setOtpStep] = useState(false)
  const [otp, setOtp] = useState('')
  const [showForgot, setShowForgot] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const user = await signIn(loginId.trim(), password, otpStep ? otp : undefined)
      navigate(user.role === 'personnel' ? '/app'
        : user.role === 'commander' ? '/admin/command' : '/admin')
    } catch (err) {
      if (err instanceof ApiError && err.code === '2fa_required') {
        setOtpStep(true)
      }
      /* other errors shown inline */
    }
  }

  return (
    <AuthLayout footer={<><ShieldCheck size={12} /> JWT session · role-based access · full audit trail</>}>
      <form onSubmit={submit}
            className="glass relative rounded-3xl border-glow p-6 ring-1 ring-linestrong card-elevate sm:p-8">
        <motion.div variants={stagger} initial="hidden" animate="show">
          <motion.div variants={item}>
            <h1 className="text-xl font-bold tracking-tight text-slate-50">Secure sign-in</h1>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              Access your confidential welfare workspace.
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {otpStep && (
              <motion.div key="otp" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 overflow-hidden rounded-xl bg-subtle p-3 ring-1 ring-line">
                <p className="flex items-center gap-2 text-xs font-medium text-sky-300">
                  <KeyRound size={13} /> Two-factor code required
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                  Enter the 6-digit code from your authenticator app.
                  <span className="ml-1 rounded bg-hoverc px-1.5 py-0.5 font-mono text-[10px] text-emerald-300">
                    demo code: 123456
                  </span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <fieldset disabled={loading} className="min-w-0">
            <div className="mt-6 space-y-4">
              {!otpStep && (
                <motion.div variants={item}>
                  <FormField label="Personnel ID or Email" value={loginId}
                             onChange={(v) => setLoginId(v)} placeholder="e.g. CPF-1001 or you@example.com"
                             autoComplete="username" required minLength={3} icon={User} />
                </motion.div>
              )}
              {!otpStep ? (
                <motion.div variants={item}>
                  <PasswordField label="Password" value={password} onChange={setPassword}
                                 autoComplete="current-password" required minLength={6} icon={Lock} />
                </motion.div>
              ) : (
                <motion.div variants={item}>
                  <FormField label="Authentication code" value={otp} onChange={(v) => setOtp(v)}
                             placeholder="123456" required minLength={4} maxLength={8} icon={KeyRound} />
                </motion.div>
              )}
            </div>

            {error && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                        role="alert"
                        className="mt-4 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-200 ring-1 ring-rose-500/30">
                {error}
              </motion.p>
            )}

            <motion.div variants={item} className="mt-6">
              <GradientButton loading={loading}>
                {otpStep ? 'Verify & sign in' : 'Sign in securely'}
                {!loading ? (
                  <ArrowRight size={16}
                              className="transition-transform duration-300 group-hover:translate-x-1.5" />
                ) : null}
              </GradientButton>
            </motion.div>

            {!otpStep && (
              <motion.p variants={item} className="mt-3 text-center">
                <button type="button" onClick={() => setShowForgot(true)}
                        className="text-xs font-medium text-sky-300 transition-colors hover:text-sky-200">
                  Forgot password?
                </button>
              </motion.p>
            )}
          </fieldset>

          {!otpStep && (
            <motion.div variants={item}
                        className="mt-5 border-t border-line pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Demo accounts · password demo1234
              </p>
              <div className="mt-2 space-y-1.5">
                {DEMOS.map((d) => (
                  <button key={d.id} type="button"
                          onClick={() => { setLoginId(d.id); setPassword('demo1234') }}
                          className="flex w-full items-center justify-between rounded-lg bg-subtle px-3 py-2 text-left ring-1 ring-line transition-all hover:bg-hoverc hover:ring-linestrong">
                    <span className="flex items-center gap-2 text-xs font-medium text-slate-300">
                      <IdCard size={13} className="text-slate-500" /> {d.role}
                    </span>
                    <code className="text-[11px] text-sky-300">{d.id}</code>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {!otpStep && (
            <motion.p variants={item}
                      className="mt-4 text-center text-xs text-slate-400">
              New personnel?{' '}
              <Link to="/signup" className="font-semibold text-sky-300 transition-colors hover:text-sky-200">
                Create an account
              </Link>
            </motion.p>
          )}
        </motion.div>
      </form>

      <ForgotPasswordModal open={showForgot} onClose={() => setShowForgot(false)} />
    </AuthLayout>
  )
}

function ForgotPasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<'id' | 'reset'>('id')
  const [loginId, setLoginId] = useState('')
  const [token, setToken] = useState('')
  const [newPw, setNewPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const requestCode = async () => {
    setBusy(true); setErr(null); setMsg(null)
    try {
      const r = await api.forgotPassword(loginId.trim())
      if (r.reset_token) {
        setToken(r.reset_token)
        setMsg('Identity verified — choose a new password below.')
      } else {
        setMsg(r.message || 'Reset instructions sent.')
      }
      setStep('reset')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Request failed.')
    } finally { setBusy(false) }
  }

  const doReset = async () => {
    setBusy(true); setErr(null)
    try {
      const r = await api.resetPassword(token.trim(), newPw)
      setMsg(r.message)
      setTimeout(onClose, 1200)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Reset failed.')
    } finally { setBusy(false) }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                    onClick={onClose}>
          <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
                      onClick={(e) => e.stopPropagation()}
                      className="glass w-full max-w-md rounded-2xl p-6 ring-1 ring-linestrong card-elevate">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-50">
                  <KeyRound size={16} className="text-sky-300" /> Reset your password
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Verify your Personnel ID to continue. Reset links expire in 30 minutes.
                </p>
              </div>
              <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-hoverc hover:text-slate-200">
                <X size={16} />
              </button>
            </div>

            {msg && (
              <p className="mt-4 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 ring-1 ring-emerald-500/30">
                {msg}
              </p>
            )}
            {err && (
              <p className="mt-4 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-200 ring-1 ring-rose-500/30">
                {err}
              </p>
            )}

            {step === 'id' ? (
              <div className="mt-4 space-y-3">
                <FormField label="Personnel / Officer ID" value={loginId} onChange={setLoginId}
                           placeholder="e.g. CPF-1501" icon={User} />
                <GradientButton loading={busy} onClick={() => { if (loginId.trim().length >= 3) requestCode() }}>
                  Send reset link
                </GradientButton>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <FormField label="Reset token" value={token} onChange={setToken} icon={ShieldCheck} />
                <PasswordField label="New password (min 8 chars)" value={newPw} onChange={setNewPw} minLength={8} />
                <GradientButton loading={busy}
                                onClick={() => { if (newPw.length >= 8) doReset() }}>
                  Update password
                </GradientButton>
              </div>
            )}

            <p className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-slate-500">
              Your welfare information stays confidential. Password resets are recorded in the
              access log for your protection.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
