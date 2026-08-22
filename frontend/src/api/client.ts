const TOKEN_KEY = 'carepulse_token'
const USER_KEY = 'carepulse_user'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
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
    try {
      const data = await res.json()
      detail = typeof data.detail === 'string' ? data.detail : detail
    } catch { /* keep default */ }
    if (res.status === 401 && !path.startsWith('/auth/login')) tokenStore.clear()
    throw new ApiError(detail, res.status)
  }
  return res.json() as Promise<T>
}

export const get = <T>(path: string) => request<T>('GET', path)
export const post = <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {})
export const put = <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {})
