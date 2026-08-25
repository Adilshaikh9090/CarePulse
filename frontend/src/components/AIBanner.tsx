import { Info } from 'lucide-react'
import { DISCLAIMER } from '../types'

export default function AIBanner({ text }: { text?: string }) {
  return (
    <p className="flex items-start gap-2 rounded-xl bg-sky-500/10 px-4 py-3 text-[11px] leading-relaxed text-sky-200 ring-1 ring-sky-500/25">
      <Info size={14} className="mt-0.5 shrink-0" />
      <span>{text || DISCLAIMER}</span>
    </p>
  )
}
