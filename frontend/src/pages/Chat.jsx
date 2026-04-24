import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getChatSessions, createChatSession, deleteChatSession, updateChatSession } from '../api/client'
import toast from 'react-hot-toast'
import { HiPlus, HiTrash, HiPencil, HiChat, HiX } from 'react-icons/hi'

export default function Chat() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [editSession, setEditSession] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const navigate = useNavigate()

  const fetchSessions = () => {
    setLoading(true)
    getChatSessions()
      .then(res => setSessions(res.data))
      .catch(() => toast.error('Failed to load sessions'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchSessions() }, [])

  const handleCreate = async () => {
    if (!newTitle.trim()) { toast.error('Enter a title'); return }
    try {
      const res = await createChatSession({ title: newTitle })
      toast.success('Session created')
      navigate(`/chat/${res.data.id}`)
    } catch {
      toast.error('Failed to create session')
    }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Delete this chat session?')) return
    try {
      await deleteChatSession(id)
      toast.success('Session deleted')
      fetchSessions()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleEdit = (e, session) => {
    e.stopPropagation()
    setEditSession(session)
    setEditTitle(session.title)
  }

  const handleEditSave = async () => {
    try {
      await updateChatSession(editSession.id, { title: editTitle })
      toast.success('Session updated')
      setEditSession(null)
      fetchSessions()
    } catch {
      toast.error('Failed to update')
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Chat</h1>
          <p className="text-gray-500 text-sm mt-1">{sessions.length} chat sessions</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
          <HiPlus className="w-5 h-5" /> New Chat
        </button>
      </div>

      {/* New Session Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">New Chat Session</h2>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Chat session title..."
              className="input-field mb-4"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowNew(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreate} className="btn-primary">Create & Start</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Edit Session</h2>
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="input-field mb-4"
              onKeyDown={(e) => e.key === 'Enter' && handleEditSave()}
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setEditSession(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleEditSave} className="btn-primary">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Sessions List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card animate-pulse"><div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div><div className="h-4 bg-gray-100 rounded w-1/2"></div></div>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="card text-center py-12">
          <HiChat className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No chat sessions yet</h3>
          <p className="text-gray-500 mb-4">Start a new conversation with your documents</p>
          <button onClick={() => setShowNew(true)} className="btn-primary">
            <HiPlus className="w-5 h-5 inline mr-2" /> New Chat
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => navigate(`/chat/${session.id}`)}
              className="card hover:shadow-md hover:border-purple-200 transition-all cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <HiChat className="w-5 h-5 text-purple-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-gray-900 truncate">{session.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-400">{session.message_count || 0} messages</span>
                    {session.last_message && (
                      <span className="text-xs text-gray-400 truncate max-w-xs">{session.last_message}</span>
                    )}
                    <span className="text-xs text-gray-400">{new Date(session.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => handleEdit(e, session)} className="p-2 hover:bg-purple-50 rounded-lg text-gray-400 hover:text-purple-600 transition-colors">
                  <HiPencil className="w-4 h-4" />
                </button>
                <button onClick={(e) => handleDelete(e, session.id)} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors">
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
