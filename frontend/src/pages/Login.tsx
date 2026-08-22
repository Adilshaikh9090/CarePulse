import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HeartPulse, Lock, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Button, Field, Input } from '../components/ui'

const DEMOS = [
  { id: 'CPF-1001', role: 'Personnel — Aarav Sharma' },
  { id: 'WELFARE-01', role: 'Welfare Officer — Meera Krishnan' },
  { id: 'ADMIN-01', role: 'Administrator — Vikram Desai' },
]

export default function Login() {
  const { signIn, loading, error } = useAuth()
  const navigate = useNavigate()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const user = await signIn(loginId, password)
      navigate(user.role === 'personnel' ? '/app' : '/admin')
    } catch { /* shown inline */ }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4 py-10">
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute -top-32 left-1/2 h-[380px] w-[560px] -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30">
            <HeartPulse size={20} />
          </span>
          <span>
            <p className="text-base font-bold tracking-tight text-slate-50">PersonnelAI</p>
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Predictive Welfare Monitoring</p>
          </span>
        </Link>

        <form onSubmit={submit} className="rounded-2xl bg-navy-800/80 p-6 ring-1 ring-white/10">
          <h1 className="text-lg font-bold text-slate-50">Secure sign-in</h1>
          <p className="mt-1 text-xs text-slate-400">Access your confidential welfare workspace.</p>

          <div className="mt-5 space-y-3.5">
            <Field label="Personnel / Officer ID">
              <Input value={loginId} onChange={(e) => setLoginId(e.target.value)}
                     placeholder="e.g. CPF-1001" autoComplete="username" required minLength={3} />
            </Field>
            <Field label="Password">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                     placeholder="••••••••" autoComplete="current-password" required minLength={6} />
            </Field>
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-200 ring-1 ring-rose-500/30">{error}</p>
          )}

          <Button type="submit" loading={loading} className="mt-5 w-full" size="lg">
            Sign in securely
          </Button>

          <div className="mt-5 border-t border-white/5 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Demo accounts · password demo1234</p>
            <div className="mt-2 space-y-1.5">
              {DEMOS.map((d) => (
                <button key={d.id} type="button"
                        onClick={() => { setLoginId(d.id); setPassword('demo1234') }}
                        className="flex w-full items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 text-left ring-1 ring-white/5 hover:bg-white/[0.07]">
                  <span className="text-xs font-medium text-slate-300">{d.role}</span>
                  <code className="text-[11px] text-sky-300">{d.id}</code>
                </button>
              ))}
            </div>
          </div>
        </form>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-600">
          <ShieldCheck size={12} /> JWT session · role-based access · full audit trail
          <Lock size={12} />
        </p>
      </div>
    </div>
  )
}
