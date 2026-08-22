import { useCallback, useEffect, useRef, useState } from 'react'

type Status = 'idle' | 'loading' | 'success' | 'error'

export function useAsync<T>(fn: () => Promise<T>, immediate = true, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [status, setStatus] = useState<Status>(immediate ? 'loading' : 'idle')
  const [error, setError] = useState<string | null>(null)
  const fnRef = useRef(fn)
  fnRef.current = fn

  const run = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const result = await fnRef.current()
      setData(result)
      setStatus('success')
      return result
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setStatus('error')
      return null
    }
  }, [])

  useEffect(() => {
    if (immediate) void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, status, error, reload: run, setData }
}
