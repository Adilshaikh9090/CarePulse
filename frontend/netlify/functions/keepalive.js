/**
 * Scheduled keepalive: pings the Render backend every 5 minutes so the
 * free-tier instance never spins down. Runs on Netlify's always-on
 * infrastructure (25k+ invocations/month available on the free plan).
 */
const BACKEND = 'https://carepulse-66bx.onrender.com/api/health'

export default async () => {
  try {
    const res = await fetch(BACKEND, { cache: 'no-store' })
    return new Response(JSON.stringify({ ok: res.ok, status: res.status }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const config = {
  schedule: '*/5 * * * *',
}