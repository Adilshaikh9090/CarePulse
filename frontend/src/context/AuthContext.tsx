import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import * as api from '../services'
import { tokenStore, userStore } from '../api/client'
import type { Role, User } from '../types'

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
  signIn: (loginId: string, password: string, otp?: string) => Promise<User>
  signOut: () => void
  homeFor: (role: Role) => string
}

const AuthContext = createContext<AuthState | null>(null)

const ROLE_HOME: Record<Role, string> = {
  personnel: '/app',
  welfare_officer: '/admin',
  commander: '/admin/command',
  administrator: '/admin',
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() =>
    userFromStorage())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signIn = useCallback(async (loginId: string, password: string, otp?: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.login(loginId.trim(), password, otp)
      tokenStore.set(data.access_token)
      userStore.set(data.user)
      setUser(data.user)
      return data.user
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sign-in failed.'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(() => {
    tokenStore.clear()
    setUser(null)
  }, [])

  useEffect(() => {
    const onExpired = () => setUser(null)
    window.addEventListener('carepulse:unauthorized', onExpired)
    return () => window.removeEventListener('carepulse:unauthorized', onExpired)
  }, [])

  const value = useMemo(
    () => ({ user, loading, error, signIn, signOut, homeFor: (r: Role) => ROLE_HOME[r] ?? '/login' }),
    [user, loading, error, signIn, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function userFromStorage(): User | null {
  try {
    return userStore.get<User>()
  } catch {
    return null
  }
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}


