import { useEffect, useState } from 'react'
import { getTags, createTag, updateTag, deleteTag, getTagDocuments } from '../api/client'
import toast from 'react-hot-toast'
import { HiPlus, HiTrash, HiPencil, HiX, HiTag, HiDocument } from 'react-icons/hi'

const COLORS = ['#3b82f6','#eab308','#10b981','#06b6d4','#8b5cf6','#f59e0b','#6366f1','#ef4444','#14b8a6','#ec4899','#0ea5e9','#a855f7','#f97316','#2563eb','#84cc16','#d946ef']

export default function Tags() {
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [editTag, setEditTag] = useState(null)
  const [selectedTag, setSelectedTag] = useState(null)
  const [tagDocs, setTagDocs] = useState([])
  const [form, setForm] = useState({ name: '', color: '#6366f1', description: '' })

  const fetchTags = () => {
    setLoading(true)
    getTags().then(r => setTags(r.data)).catch(() => toast.error('Failed to load tags')).finally(() => setLoading(false))
  }

  useEffect(() => { fetchTags() }, [])

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Enter a tag name'); return }
    try {
      await createTag(form)
      toast.success('Tag created')
      setShowNew(false)
      setForm({ name: '', color: '#6366f1', description: '' })
      fetchTags()
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to create tag') }
  }

  const handleEdit = (e, tag) => {
    e.stopPropagation()
    setEditTag(tag)
    setForm({ name: tag.name, color: tag.color, description: tag.description || '' })
  }

  const handleEditSave = async () => {
    try {
      await updateTag(editTag.id, form)
      toast.success('Tag updated')
      setEditTag(null)
      fetchTags()
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to update') }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Delete this tag?')) return
    try { await deleteTag(id); toast.success('Tag deleted'); fetchTags(); if (selectedTag?.id === id) setSelectedTag(null) }
    catch { toast.error('Failed to delete') }
  }

  const handleSelectTag = async (tag) => {
    setSelectedTag(tag)
    try {
      const res = await getTagDocuments(tag.id)
      setTagDocs(res.data)
    } catch { setTagDocs([]) }
  }

  const renderModal = (title, onSave, onCancel) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded-lg"><HiX className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-field" placeholder="Tag name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button key={c} onClick={() => setForm({...form, color: c})}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${form.color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input-field" placeholder="Optional description" />
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button onClick={onSave} className="btn-primary">Save</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tags</h1>
          <p className="text-gray-500 text-sm mt-1">{tags.length} tags for organizing documents</p>
        </div>
        <button onClick={() => { setShowNew(true); setForm({ name: '', color: '#6366f1', description: '' }) }} className="btn-primary flex items-center gap-2">
          <HiPlus className="w-5 h-5" /> New Tag
        </button>
      </div>

      {showNew && renderModal('New Tag', handleCreate, () => setShowNew(false))}
      {editTag && renderModal('Edit Tag', handleEditSave, () => setEditTag(null))}

      {selectedTag && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: selectedTag.color }}></div>
                <div>
                  <h2 className="text-lg font-semibold">{selectedTag.name}</h2>
                  <p className="text-sm text-gray-500">{selectedTag.description}</p>
                </div>
              </div>
              <button onClick={() => setSelectedTag(null)} className="p-1 hover:bg-gray-100 rounded-lg"><HiX className="w-5 h-5" /></button>
            </div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Tagged Documents ({tagDocs.length})</h3>
            {tagDocs.length === 0 ? <p className="text-sm text-gray-400">No documents tagged</p> : (
              <div className="space-y-2">
                {tagDocs.map(td => (
                  <div key={td.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <HiDocument className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm font-medium">{td.document_title}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={(e) => { setSelectedTag(null); handleEdit(e, selectedTag) }} className="btn-secondary text-sm"><HiPencil className="w-4 h-4 inline mr-1" /> Edit</button>
              <button onClick={(e) => { handleDelete(e, selectedTag.id); setSelectedTag(null) }} className="btn-danger text-sm"><HiTrash className="w-4 h-4 inline mr-1" /> Delete</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="card animate-pulse h-24"></div>)}
        </div>
      ) : tags.length === 0 ? (
        <div className="card text-center py-12">
          <HiTag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tags yet</h3>
          <p className="text-gray-500 mb-4">Create tags to organize your documents</p>
          <button onClick={() => setShowNew(true)} className="btn-primary"><HiPlus className="w-5 h-5 inline mr-2" /> New Tag</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {tags.map(tag => (
            <div key={tag.id} onClick={() => handleSelectTag(tag)}
              className="card hover:shadow-md transition-all cursor-pointer group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: tag.color + '20' }}>
                  <HiTag className="w-5 h-5" style={{ color: tag.color }} />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={e => handleEdit(e, tag)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-indigo-600"><HiPencil className="w-3.5 h-3.5" /></button>
                  <button onClick={e => handleDelete(e, tag.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600"><HiTrash className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <h3 className="font-medium text-gray-900">{tag.name}</h3>
              <p className="text-xs text-gray-400 mt-1">{tag.document_count} documents</p>
              {tag.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{tag.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
