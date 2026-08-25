const TOKEN_KEY = 'carepulse_token'
const USER_KEY = 'carepulse_user'

export class ApiError extends Error {
  status: number
  code?: string
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },
}

export const userStore = {
  get: <T>(): T | null => {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as T) : null
  },
  set: (u: unknown) => localStorage.setItem(USER_KEY, JSON.stringify(u)),
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = tokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('Cannot reach the server. Please check your connection.', 0)
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    let code: string | undefined
    try {
      const data = await res.json()
      if (typeof data.detail === 'string') {
        detail = data.detail
      } else if (data.detail && typeof data.detail === 'object' && !Array.isArray(data.detail)
                 && data.detail.message) {
        detail = String(data.detail.message)
        code = data.detail.code ? String(data.detail.code) : undefined
      } else if (Array.isArray(data.detail)) {
        const first = data.detail[0]
        const field = Array.isArray(first.loc) ? first.loc.filter((p: unknown) => p !== 'body').join('.') : ''
        detail = first.msg ? `${field ? field + ': ' : ''}${first.msg}` : detail
      }
    } catch { /* keep default */ }
    if (res.status === 401 && !path.startsWith('/auth/login')) {
      tokenStore.clear()
      window.dispatchEvent(new CustomEvent('carepulse:unauthorized'))
    }
    throw new ApiError(detail, res.status, code)
  }
  return res.json() as Promise<T>
}

export const get = <T>(path: string) => request<T>('GET', path)
export const post = <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {})
export const put = <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {})
