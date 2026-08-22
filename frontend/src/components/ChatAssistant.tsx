import { useEffect, useRef, useState } from 'react'
import { Bot, MessageCircle, Send, X } from 'lucide-react'
import * as api from '../services'

interface Msg { role: 'user' | 'assistant'; content: string }

const QUICK_PROMPTS = [
  'How is my risk indicator calculated?',
  'Tips to improve sleep quality',
  'How do I manage workload stress?',
  'Is my data confidential?',
]

export default function ChatAssistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: "Hello! I'm your welfare assistant. Ask me about sleep, stress, workload, breaks, or how predictions work." },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open])

  const send = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || busy) return
    const next = [...messages, { role: 'user' as const, content }]
    setMessages(next)
    setInput('')
    setBusy(true)
    try {
      const res = await api.chatWithAssistant(next.slice(-12))
      setMessages((m) => [...m, { role: 'assistant', content: res.reply }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Sorry — I could not reach the service just now. Please try again.' }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Welfare assistant chat"
        className="fixed bottom-5 right-5 z-40 flex h-13 w-13 items-center justify-center rounded-full bg-sky-500 p-3.5 text-navy-950 shadow-lg shadow-sky-500/30 transition hover:bg-sky-400"
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-40 flex h-[440px] w-[min(92vw,360px)] flex-col overflow-hidden rounded-2xl bg-navy-800 shadow-2xl ring-1 ring-white/10">
          <header className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300"><Bot size={15} /></span>
            <div>
              <p className="text-xs font-semibold text-slate-100">Welfare Assistant</p>
              <p className="text-[10px] text-slate-500">Guidance only · not medical advice</p>
            </div>
          </header>

          <div ref={listRef} className="flex-1 space-y-2.5 overflow-y-auto p-3.5">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <p className={`max-w-[82%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-sky-500 text-navy-950 font-medium'
                    : 'bg-white/[0.05] text-slate-300 ring-1 ring-white/5'
                }`}>
                  {m.content}
                </p>
              </div>
            ))}
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {QUICK_PROMPTS.map((q) => (
                  <button key={q} onClick={() => send(q)}
                          className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[10px] text-slate-400 ring-1 ring-white/10 hover:text-slate-200">
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          <footer className="flex items-center gap-2 border-t border-white/5 p-2.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ask something…"
              className="min-w-0 flex-1 rounded-lg border-0 bg-navy-700 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <button onClick={() => send()} disabled={busy || !input.trim()}
                    className="rounded-lg bg-sky-500 p-2 text-navy-950 disabled:opacity-40">
              <Send size={14} />
            </button>
          </footer>
        </div>
      )}
    </>
  )
}
