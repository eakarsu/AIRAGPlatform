import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { HiArrowRight, HiCog, HiDatabase, HiPaperAirplane, HiSparkles } from 'react-icons/hi'
import { getSystemChatCapabilities, sendSystemChatMessage } from '../api/client'
import AIResultReport from '../components/AIResultReport'

const quickPrompts = [
  'Show connector status',
  'Search documents for retention policy',
  'Run sync check for Legal SharePoint Library',
  'Run citation validation for unsupported claims',
  'Show cost analytics',
  'Create tag Customer Risk #ef4444',
  'Summarize document 1',
  'Open Platform Ops',
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

function DataPreview({ data }) {
  if (!data) return null
  if (data.summary || data.findings || data.recommendations || data.risks || data.follow_up_questions) {
    return <AIResultReport response={{ title: 'System Chat AI Result', result: data }} />
  }

  const rows = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : null
  if (rows) {
    return (
      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
          Result Records · {rows.length}
        </div>
        <div className="max-h-80 overflow-auto">
          {rows.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No records returned.</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {Object.keys(rows[0]).slice(0, 6).map((key) => (
                    <th key={key} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{titleize(key)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.slice(0, 12).map((row, index) => (
                  <tr key={row.id || index}>
                    {Object.keys(rows[0]).slice(0, 6).map((key) => (
                      <td key={key} className="max-w-[220px] truncate px-3 py-2 text-sm text-gray-700">{formatValue(row[key])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    )
  }

  if (typeof data === 'object') {
    return (
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {Object.entries(data).slice(0, 16).map(([key, value]) => (
          <div key={key} className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{titleize(key)}</p>
            <p className="mt-1 break-words text-sm text-gray-800">{formatValue(value)}</p>
          </div>
        ))}
      </div>
    )
  }

  return <p className="mt-3 text-sm text-gray-600">{formatValue(data)}</p>
}

function MessageCard({ message, onPrompt }) {
  const navigate = useNavigate()
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[88%] rounded-2xl p-4 shadow-sm ${isUser ? 'bg-indigo-600 text-white' : 'border border-gray-200 bg-gray-50 text-gray-900'}`}>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
        {!isUser && message.action && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
              {titleize(message.action)}
            </span>
            {message.route && (
              <button
                type="button"
                onClick={() => navigate(message.route)}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Open {message.route}
                <HiArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
        {!isUser && <DataPreview data={message.data} />}
        {!isUser && message.suggestions?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {message.suggestions.slice(0, 5).map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => onPrompt(suggestion)}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function SystemChat() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: 'Ask me to operate the app. I can list documents, search knowledge, summarize documents, create tags, run Platform Ops actions, run AI Hub analyses, show analytics, open pages, and inspect admin data.',
      action: 'ready',
      suggestions: quickPrompts.slice(0, 5),
    },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [capabilities, setCapabilities] = useState([])
  const bottomRef = useRef(null)

  useEffect(() => {
    getSystemChatCapabilities()
      .then((res) => setCapabilities(res.data.capabilities || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (override) => {
    const text = (override || input).trim()
    if (!text || sending) return
    setInput('')
    setSending(true)
    const userMessage = { id: Date.now(), role: 'user', content: text }
    setMessages((current) => [...current, userMessage])

    try {
      const res = await sendSystemChatMessage(text, { route: window.location.pathname })
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: res.data.reply,
          action: res.data.action,
          route: res.data.route,
          data: res.data.data,
          suggestions: res.data.suggestions,
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
    <div className="flex h-[calc(100vh-3rem)] flex-col animate-fade-in">
      <div className="mb-4 flex flex-col gap-4 border-b border-gray-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">System Chat</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">Control AIRAGPlatform With Wording</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-500">
            Ask for app actions in plain language. The system routes your wording to app APIs and returns the action result.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="card min-w-[130px] p-4 text-center">
            <HiCog className="mx-auto mb-1 h-5 w-5 text-indigo-600" />
            <p className="text-xl font-bold text-gray-900">{capabilities.length || 6}</p>
            <p className="text-xs text-gray-500">Control areas</p>
          </div>
          <div className="card min-w-[130px] p-4 text-center">
            <HiDatabase className="mx-auto mb-1 h-5 w-5 text-emerald-600" />
            <p className="text-xl font-bold text-gray-900">Dynamic</p>
            <p className="text-xs text-gray-500">API routing</p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => send(prompt)}
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <MessageCard key={message.id} message={message} onPrompt={send} />
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <HiSparkles className="h-4 w-4 text-indigo-500" />
                  Calling app APIs...
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          placeholder="Example: run sync check for Legal SharePoint Library, create tag Customer Risk, search documents for retention..."
          className="min-h-[54px] flex-1 resize-none rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
          disabled={sending}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || sending}
          className="rounded-xl bg-indigo-600 px-5 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          <HiPaperAirplane className="h-5 w-5 rotate-90" />
        </button>
      </div>
    </div>
  )
}
