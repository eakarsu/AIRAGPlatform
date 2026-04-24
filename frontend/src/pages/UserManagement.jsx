import { useEffect, useState } from 'react'
import { getUsers, createUser, updateUser, deleteUser } from '../api/client'
import toast from 'react-hot-toast'
import { HiPlus, HiTrash, HiPencil, HiX, HiUser, HiShieldCheck, HiMail, HiBan } from 'react-icons/hi'

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user', is_active: true })

  const fetchUsers = () => {
    setLoading(true)
    getUsers().then(r => setUsers(r.data)).catch(() => toast.error('Failed to load users')).finally(() => setLoading(false))
  }

  useEffect(() => { fetchUsers() }, [])

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) { toast.error('Name, email and password required'); return }
    try { await createUser(form); toast.success('User created'); setShowNew(false); setForm({ name: '', email: '', password: '', role: 'user', is_active: true }); fetchUsers() }
    catch (e) { toast.error(e.response?.data?.detail || 'Failed to create') }
  }

  const handleEdit = (e, user) => {
    e.stopPropagation()
    setEditUser(user)
    setForm({ name: user.name, email: user.email, password: '', role: user.role || 'user', is_active: user.is_active })
  }

  const handleEditSave = async () => {
    const payload = { name: form.name, email: form.email, role: form.role, is_active: form.is_active }
    if (form.password.trim()) payload.password = form.password
    try { await updateUser(editUser.id, payload); toast.success('User updated'); setEditUser(null); fetchUsers() }
    catch (e) { toast.error(e.response?.data?.detail || 'Failed to update') }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Delete this user?')) return
    try { await deleteUser(id); toast.success('User deleted'); fetchUsers(); if (selectedUser?.id === id) setSelectedUser(null) }
    catch { toast.error('Failed to delete') }
  }

  const renderModal = (title, onSave, onCancel, isEdit = false) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded-lg"><HiX className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-field" placeholder="Full name" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input-field" placeholder="Email address" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">{isEdit ? 'New Password (leave blank to keep)' : 'Password'}</label>
            <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="input-field" placeholder={isEdit ? 'Leave blank to keep current' : 'Password'} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="input-field">
              <option value="user">User</option><option value="admin">Admin</option><option value="editor">Editor</option><option value="viewer">Viewer</option>
            </select></div>
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

  const roleColors = { admin: 'bg-red-100 text-red-700', editor: 'bg-blue-100 text-blue-700', user: 'bg-gray-100 text-gray-700', viewer: 'bg-green-100 text-green-700' }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm mt-1">{users.length} registered users</p>
        </div>
        <button onClick={() => { setShowNew(true); setForm({ name: '', email: '', password: '', role: 'user', is_active: true }) }} className="btn-primary flex items-center gap-2">
          <HiPlus className="w-5 h-5" /> New User
        </button>
      </div>

      {showNew && renderModal('New User', handleCreate, () => setShowNew(false))}
      {editUser && renderModal('Edit User', handleEditSave, () => setEditUser(null), true)}

      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">User Detail</h2>
              <button onClick={() => setSelectedUser(null)} className="p-1 hover:bg-gray-100 rounded-lg"><HiX className="w-5 h-5" /></button>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {selectedUser.name?.charAt(0) || 'U'}
              </div>
              <div>
                <h3 className="text-lg font-semibold">{selectedUser.name}</h3>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div><p className="text-xs text-gray-500 uppercase tracking-wider">Role</p><p className="font-medium capitalize">{selectedUser.role || 'user'}</p></div>
              <div><p className="text-xs text-gray-500 uppercase tracking-wider">Status</p>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${selectedUser.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {selectedUser.is_active ? 'Active' : 'Inactive'}
                </span></div>
              <div><p className="text-xs text-gray-500 uppercase tracking-wider">Joined</p><p className="text-sm">{new Date(selectedUser.created_at).toLocaleString()}</p></div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button onClick={e => { setSelectedUser(null); handleEdit(e, selectedUser) }} className="btn-secondary text-sm"><HiPencil className="w-4 h-4 inline mr-1" /> Edit</button>
              <button onClick={e => { handleDelete(e, selectedUser.id); setSelectedUser(null) }} className="btn-danger text-sm"><HiTrash className="w-4 h-4 inline mr-1" /> Delete</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[...Array(8)].map((_, i) => <div key={i} className="card animate-pulse h-16"></div>)}</div>
      ) : users.length === 0 ? (
        <div className="card text-center py-12">
          <HiUser className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No users yet</h3>
          <p className="text-gray-500 mb-4">Create user accounts to get started</p>
          <button onClick={() => setShowNew(true)} className="btn-primary"><HiPlus className="w-5 h-5 inline mr-2" /> New User</button>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} onClick={() => setSelectedUser(u)}
              className="card hover:shadow-md transition-all cursor-pointer flex items-center justify-between group">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                  {u.name?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 truncate">{u.name}</h3>
                    {u.role === 'admin' && <HiShieldCheck className="w-4 h-4 text-red-500 flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500 flex items-center gap-1"><HiMail className="w-3 h-3" /> {u.email}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${roleColors[u.role] || roleColors.user}`}>{u.role || 'user'}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                <button onClick={e => handleEdit(e, u)} className="p-2 hover:bg-indigo-50 rounded-lg text-gray-400 hover:text-indigo-600 transition-colors"><HiPencil className="w-4 h-4" /></button>
                <button onClick={e => handleDelete(e, u.id)} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"><HiTrash className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
