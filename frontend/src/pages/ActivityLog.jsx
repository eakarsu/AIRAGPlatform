import { useEffect, useState } from 'react'
import { getActivityLogs, getActivityActions, deleteActivityLog } from '../api/client'
import toast from 'react-hot-toast'
import { HiTrash, HiX, HiClock, HiDocument, HiChat, HiSearch, HiUser, HiTag, HiStar, HiTemplate } from 'react-icons/hi'

const actionIcons = {
  login: HiUser, document_upload: HiDocument, document_deleted: HiDocument,
  chat_created: HiChat, summary_generated: HiTemplate, search_performed: HiSearch,
  tag_created: HiTag, favorite_added: HiStar, prompt_used: HiTemplate,
}
const actionColors = {
  login: 'bg-cyan-50 text-cyan-600', document_upload: 'bg-blue-50 text-blue-600',
  document_deleted: 'bg-red-50 text-red-600', chat_created: 'bg-purple-50 text-purple-600',
  summary_generated: 'bg-amber-50 text-amber-600', search_performed: 'bg-rose-50 text-rose-600',
  tag_created: 'bg-indigo-50 text-indigo-600', favorite_added: 'bg-yellow-50 text-yellow-600',
  prompt_used: 'bg-violet-50 text-violet-600',
}

export default function ActivityLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [actions, setActions] = useState([])
  const [filterAction, setFilterAction] = useState('')
  const [selectedLog, setSelectedLog] = useState(null)

  const fetchLogs = () => {
    setLoading(true)
    getActivityLogs(filterAction || undefined)
      .then(r => setLogs(r.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchLogs() }, [filterAction])
  useEffect(() => { getActivityActions().then(r => setActions(r.data)).catch(() => {}) }, [])

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Delete this log entry?')) return
    try { await deleteActivityLog(id); toast.success('Deleted'); fetchLogs(); if (selectedLog?.id === id) setSelectedLog(null) }
    catch { toast.error('Failed to delete') }
  }

  const formatAction = (action) => action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
          <p className="text-gray-500 text-sm mt-1">{logs.length} logged activities</p>
        </div>
      </div>

      <div className="mb-4">
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="input-field w-56">
          <option value="">All Actions</option>
          {actions.map(a => <option key={a} value={a}>{formatAction(a)}</option>)}
        </select>
      </div>

      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Activity Detail</h2>
              <button onClick={() => setSelectedLog(null)} className="p-1 hover:bg-gray-100 rounded-lg"><HiX className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div><p className="text-xs text-gray-500 uppercase tracking-wider">Action</p><p className="font-medium">{formatAction(selectedLog.action)}</p></div>
              <div><p className="text-xs text-gray-500 uppercase tracking-wider">User</p><p className="font-medium">{selectedLog.user_name || 'System'}</p></div>
              {selectedLog.entity_type && <div><p className="text-xs text-gray-500 uppercase tracking-wider">Entity Type</p><p className="font-medium capitalize">{selectedLog.entity_type}</p></div>}
              {selectedLog.entity_name && <div><p className="text-xs text-gray-500 uppercase tracking-wider">Entity</p><p className="font-medium">{selectedLog.entity_name}</p></div>}
              {selectedLog.details && <div><p className="text-xs text-gray-500 uppercase tracking-wider">Details</p><p className="text-sm text-gray-700">{selectedLog.details}</p></div>}
              <div><p className="text-xs text-gray-500 uppercase tracking-wider">Timestamp</p><p className="text-sm">{new Date(selectedLog.created_at).toLocaleString()}</p></div>
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={e => { handleDelete(e, selectedLog.id); setSelectedLog(null) }} className="btn-danger text-sm"><HiTrash className="w-4 h-4 inline mr-1" /> Delete</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[...Array(8)].map((_, i) => <div key={i} className="card animate-pulse"><div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div><div className="h-4 bg-gray-100 rounded w-1/2"></div></div>)}</div>
      ) : logs.length === 0 ? (
        <div className="card text-center py-12">
          <HiClock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No activity logged</h3>
          <p className="text-gray-500">Activity will appear here as you use the platform</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => {
            const Icon = actionIcons[log.action] || HiClock
            const colorClass = actionColors[log.action] || 'bg-gray-50 text-gray-600'
            return (
              <div key={log.id} onClick={() => setSelectedLog(log)}
                className="card hover:shadow-md transition-all cursor-pointer flex items-center justify-between group">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm">{formatAction(log.action)}</span>
                      {log.entity_name && <span className="text-sm text-gray-500 truncate">- {log.entity_name}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400">{log.user_name || 'System'}</span>
                      {log.details && <span className="text-xs text-gray-400 truncate max-w-md">{log.details}</span>}
                      <span className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <button onClick={e => handleDelete(e, log.id)} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all">
                  <HiTrash className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
