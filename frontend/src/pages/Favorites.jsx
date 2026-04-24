import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFavorites, createFavorite, updateFavorite, deleteFavorite } from '../api/client'
import toast from 'react-hot-toast'
import { HiPlus, HiTrash, HiPencil, HiX, HiStar, HiDocument, HiChat, HiClipboardList } from 'react-icons/hi'

const typeConfig = {
  document: { icon: HiDocument, color: 'bg-blue-50 text-blue-600', label: 'Document' },
  session: { icon: HiChat, color: 'bg-purple-50 text-purple-600', label: 'Chat Session' },
  summary: { icon: HiClipboardList, color: 'bg-amber-50 text-amber-600', label: 'AI Summary' },
}

export default function Favorites() {
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [editFav, setEditFav] = useState(null)
  const [selectedFav, setSelectedFav] = useState(null)
  const [filterType, setFilterType] = useState('')
  const [form, setForm] = useState({ entity_type: 'document', entity_id: '', entity_name: '', note: '' })
  const [editNote, setEditNote] = useState('')
  const navigate = useNavigate()

  const fetchFavorites = () => {
    setLoading(true)
    getFavorites(filterType || undefined)
      .then(r => setFavorites(r.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchFavorites() }, [filterType])

  const handleCreate = async () => {
    if (!form.entity_id) { toast.error('Enter an entity ID'); return }
    try {
      await createFavorite({ ...form, entity_id: parseInt(form.entity_id) })
      toast.success('Added to favorites')
      setShowNew(false)
      setForm({ entity_type: 'document', entity_id: '', entity_name: '', note: '' })
      fetchFavorites()
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to add') }
  }

  const handleEditNote = (e, fav) => { e.stopPropagation(); setEditFav(fav); setEditNote(fav.note || '') }

  const handleEditSave = async () => {
    try { await updateFavorite(editFav.id, { note: editNote }); toast.success('Note updated'); setEditFav(null); fetchFavorites() }
    catch { toast.error('Failed to update') }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Remove from favorites?')) return
    try { await deleteFavorite(id); toast.success('Removed'); fetchFavorites(); if (selectedFav?.id === id) setSelectedFav(null) }
    catch { toast.error('Failed to remove') }
  }

  const handleNavigate = (fav) => {
    if (fav.entity_type === 'document') navigate(`/documents/${fav.entity_id}`)
    else if (fav.entity_type === 'session') navigate(`/chat/${fav.entity_id}`)
    else if (fav.entity_type === 'summary') navigate('/summaries')
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Favorites</h1>
          <p className="text-gray-500 text-sm mt-1">{favorites.length} bookmarked items</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
          <HiPlus className="w-5 h-5" /> Add Favorite
        </button>
      </div>

      <div className="mb-4">
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input-field w-48">
          <option value="">All Types</option>
          <option value="document">Documents</option>
          <option value="session">Chat Sessions</option>
          <option value="summary">AI Summaries</option>
        </select>
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Add Favorite</h2>
              <button onClick={() => setShowNew(false)} className="p-1 hover:bg-gray-100 rounded-lg"><HiX className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={form.entity_type} onChange={e => setForm({...form, entity_type: e.target.value})} className="input-field">
                  <option value="document">Document</option><option value="session">Chat Session</option><option value="summary">AI Summary</option>
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">ID</label>
                <input type="number" value={form.entity_id} onChange={e => setForm({...form, entity_id: e.target.value})} className="input-field" placeholder="Entity ID" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input value={form.entity_name} onChange={e => setForm({...form, entity_name: e.target.value})} className="input-field" placeholder="Display name" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <input value={form.note} onChange={e => setForm({...form, note: e.target.value})} className="input-field" placeholder="Optional note" /></div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowNew(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreate} className="btn-primary">Add</button>
            </div>
          </div>
        </div>
      )}

      {editFav && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Edit Note</h2>
            <input value={editNote} onChange={e => setEditNote(e.target.value)} className="input-field mb-4" placeholder="Add a note..." />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setEditFav(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleEditSave} className="btn-primary">Save</button>
            </div>
          </div>
        </div>
      )}

      {selectedFav && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Favorite Detail</h2>
              <button onClick={() => setSelectedFav(null)} className="p-1 hover:bg-gray-100 rounded-lg"><HiX className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div><p className="text-xs text-gray-500 uppercase">Type</p><p className="font-medium capitalize">{selectedFav.entity_type}</p></div>
              <div><p className="text-xs text-gray-500 uppercase">Name</p><p className="font-medium">{selectedFav.entity_name || `#${selectedFav.entity_id}`}</p></div>
              {selectedFav.note && <div><p className="text-xs text-gray-500 uppercase">Note</p><p className="text-sm text-gray-700">{selectedFav.note}</p></div>}
              <div><p className="text-xs text-gray-500 uppercase">Added</p><p className="text-sm">{new Date(selectedFav.created_at).toLocaleString()}</p></div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button onClick={() => { handleNavigate(selectedFav); setSelectedFav(null) }} className="btn-primary text-sm">Open</button>
              <button onClick={e => { setSelectedFav(null); handleEditNote(e, selectedFav) }} className="btn-secondary text-sm"><HiPencil className="w-4 h-4 inline mr-1" /> Edit</button>
              <button onClick={e => { handleDelete(e, selectedFav.id); setSelectedFav(null) }} className="btn-danger text-sm"><HiTrash className="w-4 h-4 inline mr-1" /> Delete</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="card animate-pulse h-16"></div>)}</div>
      ) : favorites.length === 0 ? (
        <div className="card text-center py-12">
          <HiStar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No favorites yet</h3>
          <p className="text-gray-500 mb-4">Bookmark your important documents, sessions, and summaries</p>
          <button onClick={() => setShowNew(true)} className="btn-primary"><HiPlus className="w-5 h-5 inline mr-2" /> Add Favorite</button>
        </div>
      ) : (
        <div className="space-y-2">
          {favorites.map(fav => {
            const cfg = typeConfig[fav.entity_type] || { icon: HiStar, color: 'bg-gray-50 text-gray-600', label: fav.entity_type }
            const Icon = cfg.icon
            return (
              <div key={fav.id} onClick={() => setSelectedFav(fav)}
                className="card hover:shadow-md hover:border-yellow-200 transition-all cursor-pointer flex items-center justify-between group">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-gray-900 truncate">{fav.entity_name || `${cfg.label} #${fav.entity_id}`}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">{cfg.label}</span>
                      {fav.note && <span className="text-xs text-gray-400 truncate">{fav.note}</span>}
                      <span className="text-xs text-gray-400">{new Date(fav.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                  <button onClick={e => handleEditNote(e, fav)} className="p-2 hover:bg-yellow-50 rounded-lg text-gray-400 hover:text-yellow-600 transition-colors"><HiPencil className="w-4 h-4" /></button>
                  <button onClick={e => handleDelete(e, fav.id)} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"><HiTrash className="w-4 h-4" /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
