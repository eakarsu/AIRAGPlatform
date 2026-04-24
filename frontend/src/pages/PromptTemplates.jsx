import { useEffect, useState } from 'react'
import { getPrompts, createPrompt, updatePrompt, deletePrompt } from '../api/client'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { HiPlus, HiTrash, HiPencil, HiX, HiTemplate, HiClipboardCopy, HiChat } from 'react-icons/hi'

const CATEGORIES = ['General', 'Analysis', 'Content', 'Simplification', 'Education', 'Productivity', 'Development', 'Business', 'Reference']

export default function PromptTemplates() {
  const [prompts, setPrompts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [editPrompt, setEditPrompt] = useState(null)
  const [selectedPrompt, setSelectedPrompt] = useState(null)
  const [filterCat, setFilterCat] = useState('')
  const [form, setForm] = useState({ title: '', description: '', template_text: '', category: 'General', is_active: true })
  const navigate = useNavigate()

  const fetchPrompts = () => {
    setLoading(true)
    getPrompts(filterCat || undefined).then(r => setPrompts(r.data)).catch(() => toast.error('Failed to load')).finally(() => setLoading(false))
  }

  useEffect(() => { fetchPrompts() }, [filterCat])

  const handleCreate = async () => {
    if (!form.title.trim() || !form.template_text.trim()) { toast.error('Title and template text required'); return }
    try { await createPrompt(form); toast.success('Template created'); setShowNew(false); setForm({ title: '', description: '', template_text: '', category: 'General', is_active: true }); fetchPrompts() }
    catch { toast.error('Failed to create') }
  }

  const handleEdit = (e, p) => { e.stopPropagation(); setEditPrompt(p); setForm({ title: p.title, description: p.description || '', template_text: p.template_text, category: p.category, is_active: p.is_active }) }

  const handleEditSave = async () => {
    try { await updatePrompt(editPrompt.id, form); toast.success('Template updated'); setEditPrompt(null); fetchPrompts() }
    catch { toast.error('Failed to update') }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation(); if (!confirm('Delete this template?')) return
    try { await deletePrompt(id); toast.success('Deleted'); fetchPrompts(); if (selectedPrompt?.id === id) setSelectedPrompt(null) }
    catch { toast.error('Failed to delete') }
  }

  const handleUseInChat = (prompt) => {
    navigate('/chat', { state: { prefillMessage: prompt.template_text } })
  }

  const handleCopy = (text) => { navigator.clipboard.writeText(text); toast.success('Copied to clipboard') }

  const catColors = { General: 'bg-gray-100 text-gray-700', Analysis: 'bg-blue-100 text-blue-700', Content: 'bg-green-100 text-green-700', Simplification: 'bg-yellow-100 text-yellow-700', Education: 'bg-purple-100 text-purple-700', Productivity: 'bg-orange-100 text-orange-700', Development: 'bg-cyan-100 text-cyan-700', Business: 'bg-rose-100 text-rose-700', Reference: 'bg-indigo-100 text-indigo-700' }

  const renderForm = (title, onSave, onCancel) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded-lg"><HiX className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="input-field" placeholder="Template title" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="input-field">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input-field" placeholder="Brief description" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Prompt Template</label>
            <textarea value={form.template_text} onChange={e => setForm({...form, template_text: e.target.value})} className="input-field h-32" placeholder="Write your prompt template..." /></div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} className="w-4 h-4 text-indigo-600 rounded" />
            <span className="text-sm text-gray-700">Active</span>
          </label>
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
          <h1 className="text-2xl font-bold text-gray-900">Prompt Templates</h1>
          <p className="text-gray-500 text-sm mt-1">{prompts.length} reusable AI prompt templates</p>
        </div>
        <button onClick={() => { setShowNew(true); setForm({ title: '', description: '', template_text: '', category: 'General', is_active: true }) }} className="btn-primary flex items-center gap-2">
          <HiPlus className="w-5 h-5" /> New Template
        </button>
      </div>

      <div className="mb-4">
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="input-field w-48">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {showNew && renderForm('New Prompt Template', handleCreate, () => setShowNew(false))}
      {editPrompt && renderForm('Edit Prompt Template', handleEditSave, () => setEditPrompt(null))}

      {selectedPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{selectedPrompt.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${catColors[selectedPrompt.category] || 'bg-gray-100 text-gray-700'}`}>{selectedPrompt.category}</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${selectedPrompt.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{selectedPrompt.is_active ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
              <button onClick={() => setSelectedPrompt(null)} className="p-1 hover:bg-gray-100 rounded-lg"><HiX className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-4">
              {selectedPrompt.description && <p className="text-sm text-gray-600 mb-4">{selectedPrompt.description}</p>}
              <h3 className="text-sm font-medium text-gray-700 mb-2">Prompt Text</h3>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{selectedPrompt.template_text}</p>
              </div>
            </div>
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-6 py-3 flex items-center justify-between">
              <button onClick={() => handleCopy(selectedPrompt.template_text)} className="btn-secondary text-sm flex items-center gap-1">
                <HiClipboardCopy className="w-4 h-4" /> Copy
              </button>
              <div className="flex gap-2">
                <button onClick={() => { handleUseInChat(selectedPrompt); setSelectedPrompt(null) }} className="btn-success text-sm flex items-center gap-1">
                  <HiChat className="w-4 h-4" /> Use in Chat
                </button>
                <button onClick={(e) => { setSelectedPrompt(null); handleEdit(e, selectedPrompt) }} className="btn-secondary text-sm"><HiPencil className="w-4 h-4 inline mr-1" /> Edit</button>
                <button onClick={(e) => { handleDelete(e, selectedPrompt.id); setSelectedPrompt(null) }} className="btn-danger text-sm"><HiTrash className="w-4 h-4 inline mr-1" /> Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="card animate-pulse"><div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div><div className="h-12 bg-gray-100 rounded"></div></div>)}</div>
      ) : prompts.length === 0 ? (
        <div className="card text-center py-12">
          <HiTemplate className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
          <p className="text-gray-500 mb-4">Create reusable AI prompt templates</p>
          <button onClick={() => setShowNew(true)} className="btn-primary"><HiPlus className="w-5 h-5 inline mr-2" /> New Template</button>
        </div>
      ) : (
        <div className="space-y-2">
          {prompts.map(p => (
            <div key={p.id} onClick={() => setSelectedPrompt(p)} className="card hover:shadow-md hover:border-violet-200 transition-all cursor-pointer flex items-start justify-between group">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <HiTemplate className="w-5 h-5 text-violet-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-gray-900 truncate">{p.title}</h3>
                  <div className="flex items-center gap-2 mt-1 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${catColors[p.category] || 'bg-gray-100 text-gray-700'}`}>{p.category}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${p.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{p.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                  {p.description && <p className="text-sm text-gray-500 line-clamp-1">{p.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                <button onClick={e => handleEdit(e, p)} className="p-2 hover:bg-violet-50 rounded-lg text-gray-400 hover:text-violet-600 transition-colors"><HiPencil className="w-4 h-4" /></button>
                <button onClick={e => handleDelete(e, p.id)} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"><HiTrash className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
