import { useEffect, useState } from 'react'
import { getAISummaries, getDocuments, createAISummary, updateAISummary, deleteAISummary } from '../api/client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'
import { HiPlus, HiTrash, HiPencil, HiX, HiClipboardList, HiChip, HiRefresh } from 'react-icons/hi'

export default function AISummary() {
  const [summaries, setSummaries] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSummary, setSelectedSummary] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [editSummary, setEditSummary] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editText, setEditText] = useState('')
  const [newDocId, setNewDocId] = useState('')
  const [generating, setGenerating] = useState(false)
  const [scopeLabel, setScopeLabel] = useState('All accessible documents')

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      getAISummaries(),
      getDocuments(),
    ]).then(([summRes, docsRes]) => {
      setSummaries(summRes.data)
      setDocuments(docsRes.data)
    }).catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    const updateScope = () => {
      const id = localStorage.getItem('activeWorkspaceId')
      const name = localStorage.getItem('activeWorkspaceName')
      setScopeLabel(id ? (name || `Workspace ${id}`) : 'All accessible documents')
      fetchData()
    }
    updateScope()
    window.addEventListener('active-workspace-changed', updateScope)
    return () => window.removeEventListener('active-workspace-changed', updateScope)
  }, [])

  const handleGenerate = async () => {
    if (!newDocId) { toast.error('Select a document'); return }
    setGenerating(true)
    try {
      await createAISummary({ document_id: parseInt(newDocId) })
      toast.success('Summary generated!')
      setShowNew(false)
      setNewDocId('')
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to generate summary. Check your OpenRouter API key.')
    } finally {
      setGenerating(false)
    }
  }

  const handleEdit = (e, summary) => {
    e.stopPropagation()
    setEditSummary(summary)
    setEditTitle(summary.title || '')
    setEditText(summary.summary)
  }

  const handleEditSave = async () => {
    try {
      await updateAISummary(editSummary.id, { title: editTitle, summary: editText })
      toast.success('Summary updated')
      setEditSummary(null)
      fetchData()
    } catch {
      toast.error('Failed to update')
    }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Delete this summary?')) return
    try {
      await deleteAISummary(id)
      toast.success('Summary deleted')
      fetchData()
      if (selectedSummary?.id === id) setSelectedSummary(null)
    } catch {
      toast.error('Failed to delete')
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Summaries</h1>
          <p className="text-gray-500 text-sm mt-1">{summaries.length} summaries generated</p>
          <p className="mt-1 text-xs font-medium text-indigo-600">Scope: {scopeLabel}</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
          <HiPlus className="w-5 h-5" /> Generate Summary
        </button>
      </div>

      {/* Generate Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Generate AI Summary</h2>
              <button onClick={() => setShowNew(false)} className="p-1 hover:bg-gray-100 rounded-lg"><HiX className="w-5 h-5" /></button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Document</label>
              <select
                value={newDocId}
                onChange={(e) => setNewDocId(e.target.value)}
                className="input-field"
              >
                <option value="">Choose a document...</option>
                {documents.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              The AI will analyze the document content and generate a comprehensive summary using OpenRouter.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowNew(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleGenerate} disabled={generating} className="btn-primary flex items-center gap-2">
                {generating ? (
                  <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Generating...</>
                ) : (
                  <><HiRefresh className="w-4 h-4" /> Generate</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editSummary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold mb-4">Edit Summary</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
                <textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="input-field h-48" />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => setEditSummary(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleEditSave} className="btn-primary">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedSummary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{selectedSummary.title}</h2>
                <p className="text-sm text-gray-500">Document: {selectedSummary.document_title}</p>
              </div>
              <button onClick={() => setSelectedSummary(null)} className="p-1 hover:bg-gray-100 rounded-lg"><HiX className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-4">
              <div className="prose text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {selectedSummary.summary}
                </ReactMarkdown>
              </div>
            </div>
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-gray-400">
                {selectedSummary.model_used && (
                  <span className="flex items-center gap-1">
                    <HiChip className="w-3.5 h-3.5" />
                    {selectedSummary.model_used.split('/').pop()}
                  </span>
                )}
                <span>{new Date(selectedSummary.created_at).toLocaleString()}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={(e) => { setSelectedSummary(null); handleEdit(e, selectedSummary) }} className="btn-secondary text-sm">
                  <HiPencil className="w-4 h-4 inline mr-1" /> Edit
                </button>
                <button onClick={(e) => { handleDelete(e, selectedSummary.id); setSelectedSummary(null) }} className="btn-danger text-sm">
                  <HiTrash className="w-4 h-4 inline mr-1" /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summaries List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card animate-pulse"><div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div><div className="h-16 bg-gray-100 rounded"></div></div>
          ))}
        </div>
      ) : summaries.length === 0 ? (
        <div className="card text-center py-12">
          <HiClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No summaries yet</h3>
          <p className="text-gray-500 mb-4">Generate AI summaries of your documents</p>
          <button onClick={() => setShowNew(true)} className="btn-primary">
            <HiPlus className="w-5 h-5 inline mr-2" /> Generate Summary
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {summaries.map((summary) => (
            <div
              key={summary.id}
              onClick={() => setSelectedSummary(summary)}
              className="card hover:shadow-md hover:border-amber-200 transition-all cursor-pointer flex items-start justify-between group"
            >
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <HiClipboardList className="w-5 h-5 text-amber-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-gray-900 truncate">{summary.title}</h3>
                  <div className="flex items-center gap-3 mt-1 mb-2">
                    <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-medium">{summary.document_title}</span>
                    {summary.model_used && <span className="text-xs text-gray-400">{summary.model_used.split('/').pop()}</span>}
                    <span className="text-xs text-gray-400">{new Date(summary.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2">{summary.summary.replace(/[#*_]/g, '').slice(0, 200)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                <button onClick={(e) => handleEdit(e, summary)} className="p-2 hover:bg-amber-50 rounded-lg text-gray-400 hover:text-amber-600 transition-colors">
                  <HiPencil className="w-4 h-4" />
                </button>
                <button onClick={(e) => handleDelete(e, summary.id)} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors">
                  <HiTrash className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
