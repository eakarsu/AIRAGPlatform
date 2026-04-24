import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDocuments, deleteDocument, uploadDocument, updateDocument } from '../api/client'
import toast from 'react-hot-toast'
import { HiPlus, HiTrash, HiPencil, HiX, HiUpload, HiDocument } from 'react-icons/hi'
import DocumentUpload from '../components/DocumentUpload'

export default function Documents() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [editDoc, setEditDoc] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const navigate = useNavigate()

  const fetchDocs = () => {
    setLoading(true)
    getDocuments()
      .then(res => setDocs(res.data))
      .catch(() => toast.error('Failed to load documents'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchDocs() }, [])

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Delete this document?')) return
    try {
      await deleteDocument(id)
      toast.success('Document deleted')
      fetchDocs()
      if (selectedDoc?.id === id) setSelectedDoc(null)
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleEdit = (e, doc) => {
    e.stopPropagation()
    setEditDoc(doc)
    setEditTitle(doc.title)
  }

  const handleEditSave = async () => {
    try {
      await updateDocument(editDoc.id, { title: editTitle })
      toast.success('Document updated')
      setEditDoc(null)
      fetchDocs()
    } catch {
      toast.error('Failed to update')
    }
  }

  const handleUploadComplete = () => {
    setShowUpload(false)
    fetchDocs()
    toast.success('Document uploaded successfully')
  }

  const fileTypeColors = {
    pdf: 'bg-red-100 text-red-700',
    docx: 'bg-blue-100 text-blue-700',
    txt: 'bg-gray-100 text-gray-700',
    md: 'bg-green-100 text-green-700',
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-500 text-sm mt-1">{docs.length} documents in your library</p>
        </div>
        <button onClick={() => setShowUpload(true)} className="btn-primary flex items-center gap-2">
          <HiPlus className="w-5 h-5" /> Upload Document
        </button>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Upload Document</h2>
              <button onClick={() => setShowUpload(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <HiX className="w-5 h-5" />
              </button>
            </div>
            <DocumentUpload onComplete={handleUploadComplete} />
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Edit Document</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="input-field"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setEditDoc(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleEditSave} className="btn-primary">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Document List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-100 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="card text-center py-12">
          <HiDocument className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
          <p className="text-gray-500 mb-4">Upload your first document to get started</p>
          <button onClick={() => setShowUpload(true)} className="btn-primary">
            <HiUpload className="w-5 h-5 inline mr-2" /> Upload Document
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <div
              key={doc.id}
              onClick={() => navigate(`/documents/${doc.id}`)}
              className="card hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <HiDocument className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-gray-900 truncate">{doc.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${fileTypeColors[doc.file_type] || 'bg-gray-100 text-gray-700'}`}>
                      {doc.file_type.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-400">{(doc.file_size / 1024).toFixed(1)} KB</span>
                    <span className="text-xs text-gray-400">{doc.chunk_count} chunks</span>
                    <span className="text-xs text-gray-400">{new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => handleEdit(e, doc)}
                  className="p-2 hover:bg-indigo-50 rounded-lg text-gray-400 hover:text-indigo-600 transition-colors"
                >
                  <HiPencil className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => handleDelete(e, doc.id)}
                  className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                >
                  <HiTrash className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Panel */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{selectedDoc.title}</h2>
              <button onClick={() => setSelectedDoc(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <HiX className="w-5 h-5" />
              </button>
            </div>
            <div className="prose text-sm">
              <pre className="whitespace-pre-wrap">{selectedDoc.content}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
