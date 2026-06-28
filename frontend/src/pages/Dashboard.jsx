import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HiDocument, HiChat, HiDatabase, HiClipboardList, HiSearch, HiChartBar, HiTag, HiTemplate, HiClock, HiStar, HiUserGroup, HiCog, HiSparkles } from 'react-icons/hi'
import { getAnalytics } from '../api/client'

const features = [
  {
    path: '/ai-hub',
    icon: HiSparkles,
    title: 'AI Hub',
    description: 'Open every custom RAG AI workflow, gap-analysis tool, provenance feature, and source discovery assistant.',
    color: 'from-fuchsia-500 to-purple-600',
    bgColor: 'bg-fuchsia-50',
    textColor: 'text-fuchsia-600',
    countKey: null,
  },
  {
    path: '/documents',
    icon: HiDocument,
    title: 'Documents',
    description: 'Upload, manage, and organize your document library. Support for PDF, DOCX, TXT, and MD files.',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    countKey: 'total_documents',
  },
  {
    path: '/chat',
    icon: HiChat,
    title: 'AI Chat',
    description: 'Have intelligent conversations powered by AI. Ask questions about your documents with RAG context.',
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-600',
    countKey: 'total_sessions',
  },
  {
    path: '/knowledge',
    icon: HiDatabase,
    title: 'Knowledge Base',
    description: 'Browse and manage document chunks. View extracted knowledge from your uploaded documents.',
    color: 'from-emerald-500 to-emerald-600',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-600',
    countKey: 'total_chunks',
  },
  {
    path: '/summaries',
    icon: HiClipboardList,
    title: 'AI Summaries',
    description: 'Generate AI-powered summaries of your documents. Get key insights at a glance.',
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-600',
    countKey: 'total_summaries',
  },
  {
    path: '/search',
    icon: HiSearch,
    title: 'Smart Search',
    description: 'Semantic search across all documents. Find relevant information with AI-enhanced results.',
    color: 'from-rose-500 to-pink-500',
    bgColor: 'bg-rose-50',
    textColor: 'text-rose-600',
    countKey: null,
  },
  {
    path: '/analytics',
    icon: HiChartBar,
    title: 'Analytics',
    description: 'View platform statistics, usage metrics, and activity summaries across all features.',
    color: 'from-cyan-500 to-teal-500',
    bgColor: 'bg-cyan-50',
    textColor: 'text-cyan-600',
    countKey: null,
  },
  {
    path: '/tags',
    icon: HiTag,
    title: 'Tags',
    description: 'Create and manage tags to organize your documents. Color-coded labels for easy categorization.',
    color: 'from-indigo-500 to-indigo-600',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-600',
    countKey: 'total_tags',
  },
  {
    path: '/prompts',
    icon: HiTemplate,
    title: 'Prompt Templates',
    description: 'Create reusable AI prompt templates. Use them in chat sessions for consistent results.',
    color: 'from-violet-500 to-violet-600',
    bgColor: 'bg-violet-50',
    textColor: 'text-violet-600',
    countKey: 'total_templates',
  },
  {
    path: '/activity',
    icon: HiClock,
    title: 'Activity Log',
    description: 'Track all platform activity. Monitor document uploads, chat sessions, and user actions.',
    color: 'from-slate-500 to-slate-600',
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-600',
    countKey: 'total_activities',
  },
  {
    path: '/favorites',
    icon: HiStar,
    title: 'Favorites',
    description: 'Bookmark your important documents, chat sessions, and summaries for quick access.',
    color: 'from-yellow-500 to-yellow-600',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-600',
    countKey: 'total_favorites',
  },
  {
    path: '/users',
    icon: HiUserGroup,
    title: 'User Management',
    description: 'Manage user accounts, roles, and permissions. Create and administer platform users.',
    color: 'from-pink-500 to-pink-600',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-600',
    countKey: null,
  },
  {
    path: '/settings',
    icon: HiCog,
    title: 'Settings',
    description: 'Configure your account profile, change password, and customize platform preferences.',
    color: 'from-gray-500 to-gray-600',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-600',
    countKey: null,
  },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const [analytics, setAnalytics] = useState(null)
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  useEffect(() => {
    getAnalytics().then(res => setAnalytics(res.data)).catch(() => {})
  }, [])

  return (
    <div className="animate-fade-in">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user.name || 'User'}!
        </h1>
        <p className="text-gray-500 mt-1">Manage your AI-powered document knowledge base</p>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => (
          <button
            key={feature.path}
            onClick={() => navigate(feature.path)}
            className="card hover:shadow-lg hover:-translate-y-1 transition-all duration-200 text-left group cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 ${feature.bgColor} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <feature.icon className={`w-6 h-6 ${feature.textColor}`} />
              </div>
              {feature.countKey && analytics && (
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${feature.bgColor} ${feature.textColor}`}>
                  {analytics[feature.countKey] || 0}
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
            <div className={`mt-4 inline-flex items-center text-sm font-medium ${feature.textColor}`}>
              Open {feature.title}
              <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>

      {/* Quick Stats */}
      {analytics && (
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Documents', value: analytics.total_documents, color: 'text-blue-600' },
            { label: 'Chat Sessions', value: analytics.total_sessions, color: 'text-purple-600' },
            { label: 'Knowledge Chunks', value: analytics.total_chunks, color: 'text-emerald-600' },
            { label: 'AI Summaries', value: analytics.total_summaries, color: 'text-amber-600' },
            { label: 'Tags', value: analytics.total_tags, color: 'text-indigo-600' },
            { label: 'Templates', value: analytics.total_templates, color: 'text-violet-600' },
            { label: 'Activities', value: analytics.total_activities, color: 'text-slate-600' },
            { label: 'Favorites', value: analytics.total_favorites, color: 'text-yellow-600' },
          ].map(stat => (
            <div key={stat.label} className="card text-center">
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
