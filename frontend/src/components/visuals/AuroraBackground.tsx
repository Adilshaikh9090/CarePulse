import { useEffect, useRef } from 'react'
import { useTheme } from '../../hooks/useTheme'

interface P {
  x: number
  y: number
  vx: number
  vy: number
  r: number
}

/** Ambient AI command-center background: drifting particles with data-link
 *  lines, drawn on a low-opacity canvas. Static under prefers-reduced-motion,
 *  paused when the tab is hidden. */
export default function AuroraBackground({ density = 1, radar = false }: {
  density?: number
  radar?: boolean
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [theme] = useTheme()
  const themeRef = useRef(theme)
  themeRef.current = theme

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const g = canvas.getContext('2d')!
    

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let w = 0
    let h = 0
    let dpr = Math.min(window.devicePixelRatio || 1, 2)
    let parts: P[] = []
    let raf = 0
    let running = true

    const palette = () =>
      themeRef.current === 'dark'
        ? { dot: '56,189,248', link: '96,165,250', alpha: 0.55 }
        : { dot: '2,132,199', link: '2,132,199', alpha: 0.28 }

    const seed = () => {
      const target = Math.round(
        Math.min(90, Math.max(24, (w * h) / 26000)) * density)
      parts = Array.from({ length: target }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: 0.8 + Math.random() * 1.6,
      }))
    }

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = canvas.offsetWidth
      h = canvas.offsetHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
      if (reduced) draw() // single static frame
    }

    const LINK = 120

    function draw() {
      const c = palette()
      g.clearRect(0, 0, w, h)

      // links first so dots sit on top
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          const dx = parts[i].x - parts[j].x
          const dy = parts[i].y - parts[j].y
          const d = Math.hypot(dx, dy)
          if (d < LINK) {
            const o = (1 - d / LINK) * c.alpha * 0.35
            g.strokeStyle = `rgba(${c.link},${o})`
            g.lineWidth = 0.7
            g.beginPath()
            g.moveTo(parts[i].x, parts[i].y)
            g.lineTo(parts[j].x, parts[j].y)
            g.stroke()
          }
        }
      }
      for (const p of parts) {
        g.fillStyle = `rgba(${c.dot},${c.alpha})`
        g.beginPath()
        g.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        g.fill()
      }
    }

    function step() {
      if (!running) return
      for (const p of parts) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < -8) p.x = w + 8
        if (p.x > w + 8) p.x = -8
        if (p.y < -8) p.y = h + 8
        if (p.y > h + 8) p.y = -8
      }
      draw()
      raf = requestAnimationFrame(step)
    }

    const onVis = () => {
      running = !document.hidden && !reduced
      if (running) raf = requestAnimationFrame(step)
      else cancelAnimationFrame(raf)
    }

    resize()
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVis)
    if (!reduced) raf = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [density])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* soft radial atmosphere */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(900px 480px at 50% -10%, rgba(56,189,248,0.10), transparent 65%),' +
            'radial-gradient(700px 420px at 100% 100%, rgba(96,165,250,0.07), transparent 60%)',
        }}
      />
      {/* faint grid */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--chart-grid) 1px, transparent 1px),' +
            'linear-gradient(to bottom, var(--chart-grid) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 78%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 78%)',
        }}
      />
      {/* slow radar sweep */}
      {radar && (
        <div className="absolute left-1/2 top-1/2 h-[130vmin] w-[130vmin] -translate-x-1/2 -translate-y-1/2 opacity-[0.05]"
             style={{ animation: 'sweep 26s linear infinite' }}>
          <div className="h-full w-full rounded-full"
               style={{ background: 'conic-gradient(from 0deg, rgba(56,189,248,0.9), transparent 18%)' }} />
        </div>
      )}
      <canvas ref={ref} className="absolute inset-0 h-full w-full" />
    </div>
  )
}
