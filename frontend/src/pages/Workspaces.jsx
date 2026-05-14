import { useEffect, useState } from 'react'
import { getWorkspaces, createWorkspace, deleteWorkspace, getWorkspaceMembers, inviteWorkspaceMember, getUsers } from '../api/client'
import toast from 'react-hot-toast'
import { HiOfficeBuilding, HiPlus, HiTrash, HiUserAdd, HiUsers, HiX } from 'react-icons/hi'

export default function Workspaces() {
  const [workspaces, setWorkspaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newWs, setNewWs] = useState({ name: '', description: '' })
  const [selectedWs, setSelectedWs] = useState(null)
  const [members, setMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [allUsers, setAllUsers] = useState([])
  const [inviteUserId, setInviteUserId] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviting, setInviting] = useState(false)

  const fetchWorkspaces = async () => {
    try {
      const res = await getWorkspaces()
      setWorkspaces(res.data)
    } catch {
      toast.error('Failed to load workspaces')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchWorkspaces() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newWs.name.trim()) return
    setCreating(true)
    try {
      await createWorkspace(newWs)
      toast.success('Workspace created!')
      setShowCreate(false)
      setNewWs({ name: '', description: '' })
      fetchWorkspaces()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create workspace')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (ws) => {
    if (!confirm(`Delete workspace "${ws.name}"?`)) return
    try {
      await deleteWorkspace(ws.id)
      toast.success('Workspace deleted')
      if (selectedWs?.id === ws.id) setSelectedWs(null)
      fetchWorkspaces()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete workspace')
    }
  }

  const handleSelectWs = async (ws) => {
    setSelectedWs(ws)
    setMembersLoading(true)
    setShowInvite(false)
    try {
      const [membRes, usersRes] = await Promise.all([
        getWorkspaceMembers(ws.id),
        getUsers(),
      ])
      setMembers(membRes.data)
      setAllUsers(usersRes.data)
    } catch {
      toast.error('Failed to load workspace details')
    } finally {
      setMembersLoading(false)
    }
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!inviteUserId) return
    setInviting(true)
    try {
      await inviteWorkspaceMember(selectedWs.id, { user_id: parseInt(inviteUserId), role: inviteRole })
      toast.success('Member invited!')
      setShowInvite(false)
      setInviteUserId('')
      const res = await getWorkspaceMembers(selectedWs.id)
      setMembers(res.data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to invite member')
    } finally {
      setInviting(false)
    }
  }

  if (loading) return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded w-1/4"></div>
      {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl"></div>)}
    </div>
  )

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workspaces</h1>
          <p className="text-gray-500 text-sm mt-1">Manage multi-tenant workspaces and members</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors"
        >
          <HiPlus className="w-4 h-4" /> New Workspace
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workspace list */}
        <div className="space-y-3">
          {workspaces.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <HiOfficeBuilding className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No workspaces yet. Create one to get started.</p>
            </div>
          ) : (
            workspaces.map(ws => (
              <div
                key={ws.id}
                onClick={() => handleSelectWs(ws)}
                className={`bg-white rounded-xl border p-4 cursor-pointer hover:border-indigo-300 transition-all ${selectedWs?.id === ws.id ? 'border-indigo-500 shadow-md' : 'border-gray-200'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold">
                      {ws.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{ws.name}</h3>
                      <p className="text-xs text-gray-500">{ws.slug} · {ws.member_count} member{ws.member_count !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(ws) }}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  >
                    <HiTrash className="w-4 h-4" />
                  </button>
                </div>
                {ws.description && (
                  <p className="text-sm text-gray-500 mt-2 ml-13">{ws.description}</p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${ws.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {ws.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Members panel */}
        {selectedWs && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <HiUsers className="w-5 h-5 text-indigo-500" />
                {selectedWs.name} Members
              </h2>
              <button
                onClick={() => setShowInvite(!showInvite)}
                className="flex items-center gap-1 text-sm px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <HiUserAdd className="w-4 h-4" /> Invite
              </button>
            </div>

            {showInvite && (
              <form onSubmit={handleInvite} className="mb-4 p-3 bg-gray-50 rounded-lg space-y-3">
                <h3 className="text-sm font-medium text-gray-700">Invite Member</h3>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={inviteUserId}
                  onChange={(e) => setInviteUserId(e.target.value)}
                >
                  <option value="">Select a user...</option>
                  {allUsers
                    .filter(u => !members.find(m => m.user_id === u.id))
                    .map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                </select>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
                <div className="flex gap-2">
                  <button type="submit" disabled={!inviteUserId || inviting}
                    className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                    {inviting ? 'Inviting...' : 'Invite'}
                  </button>
                  <button type="button" onClick={() => setShowInvite(false)}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors">
                    <HiX className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {membersLoading ? (
              <div className="animate-pulse space-y-3">
                {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg"></div>)}
              </div>
            ) : (
              <div className="space-y-2">
                {members.map(m => (
                  <div key={m.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{m.user_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{m.user_email}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      m.role === 'owner' ? 'bg-purple-100 text-purple-700' :
                      m.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                      m.role === 'viewer' ? 'bg-gray-100 text-gray-600' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {m.role}
                    </span>
                  </div>
                ))}
                {members.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No members yet</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Workspace Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Create Workspace</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <HiX className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={newWs.name}
                  onChange={(e) => setNewWs(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  placeholder="My Team Workspace"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newWs.description}
                  onChange={(e) => setNewWs(p => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="Optional description..."
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 text-sm transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={creating || !newWs.name.trim()}
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 text-sm transition-colors">
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
