import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronsUpDown, Users } from 'lucide-react'
import { SelectTrigger } from './form'

export interface UnitOption {
  value: string
  label: string
}

/** Custom animated duty-unit dropdown: glass panel, staggered option hover,
 *  selected checkmark, keyboard support (arrows / enter / escape). */
export default function UnitDropdown({ label, value, onChange, options,
                                       error, disabled }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: UnitOption[]
  error?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const idRef = useRef(`unit-${Math.random().toString(36).slice(2, 8)}`)
  const id = idRef.current

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const i = options.findIndex((o) => o.value === value)
        const next = e.key === 'ArrowDown'
          ? Math.min(i + 1, options.length - 1)
          : Math.max(i - 1, 0)
        if (options[next]) onChange(options[next].value)
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, options, value, onChange])

  const current = options.find((o) => o.value === value)

  return (
    <div ref={rootRef} className="relative">
      <SelectTrigger
        id={id}
        label={label}
        open={open}
        onClick={() => setOpen((v) => !v)}
        error={error}
        disabled={disabled}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Users size={15} className={`shrink-0 ${error ? 'text-rose-400' : 'text-slate-500'}`} />
          <span className={`truncate text-sm ${current ? '' : 'text-slate-500'}`}>
            {current ? current.label : 'Select unit…'}
          </span>
        </span>
        <ChevronsUpDown size={14}
                        className={`shrink-0 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </SelectTrigger>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label={label}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="glass absolute z-30 mt-2 w-full overflow-hidden rounded-xl p-1.5 ring-1 ring-linestrong card-elevate"
          >
            {options.map((o, i) => {
              const active = o.value === value
              return (
                <motion.li
                  key={o.value}
                  role="option"
                  aria-selected={active}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.15 }}
                >
                  <button
                    type="button"
                    onClick={() => { onChange(o.value); setOpen(false) }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      active
                        ? 'bg-sky-500/15 font-semibold text-sky-200 ring-1 ring-sky-500/30'
                        : 'text-slate-300 hover:bg-hoverc'
                    }`}
                  >
                    {o.label}
                    {active && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                                   transition={{ type: 'spring', stiffness: 500, damping: 24 }}>
                        <Check size={15} className="text-sky-300" />
                      </motion.span>
                    )}
                  </button>
                </motion.li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
