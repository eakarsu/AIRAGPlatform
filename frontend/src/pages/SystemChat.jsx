import NativeAIReport, { reportValue } from '../components/NativeAIReport'
import NativeAIControls from '../components/NativeAIControls';
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { HiArrowRight, HiCog, HiDatabase, HiPaperAirplane, HiSparkles } from 'react-icons/hi'
import { getSystemChatCapabilities, sendSystemChatMessage } from '../api/client'
import AIResultReport from '../components/AIResultReport'

const quickPrompts = [
  'Show connector status',
  'Search documents for retention policy',
  'List knowledge chunks',
  'Create prompt Risk Review: Identify material risks and recommended mitigations',
  'Favorite document 1',
  'List chat sessions',
  'List retrieval rules',
  'Run sync check for Legal SharePoint Library',
  'Run citation validation for unsupported claims',
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

function DataPreview({ data }) {
  return data === null || data === undefined ? null : <NativeAIReport response={data} title="System chat results" />
}

function MessageCard({ message, onPrompt }) {
  const navigate = useNavigate()
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[88%] rounded-2xl p-4 shadow-sm ${isUser ? 'bg-indigo-600 text-white' : 'border border-gray-200 bg-gray-50 text-gray-900'}`}>
        <div className="whitespace-pre-wrap text-sm leading-relaxed">{!isUser && typeof reportValue(message.content) === 'object' ? <NativeAIReport response={message.content} title="System chat answer" /> : message.content}</div>
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
      content: 'Ask me to operate the app. I can manage documents, knowledge chunks, summaries, tags, prompts, favorites, workspaces, users, chat sessions, retrieval rules, Platform Ops actions, AI Hub analyses, analytics, activity, and navigation.',
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
            onClick={() => setInput(prompt)}
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <MessageCard key={message.id} message={message} onPrompt={suggestion => setInput(suggestion)} />
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

      <NativeAIControls busy={sending} context="System chat request"><div className="mt-4 flex gap-3">
        <textarea
          data-ai-field="message" value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          placeholder="Example: create chunk for document 1: policy text, create prompt Risk Review: identify risks, favorite document 1..."
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
      </NativeAIControls>
    </div>
  )
}
