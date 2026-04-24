import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDocument, updateDocument, deleteDocument, getKnowledgeChunks } from '../api/client'
import toast from 'react-hot-toast'
import { HiArrowLeft, HiPencil, HiTrash, HiSave, HiX } from 'react-icons/hi'

export default function DocumentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [doc, setDoc] = useState(null)
  const [chunks, setChunks] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')

  useEffect(() => {
    Promise.all([
      getDocument(id),
      getKnowledgeChunks(id),
    ]).then(([docRes, chunksRes]) => {
      setDoc(docRes.data)
      setChunks(chunksRes.data)
      setEditTitle(docRes.data.title)
      setEditContent(docRes.data.content || '')
    }).catch(() => {
      toast.error('Document not found')
      navigate('/documents')
    }).finally(() => setLoading(false))
  }, [id])

  const handleSave = async () => {
    try {
      const res = await updateDocument(id, { title: editTitle, content: editContent })
      setDoc(res.data)
      setEditing(false)
      toast.success('Document updated')
    } catch {
      toast.error('Failed to update')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this document and all associated data?')) return
    try {
      await deleteDocument(id)
      toast.success('Document deleted')
      navigate('/documents')
    } catch {
      toast.error('Failed to delete')
    }
  }

  if (loading) return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded w-1/3"></div>
      <div className="h-64 bg-gray-100 rounded"></div>
    </div>
  )

  if (!doc) return null

  const fileTypeColors = {
    pdf: 'bg-red-100 text-red-700',
    docx: 'bg-blue-100 text-blue-700',
    txt: 'bg-gray-100 text-gray-700',
    md: 'bg-green-100 text-green-700',
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/documents')} className="p-2 hover:bg-gray-100 rounded-lg">
          <HiArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          {editing ? (
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="input-field text-xl font-bold"
            />
          ) : (
            <h1 className="text-2xl font-bold text-gray-900">{doc.title}</h1>
          )}
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="btn-secondary flex items-center gap-1">
                <HiX className="w-4 h-4" /> Cancel
              </button>
              <button onClick={handleSave} className="btn-primary flex items-center gap-1">
                <HiSave className="w-4 h-4" /> Save
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-1">
                <HiPencil className="w-4 h-4" /> Edit
              </button>
              <button onClick={handleDelete} className="btn-danger flex items-center gap-1">
                <HiTrash className="w-4 h-4" /> Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="card mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Type</p>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${fileTypeColors[doc.file_type] || 'bg-gray-100 text-gray-700'}`}>
              {doc.file_type.toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">File Size</p>
            <p className="mt-1 font-medium">{(doc.file_size / 1024).toFixed(1)} KB</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Chunks</p>
            <p className="mt-1 font-medium">{doc.chunk_count}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Status</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
              {doc.status}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Created</p>
            <p className="mt-1 font-medium text-sm">{new Date(doc.created_at).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Content</h2>
        {editing ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="input-field h-96 font-mono text-sm"
          />
        ) : (
          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">{doc.content}</pre>
          </div>
        )}
      </div>

      {/* Chunks */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Knowledge Chunks ({chunks.length})</h2>
        {chunks.length === 0 ? (
          <p className="text-gray-500 text-sm">No chunks extracted from this document.</p>
        ) : (
          <div className="space-y-3">
            {chunks.map((chunk, i) => (
              <div key={chunk.id} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    Chunk #{chunk.chunk_index + 1}
                  </span>
                  <span className="text-xs text-gray-400">{chunk.tokens} tokens</span>
                </div>
                <p className="text-sm text-gray-700 line-clamp-3">{chunk.chunk_text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
