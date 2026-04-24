import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { HiChevronDown, HiChevronUp, HiClipboard, HiCheck, HiClock, HiChip } from 'react-icons/hi'

export default function MessageBubble({ message }) {
  const [showSources, setShowSources] = useState(false)
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isUser) {
    return (
      <div className="flex items-start gap-3 justify-end animate-fade-in">
        <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-2xl">
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          <p className="text-xs text-indigo-200 mt-1">
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          U
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
        AI
      </div>
      <div className="flex-1 max-w-3xl">
        <div className="bg-white rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 overflow-hidden">
          {/* Content */}
          <div className="px-5 py-4">
            <div className="prose text-sm text-gray-700">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-gray-400">
              {message.model_used && (
                <span className="flex items-center gap-1">
                  <HiChip className="w-3.5 h-3.5" />
                  {message.model_used.split('/').pop()}
                </span>
              )}
              {message.response_time && (
                <span className="flex items-center gap-1">
                  <HiClock className="w-3.5 h-3.5" />
                  {message.response_time}s
                </span>
              )}
              <span>
                {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <button
              onClick={handleCopy}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
            >
              {copied ? <><HiCheck className="w-3.5 h-3.5 text-emerald-500" /> Copied</> : <><HiClipboard className="w-3.5 h-3.5" /> Copy</>}
            </button>
          </div>

          {/* Sources */}
          {message.sources && message.sources.length > 0 && (
            <div className="border-t border-gray-100">
              <button
                onClick={() => setShowSources(!showSources)}
                className="w-full px-5 py-2.5 flex items-center justify-between text-sm text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                <span className="font-medium">Sources ({message.sources.length})</span>
                {showSources ? <HiChevronUp className="w-4 h-4" /> : <HiChevronDown className="w-4 h-4" />}
              </button>
              {showSources && (
                <div className="px-5 pb-4 space-y-2">
                  {message.sources.map((source, i) => (
                    <div key={i} className="bg-indigo-50/50 rounded-lg p-3 border border-indigo-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-indigo-700">
                          {source.document_title}
                        </span>
                        {source.relevance_score > 0 && (
                          <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full">
                            {(source.relevance_score * 100).toFixed(0)}% match
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">{source.chunk_preview}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
