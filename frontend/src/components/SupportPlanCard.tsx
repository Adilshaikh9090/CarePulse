import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BellPlus, CalendarClock, CheckCircle2, ChevronRight, CircleDashed,
  HeartHandshake, LifeBuoy,
} from 'lucide-react'
import type { FollowUp, RecommendationItem } from '../types'
import { recommendAction, scheduleReminder } from '../services'
import { fmtDate } from '../utils/format'
import { Button, Card, Modal } from './ui'

const TIER_META = {
  high: { label: 'High Priority', dot: 'bg-rose-400', chip: 'bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/25' },
  recommended: { label: 'Recommended', dot: 'bg-amber-400', chip: 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/25' },
  optional: { label: 'Optional', dot: 'bg-sky-400', chip: 'bg-sky-500/10 text-sky-300 ring-1 ring-sky-500/25' },
} as const

const TIER_RANK = { high: 0, recommended: 1, optional: 2 }

function isSnoozed(item: RecommendationItem) {
  return !!item.snoozed_until && new Date(item.snoozed_until) > new Date()
}

export default function SupportPlanCard({ items, onChanged, followUp }: {
  items: RecommendationItem[]
  onChanged: () => void
  followUp?: FollowUp
}) {
  const [busyId, setBusyId] = useState<number | null>(null)
  const [supportItem, setSupportItem] = useState<RecommendationItem | null>(null)
  const [reminderBusy, setReminderBusy] = useState(false)
  const [reminderDone, setReminderDone] = useState<string | null>(null)

  const sorted = [...items].sort((a, b) =>
    (TIER_RANK[a.tier ?? 'optional'] - TIER_RANK[b.tier ?? 'optional']) || (a.priority - b.priority))

  const act = async (id: number, action: 'completed' | 'remind_later') => {
    setBusyId(id)
    try {
      await recommendAction(id, action)
      onChanged()
    } finally {
      setBusyId(null)
    }
  }

  const onScheduleReminder = async () => {
    setReminderBusy(true)
    try {
      const res = await scheduleReminder()
      setReminderDone(res.next_check_in)
      onChanged()
    } finally {
      setReminderBusy(false)
    }
  }

  const reminderSet = followUp?.reminder_set || !!reminderDone
  const reminderDate = reminderDone ?? followUp?.next_recommended

  return (
    <Card
      title="Your welfare support plan"
      subtitle="Personalized, voluntary next steps based on your contributing factors"
      action={<HeartHandshake size={16} className="text-sky-400/80" />}
    >
      <ul className="space-y-3">
        <AnimatePresence initial={false}>
          {sorted.map((r, i) => {
            const meta = TIER_META[r.tier ?? 'optional']
            const snoozed = isSnoozed(r)
            const done = r.status === 'completed' || r.status === 'accepted'
            return (
              <motion.li
                key={r.id}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.4, delay: Math.min(i * 0.06, 0.3), ease: [0.22, 1, 0.36, 1] }}
                className={`rounded-xl bg-subtle p-4 ring-1 ring-line transition-opacity ${done ? 'opacity-70' : ''}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.chip}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </span>
                  {r.category && (
                    <span className="text-[11px] uppercase tracking-wide text-slate-500">{r.category}</span>
                  )}
                  {done && (
                    <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                      <CheckCircle2 size={13} /> Done
                    </span>
                  )}
                  {!done && snoozed && (
                    <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                      <BellPlus size={13} /> Reminder set · {fmtDate(r.snoozed_until!)}
                    </span>
                  )}
                </div>

                <h4 className="mt-2 text-sm font-semibold leading-snug text-slate-100">{r.title}</h4>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{r.reason}</p>

                {(r.actions?.length ?? 0) > 0 && !done && (
                  <ul className="mt-2.5 space-y-1.5">
                    {r.actions!.map((a) => (
                      <li key={a} className="flex items-start gap-2 text-xs text-slate-300">
                        <CircleDashed size={13} className="mt-0.5 shrink-0 text-sky-400/70" />
                        {a}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {!done && (
                    <>
                      <Button size="sm" loading={busyId === r.id} onClick={() => act(r.id, 'completed')}>
                        <CheckCircle2 size={13} /> Mark as Done
                      </Button>
                      {!snoozed && (
                        <Button size="sm" variant="ghost" disabled={busyId === r.id}
                                onClick={() => act(r.id, 'remind_later')}>
                          <BellPlus size={13} /> Remind Me Later
                        </Button>
                      )}
                    </>
                  )}
                  {r.support_text && (
                    <Button size="sm" variant="ghost" onClick={() => setSupportItem(r)}>
                      <LifeBuoy size={13} /> View Support <ChevronRight size={12} />
                    </Button>
                  )}
                  <span className="ml-auto text-[11px] text-slate-500">{r.timeframe}</span>
                </div>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>

      {/* follow-up strip */}
      {followUp && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-gradient-to-r from-sky-500/10 to-transparent p-4 ring-1 ring-line">
          <CalendarClock size={18} className="shrink-0 text-sky-400" />
          <div className="min-w-[180px] flex-1">
            <p className="text-sm font-semibold text-slate-100">
              Next check-in recommended: {followUp.cadence_days} days
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              Around {fmtDate(followUp.next_recommended)}
              {followUp.last_checkin ? ` · last one ${fmtDate(followUp.last_checkin)}` : ''}
              {' '}· takes under two minutes
            </p>
          </div>
          {reminderSet ? (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/25">
              <CheckCircle2 size={13} /> Reminder scheduled{reminderDate ? ` · ${fmtDate(reminderDate)}` : ''}
            </span>
          ) : (
            <Button size="sm" loading={reminderBusy} onClick={onScheduleReminder}>
              <BellPlus size={13} /> Schedule Reminder
            </Button>
          )}
        </div>
      )}

      {/* supportive resources modal */}
      <Modal open={!!supportItem} onClose={() => setSupportItem(null)}
             title={supportItem ? `${supportItem.title} — support` : 'Support'}>
        <p className="mb-3 rounded-lg bg-sky-500/10 px-3 py-2 text-xs leading-relaxed text-sky-200/90 ring-1 ring-sky-500/20">
          Support is always voluntary and confidential — choosing help never affects your record.
        </p>
        <ul className="space-y-2.5">
          {supportItem?.support_text?.split('\n').filter(Boolean).map((line) => (
            <li key={line} className="flex items-start gap-2 text-sm leading-relaxed text-slate-300">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-400/80" />
              {line}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-end">
          <Button size="sm" variant="ghost" onClick={() => setSupportItem(null)}>Close</Button>
        </div>
      </Modal>
    </Card>
  )
}
