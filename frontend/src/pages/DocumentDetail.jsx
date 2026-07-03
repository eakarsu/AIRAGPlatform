import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDocument, updateDocument, deleteDocument, getKnowledgeChunks, getDocumentEvents, reindexDocument } from '../api/client'
import toast from 'react-hot-toast'
import { HiArrowLeft, HiPencil, HiTrash, HiSave, HiX, HiRefresh } from 'react-icons/hi'

export default function DocumentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [doc, setDoc] = useState(null)
  const [chunks, setChunks] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [reindexing, setReindexing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')

  const loadDocument = () => {
    Promise.all([
      getDocument(id),
      getKnowledgeChunks(id),
      getDocumentEvents(id),
    ]).then(([docRes, chunksRes, eventsRes]) => {
      setDoc(docRes.data)
      setChunks(chunksRes.data)
      setEvents(eventsRes.data || [])
      setEditTitle(docRes.data.title)
      setEditContent(docRes.data.content || '')
    }).catch(() => {
      toast.error('Document not found')
      navigate('/documents')
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    loadDocument()
  }, [id])

  const handleSave = async () => {
    try {
      const res = await updateDocument(id, { title: editTitle, content: editContent })
      setDoc(res.data)
      setEditing(false)
      getDocumentEvents(id).then((eventsRes) => setEvents(eventsRes.data || [])).catch(() => {})
      toast.success('Document updated')
    } catch {
      toast.error('Failed to update')
    }
  }

  const handleReindex = async () => {
    setReindexing(true)
    try {
      const res = await reindexDocument(id)
      setDoc(res.data)
      const [chunksRes, eventsRes] = await Promise.all([getKnowledgeChunks(id), getDocumentEvents(id)])
      setChunks(chunksRes.data)
      setEvents(eventsRes.data || [])
      toast.success('Document reindexed')
    } catch {
      toast.error('Failed to reindex document')
    } finally {
      setReindexing(false)
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
              <button onClick={handleReindex} disabled={reindexing} className="btn-secondary flex items-center gap-1 disabled:opacity-50">
                <HiRefresh className={`w-4 h-4 ${reindexing ? 'animate-spin' : ''}`} /> Reindex
              </button>
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

      <div className="card mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Document Activity</h2>
        {events.length === 0 ? (
          <p className="text-gray-500 text-sm">No activity recorded for this document yet.</p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className="flex gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="mt-1 h-2.5 w-2.5 rounded-full bg-indigo-500" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold capitalize text-gray-900">{event.event_type}</span>
                    {event.user_name && <span className="text-xs text-gray-500">by {event.user_name}</span>}
                    <span className="text-xs text-gray-400">{new Date(event.created_at).toLocaleString()}</span>
                  </div>
                  {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      {Object.entries(event.metadata).map(([key, value]) => (
                        <div key={key} className="rounded-md bg-white px-3 py-2 text-xs">
                          <span className="font-semibold uppercase tracking-wide text-gray-500">{key.replace(/_/g, ' ')}</span>
                          <span className="ml-2 text-gray-800">{Array.isArray(value) ? value.join(', ') : String(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
