import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { BatteryCharging, CloudCog, ShieldCheck, Wifi } from 'lucide-react'

declare global { interface Window { __CP_API_URL__?: string } }

const RUNTIME_URL = typeof window !== 'undefined' ? window.__CP_API_URL__ : undefined
const API_BASE = RUNTIME_URL || (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_URL || ''
const HEALTH_URL = `${API_BASE}/api/health`
const MAX_ATTEMPTS = 25
const TIMEOUT_MS = 8000
const KEEPALIVE_MS = 4 * 60 * 1000

async function pingHealth(signal?: AbortSignal): Promise<boolean> {
  const timeout = new AbortController()
  const t = setTimeout(() => timeout.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(HEALTH_URL, {
      signal: timeout.signal,
      headers: { 'Cache-Control': 'no-cache' },
      cache: 'no-store',
    })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(t)
  }
}

const STEPS = [
  { icon: CloudCog, label: 'Connecting to secure server…', tip: 'We are waking up the welfare backend.' },
  { icon: Wifi, label: 'Establishing encrypted channel…', tip: 'Verifying the API is reachable.' },
  { icon: ShieldCheck, label: 'Verifying session integrity…', tip: 'Almost ready — logging you in shortly.' },
]

export function useServerAlive(immediate = true) {
  const [count, setCount] = useState(0)
  const alive = count > 0

  useEffect(() => {
    if (!immediate) return
    let stop = false
    const step = () => {
      if (stop) return
      void pingHealth().then((ok) => { if (ok) setCount((c) => c + 1) })
    }
    step()
    const iv = setInterval(step, KEEPALIVE_MS)
    return () => { stop = true; clearInterval(iv) }
  }, [immediate])

  return alive
}

/** Full-screen boot gate: pre-wakes the backend and shows loading progress. */
export default function BootGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [attempt, setAttempt] = useState(1)
  const [checked, setChecked] = useState(false)

  const readyRef = useRef(false)
  const check = useRef<number | null>(null)
  useEffect(() => {
    check.current = window.setInterval(async () => {
      setChecked(true)
      const ok = await pingHealth()
      if (ok && !readyRef.current) {
        readyRef.current = true
        setReady(true)
        if (check.current) clearInterval(check.current)
      } else {
        setAttempt((a) => (a >= MAX_ATTEMPTS ? MAX_ATTEMPTS : a + 1))
      }
    }, 3000)
    return () => { if (check.current) clearInterval(check.current) }
  }, [])

  const stillTrying = attempt < MAX_ATTEMPTS
  const step = STEPS[Math.min(Math.floor((attempt - 1) / 6), STEPS.length - 1)]

  // background keepalive while the app is open — prevents Render free-tier sleep
  const booted = useRef(false)
  useEffect(() => {
    if (!ready || booted.current) return
    booted.current = true
    const iv = setInterval(() => { void pingHealth() }, KEEPALIVE_MS)
    return () => clearInterval(iv)
  }, [ready])

  if (ready) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-center">
      <div className="relative mb-6">
        <div className="pulse-glow absolute -inset-8 rounded-full"
             style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.25), transparent 70%)' }} />
        <motion.img
          src="/logo.png" alt="PersonnelAI" width={76} height={76}
          className="relative rounded-2xl"
          animate={{ scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <h1 className="text-lg font-extrabold tracking-[0.18em] text-slate-50">PERSONNELAI</h1>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500">
        Predictive Welfare Monitoring
      </p>

      <div className="mt-8 flex items-center gap-2 text-sm font-medium text-sky-300">
        <BatteryCharging size={16} className="animate-pulse" />
        {stillTrying ? step.label : 'Server is taking a moment…'}
      </div>
      <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-slate-500">{step.tip}</p>

      <div className="mt-5 h-1.5 w-56 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-300"
             style={{ width: `${Math.min((checked ? attempt : 0) / MAX_ATTEMPTS * 100, 100)}%` }}
        />
      </div>
      <p className="mt-2 font-mono text-[10px] text-slate-600">
        {stillTrying ? `attempt ${attempt} / ${MAX_ATTEMPTS} · auto-retrying` : 'please refresh in a minute'}
      </p>

      <p className="mt-10 max-w-xs text-[11px] leading-relaxed text-slate-600">
        First load on free hosting can take up to a minute while the server wakes up.
        It stays awake automatically while you browse.
      </p>
    </div>
  )
}