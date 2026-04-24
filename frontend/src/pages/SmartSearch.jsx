import { useState } from 'react'
import { smartSearch } from '../api/client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'
import { HiSearch, HiChip, HiClock, HiDocument } from 'react-icons/hi'

export default function SmartSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [selectedResult, setSelectedResult] = useState(null)

  const handleSearch = async () => {
    if (!query.trim()) { toast.error('Enter a search query'); return }
    setSearching(true)
    setResults(null)
    try {
      const res = await smartSearch({ query: query.trim(), top_k: 8 })
      setResults(res.data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Smart Search</h1>
        <p className="text-gray-500 text-sm mt-1">Semantic search across all your documents with AI-powered answers</p>
      </div>

      {/* Search Bar */}
      <div className="card mb-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search your knowledge base..."
              className="input-field pl-10"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            className="btn-primary flex items-center gap-2 px-6"
          >
            {searching ? (
              <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Searching...</>
            ) : (
              <><HiSearch className="w-4 h-4" /> Search</>
            )}
          </button>
        </div>
      </div>

      {/* Searching State */}
      {searching && (
        <div className="card text-center py-12">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-3 h-3 bg-indigo-400 rounded-full typing-dot"></div>
            <div className="w-3 h-3 bg-indigo-400 rounded-full typing-dot"></div>
            <div className="w-3 h-3 bg-indigo-400 rounded-full typing-dot"></div>
          </div>
          <p className="text-gray-500">Searching documents and generating AI answer...</p>
        </div>
      )}

      {/* Results */}
      {results && !searching && (
        <div className="space-y-6">
          {/* AI Answer */}
          {results.ai_answer && (
            <div className="card border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-purple-50/50">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                  AI
                </div>
                <h2 className="text-lg font-semibold text-gray-900">AI Answer</h2>
              </div>
              <div className="prose text-sm text-gray-700">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {results.ai_answer}
                </ReactMarkdown>
              </div>
              <div className="mt-4 pt-3 border-t border-indigo-100 flex items-center gap-4 text-xs text-gray-400">
                {results.model_used && (
                  <span className="flex items-center gap-1">
                    <HiChip className="w-3.5 h-3.5" />
                    {results.model_used.split('/').pop()}
                  </span>
                )}
                {results.response_time && (
                  <span className="flex items-center gap-1">
                    <HiClock className="w-3.5 h-3.5" />
                    {results.response_time}s
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Search Results */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Search Results ({results.results.length})
            </h2>
            {results.results.length === 0 ? (
              <div className="card text-center py-8">
                <p className="text-gray-500">No matching documents found. Try uploading more documents or adjusting your search query.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.results.map((result, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedResult(selectedResult === i ? null : i)}
                    className="card hover:shadow-md hover:border-rose-200 transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <HiDocument className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                          <span className="text-sm font-medium text-indigo-600">{result.document_title}</span>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                            {(result.score * 100).toFixed(0)}% match
                          </span>
                        </div>
                        <p className={`text-sm text-gray-700 ${selectedResult === i ? '' : 'line-clamp-3'}`}>
                          {result.chunk_text}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!results && !searching && (
        <div className="card text-center py-16">
          <div className="w-20 h-20 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <HiSearch className="w-10 h-10 text-rose-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Search Your Knowledge Base</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Enter a query to perform semantic search across all your documents. The AI will provide a synthesized answer along with relevant document chunks.
          </p>
        </div>
      )}
    </div>
  )
}
