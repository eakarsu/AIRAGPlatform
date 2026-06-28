import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { HiArrowRight, HiChatAlt2, HiPaperAirplane, HiSparkles, HiX } from 'react-icons/hi'
import { sendSystemChatMessage } from '../api/client'

const quickPrompts = [
  'Show connector status',
  'Run sync check for Legal SharePoint Library',
  'Search documents for retention policy',
  'Show cost analytics',
]

function titleize(key) {
  return String(key || '')
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2)
  if (typeof value === 'string' && value.includes('T') && !Number.isNaN(Date.parse(value))) return new Date(value).toLocaleString()
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function CompactData({ data }) {
  if (!data) return null
  const rows = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : null
  if (rows) {
    return (
      <div className="mt-3 rounded-lg border border-gray-200 bg-white">
        <p className="border-b border-gray-100 px-3 py-2 text-xs font-semibold text-gray-500">{rows.length} records</p>
        <div className="max-h-36 overflow-auto p-2">
          {rows.slice(0, 5).map((row, index) => (
            <div key={row.id || index} className="rounded-md bg-gray-50 p-2 text-xs text-gray-700">
              <span className="font-semibold">{row.name || row.title || row.tenant || row.query_id || row.answer_id || `Record ${row.id || index + 1}`}</span>
              {row.status && <span className="ml-2 text-gray-500">{row.status}</span>}
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (typeof data === 'object') {
    return (
      <div className="mt-3 grid gap-2">
        {Object.entries(data).slice(0, 5).map(([key, value]) => (
          <div key={key} className="rounded-md bg-white p-2 text-xs">
            <span className="font-semibold text-gray-500">{titleize(key)}: </span>
            <span className="text-gray-800">{formatValue(value)}</span>
          </div>
        ))}
      </div>
    )
  }
  return <p className="mt-2 text-xs text-gray-600">{formatValue(data)}</p>
}

export default function SystemChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: 'Tell me what to do in the app. I can call document, AI Hub, Platform Ops, analytics, tag, user, workspace, and navigation APIs.',
      action: 'ready',
    },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const send = async (override) => {
    const text = (override || input).trim()
    if (!text || sending) return
    setOpen(true)
    setInput('')
    setSending(true)
    const userMessage = { id: Date.now(), role: 'user', content: text }
    setMessages((current) => [...current, userMessage])

    try {
      const res = await sendSystemChatMessage(text, { route: window.location.pathname, surface: 'floating-widget' })
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: res.data.reply,
          action: res.data.action,
          route: res.data.route,
          data: res.data.data,
        },
      ])
    } catch (error) {
      toast.error(error.response?.data?.detail || 'System chat failed')
      setMessages((current) => [...current, { id: Date.now() + 1, role: 'assistant', content: 'I could not complete that request.', action: 'error' }])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 flex h-[620px] w-[420px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-900 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <HiSparkles className="h-5 w-5 text-indigo-300" />
              <div>
                <h2 className="text-sm font-bold">System Chat</h2>
                <p className="text-xs text-gray-300">Controls the app through API actions</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-gray-300 hover:bg-white/10 hover:text-white">
              <HiX className="h-5 w-5" />
            </button>
          </div>

          <div className="border-b border-gray-100 bg-gray-50 p-3">
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => send(prompt)}
                  className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-white p-3">
            {messages.map((message) => {
              const isUser = message.role === 'user'
              return (
                <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] rounded-2xl p-3 text-sm ${isUser ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    {!isUser && message.action && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-indigo-700">{titleize(message.action)}</span>
                        {message.route && (
                          <button
                            onClick={() => navigate(message.route)}
                            className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-semibold text-white"
                          >
                            Open
                            <HiArrowRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    )}
                    {!isUser && <CompactData data={message.data} />}
                  </div>
                </div>
              )
            })}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-gray-100 p-3 text-sm text-gray-500">Calling app APIs...</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-gray-200 bg-gray-50 p-3">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
                placeholder="Ask me to run an app action..."
                className="min-h-[46px] flex-1 resize-none rounded-xl border border-gray-200 bg-white p-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                disabled={sending}
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || sending}
                className="rounded-xl bg-indigo-600 px-3 text-white hover:bg-indigo-700 disabled:bg-gray-300"
              >
                <HiPaperAirplane className="h-5 w-5 rotate-90" />
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((current) => !current)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xl transition hover:bg-indigo-700"
        aria-label="Open system chat"
      >
        {open ? <HiX className="h-6 w-6" /> : <HiChatAlt2 className="h-7 w-7" />}
      </button>
    </div>
  )
}
