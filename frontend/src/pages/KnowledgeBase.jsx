import { useEffect, useState } from 'react'
import { getKnowledgeChunks, getDocuments, createKnowledgeChunk, updateKnowledgeChunk, deleteKnowledgeChunk } from '../api/client'
import toast from 'react-hot-toast'
import { HiPlus, HiTrash, HiPencil, HiX, HiDatabase } from 'react-icons/hi'

export default function KnowledgeBase() {
  const [chunks, setChunks] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedChunk, setSelectedChunk] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [editChunk, setEditChunk] = useState(null)
  const [filterDocId, setFilterDocId] = useState('')
  const [newChunk, setNewChunk] = useState({ document_id: '', chunk_text: '', chunk_index: 0 })
  const [editText, setEditText] = useState('')

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      getKnowledgeChunks(filterDocId || undefined),
      getDocuments(),
    ]).then(([chunksRes, docsRes]) => {
      setChunks(chunksRes.data)
      setDocuments(docsRes.data)
    }).catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [filterDocId])

  const handleCreate = async () => {
    if (!newChunk.document_id || !newChunk.chunk_text.trim()) {
      toast.error('Select a document and enter chunk text')
      return
    }
    try {
      await createKnowledgeChunk({
        document_id: parseInt(newChunk.document_id),
        chunk_text: newChunk.chunk_text,
        chunk_index: newChunk.chunk_index,
      })
      toast.success('Chunk created')
      setShowNew(false)
      setNewChunk({ document_id: '', chunk_text: '', chunk_index: 0 })
      fetchData()
    } catch {
      toast.error('Failed to create chunk')
    }
  }

  const handleEdit = (e, chunk) => {
    e.stopPropagation()
    setEditChunk(chunk)
    setEditText(chunk.chunk_text)
  }

  const handleEditSave = async () => {
    try {
      await updateKnowledgeChunk(editChunk.id, { chunk_text: editText })
      toast.success('Chunk updated')
      setEditChunk(null)
      fetchData()
    } catch {
      toast.error('Failed to update')
    }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Delete this chunk?')) return
    try {
      await deleteKnowledgeChunk(id)
      toast.success('Chunk deleted')
      fetchData()
      if (selectedChunk?.id === id) setSelectedChunk(null)
    } catch {
      toast.error('Failed to delete')
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
          <p className="text-gray-500 text-sm mt-1">{chunks.length} knowledge chunks</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
          <HiPlus className="w-5 h-5" /> New Chunk
        </button>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <select
          value={filterDocId}
          onChange={(e) => setFilterDocId(e.target.value)}
          className="input-field w-64"
        >
          <option value="">All Documents</option>
          {documents.map(d => (
            <option key={d.id} value={d.id}>{d.title}</option>
          ))}
        </select>
      </div>

      {/* New Chunk Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">New Knowledge Chunk</h2>
              <button onClick={() => setShowNew(false)} className="p-1 hover:bg-gray-100 rounded-lg"><HiX className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document</label>
                <select
                  value={newChunk.document_id}
                  onChange={(e) => setNewChunk({...newChunk, document_id: e.target.value})}
                  className="input-field"
                >
                  <option value="">Select a document</option>
                  {documents.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chunk Text</label>
                <textarea
                  value={newChunk.chunk_text}
                  onChange={(e) => setNewChunk({...newChunk, chunk_text: e.target.value})}
                  className="input-field h-40"
                  placeholder="Enter the knowledge chunk text..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chunk Index</label>
                <input
                  type="number"
                  value={newChunk.chunk_index}
                  onChange={(e) => setNewChunk({...newChunk, chunk_index: parseInt(e.target.value) || 0})}
                  className="input-field w-32"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowNew(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreate} className="btn-primary">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editChunk && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold mb-4">Edit Chunk</h2>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="input-field h-48 mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setEditChunk(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleEditSave} className="btn-primary">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedChunk && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Chunk #{selectedChunk.chunk_index + 1}</h2>
                <p className="text-sm text-gray-500">From: {selectedChunk.document_title}</p>
              </div>
              <button onClick={() => setSelectedChunk(null)} className="p-1 hover:bg-gray-100 rounded-lg"><HiX className="w-5 h-5" /></button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedChunk.chunk_text}</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">{selectedChunk.tokens} tokens</span>
              <div className="flex gap-2">
                <button onClick={(e) => { setSelectedChunk(null); handleEdit(e, selectedChunk) }} className="btn-secondary text-sm">
                  <HiPencil className="w-4 h-4 inline mr-1" /> Edit
                </button>
                <button onClick={(e) => { handleDelete(e, selectedChunk.id); setSelectedChunk(null) }} className="btn-danger text-sm">
                  <HiTrash className="w-4 h-4 inline mr-1" /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chunks List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card animate-pulse"><div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div><div className="h-12 bg-gray-100 rounded"></div></div>
          ))}
        </div>
      ) : chunks.length === 0 ? (
        <div className="card text-center py-12">
          <HiDatabase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No knowledge chunks</h3>
          <p className="text-gray-500 mb-4">Upload documents to automatically create knowledge chunks</p>
        </div>
      ) : (
        <div className="space-y-2">
          {chunks.map((chunk) => (
            <div
              key={chunk.id}
              onClick={() => setSelectedChunk(chunk)}
              className="card hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer flex items-start justify-between group"
            >
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm font-semibold text-emerald-600">#{chunk.chunk_index + 1}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{chunk.document_title}</span>
                    <span className="text-xs text-gray-400">{chunk.tokens} tokens</span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">{chunk.chunk_text}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                <button onClick={(e) => handleEdit(e, chunk)} className="p-2 hover:bg-emerald-50 rounded-lg text-gray-400 hover:text-emerald-600 transition-colors">
                  <HiPencil className="w-4 h-4" />
                </button>
                <button onClick={(e) => handleDelete(e, chunk.id)} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors">
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
