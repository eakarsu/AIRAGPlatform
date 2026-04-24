import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getChatSession, getChatMessages, sendMessage } from '../api/client'
import toast from 'react-hot-toast'
import { HiArrowLeft, HiPaperAirplane } from 'react-icons/hi'
import MessageBubble from '../components/MessageBubble'

export default function ChatSession() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    Promise.all([
      getChatSession(id),
      getChatMessages(id),
    ]).then(([sessionRes, messagesRes]) => {
      setSession(sessionRes.data)
      setMessages(messagesRes.data)
    }).catch(() => {
      toast.error('Session not found')
      navigate('/chat')
    })
  }, [id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || sending) return
    const msg = input.trim()
    setInput('')
    setSending(true)

    // Add optimistic user message
    const tempUserMsg = {
      id: Date.now(),
      role: 'user',
      content: msg,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempUserMsg])

    try {
      const res = await sendMessage({ message: msg, session_id: parseInt(id) })
      // Replace temp message and add assistant response
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== tempUserMsg.id)
        return [...filtered, { ...tempUserMsg, id: res.data.message.id - 1 }, res.data.message]
      })
    } catch (err) {
      toast.error('Failed to send message')
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id))
      setInput(msg)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="animate-fade-in flex flex-col h-[calc(100vh-3rem)]">
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-gray-200 flex-shrink-0">
        <button onClick={() => navigate('/chat')} className="p-2 hover:bg-gray-100 rounded-lg">
          <HiArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{session?.title || 'Chat'}</h1>
          <p className="text-xs text-gray-500">{messages.length} messages</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.length === 0 && !sending && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🤖</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Start a conversation</h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              Ask questions about your uploaded documents. The AI will use relevant context to provide accurate answers.
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {sending && (
          <div className="flex items-start gap-3 animate-fade-in">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              AI
            </div>
            <div className="bg-white rounded-2xl rounded-tl-sm p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-purple-400 rounded-full typing-dot"></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full typing-dot"></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full typing-dot"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 pt-4 border-t border-gray-200">
        <div className="flex gap-3">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask a question about your documents..."
            className="input-field flex-1"
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="btn-primary px-4"
          >
            <HiPaperAirplane className="w-5 h-5 rotate-90" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          AI responses are generated using your document knowledge base via OpenRouter
        </p>
      </div>
    </div>
  )
}
