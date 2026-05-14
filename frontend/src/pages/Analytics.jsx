import { useEffect, useState } from 'react'
import { getAnalytics, getUsageAnalytics } from '../api/client'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { HiDocument, HiChat, HiDatabase, HiClipboardList, HiUsers, HiMail, HiTag, HiTemplate, HiClock, HiStar, HiChartBar } from 'react-icons/hi'

export default function Analytics() {
  const [data, setData] = useState(null)
  const [usage, setUsage] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      getAnalytics().then(res => setData(res.data)),
      getUsageAnalytics().then(res => setUsage(res.data)).catch(() => {}),
    ])
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 bg-gray-200 rounded w-1/3"></div>
      <div className="grid grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-xl"></div>)}
      </div>
    </div>
  )

  if (!data) return null

  const stats = [
    { label: 'Total Documents', value: data.total_documents, icon: HiDocument, bg: 'bg-blue-50', text: 'text-blue-600' },
    { label: 'Knowledge Chunks', value: data.total_chunks, icon: HiDatabase, bg: 'bg-emerald-50', text: 'text-emerald-600' },
    { label: 'Chat Sessions', value: data.total_sessions, icon: HiChat, bg: 'bg-purple-50', text: 'text-purple-600' },
    { label: 'Chat Messages', value: data.total_messages, icon: HiMail, bg: 'bg-pink-50', text: 'text-pink-600' },
    { label: 'AI Summaries', value: data.total_summaries, icon: HiClipboardList, bg: 'bg-amber-50', text: 'text-amber-600' },
    { label: 'Registered Users', value: data.total_users, icon: HiUsers, bg: 'bg-cyan-50', text: 'text-cyan-600' },
    { label: 'Tags', value: data.total_tags, icon: HiTag, bg: 'bg-indigo-50', text: 'text-indigo-600' },
    { label: 'Templates', value: data.total_templates, icon: HiTemplate, bg: 'bg-violet-50', text: 'text-violet-600' },
    { label: 'Activities', value: data.total_activities, icon: HiClock, bg: 'bg-slate-50', text: 'text-slate-600' },
    { label: 'Favorites', value: data.total_favorites, icon: HiStar, bg: 'bg-yellow-50', text: 'text-yellow-600' },
  ]

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Platform statistics and usage metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="card flex items-center gap-4">
            <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center`}>
              <stat.icon className={`w-6 h-6 ${stat.text}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${stat.text}`}>{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Usage Analytics */}
      {usage && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <HiChartBar className="w-5 h-5 text-indigo-500" /> Document Event Analytics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-indigo-50 rounded-lg">
              <p className="text-2xl font-bold text-indigo-700">{usage.total_events}</p>
              <p className="text-xs text-indigo-600">Total Events</p>
            </div>
            {Object.entries(usage.events_by_type || {}).map(([type, count]) => (
              <div key={type} className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-700">{count}</p>
                <p className="text-xs text-gray-500 capitalize">{type}</p>
              </div>
            ))}
          </div>
          {usage.top_documents?.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Most Accessed Documents</h3>
              <div className="space-y-2">
                {usage.top_documents.map((d, i) => (
                  <div key={d.document_id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 flex items-center justify-center bg-indigo-100 text-indigo-700 rounded text-xs font-bold">{i + 1}</span>
                      <span className="text-gray-700 truncate max-w-xs">{d.document_title}</span>
                    </span>
                    <span className="text-gray-500 text-xs">{d.event_count} events</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Documents</h2>
          {data.recent_documents.length === 0 ? (
            <p className="text-gray-500 text-sm">No documents yet</p>
          ) : (
            <div className="space-y-3">
              {data.recent_documents.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => navigate(`/documents/${doc.id}`)}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <HiDocument className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                    <p className="text-xs text-gray-400">{doc.file_type.toUpperCase()} &middot; {new Date(doc.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Chat Sessions</h2>
          {data.recent_sessions.length === 0 ? (
            <p className="text-gray-500 text-sm">No sessions yet</p>
          ) : (
            <div className="space-y-3">
              {data.recent_sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => navigate(`/chat/${session.id}`)}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <HiChat className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{session.title}</p>
                    <p className="text-xs text-gray-400">{session.message_count || 0} messages &middot; {new Date(session.updated_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
