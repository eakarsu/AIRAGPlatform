import { NavLink, useNavigate } from 'react-router-dom'
import { HiHome, HiDocument, HiChat, HiDatabase, HiClipboardList, HiSearch, HiChartBar, HiLogout, HiTag, HiTemplate, HiClock, HiStar, HiUserGroup, HiCog } from 'react-icons/hi'

const navItems = [
  { path: '/', icon: HiHome, label: 'Dashboard' },
  { path: '/documents', icon: HiDocument, label: 'Documents' },
  { path: '/chat', icon: HiChat, label: 'AI Chat' },
  { path: '/knowledge', icon: HiDatabase, label: 'Knowledge Base' },
  { path: '/summaries', icon: HiClipboardList, label: 'AI Summaries' },
  { path: '/search', icon: HiSearch, label: 'Smart Search' },
  { path: '/analytics', icon: HiChartBar, label: 'Analytics' },
  { path: '/tags', icon: HiTag, label: 'Tags' },
  { path: '/prompts', icon: HiTemplate, label: 'Prompt Templates' },
  { path: '/activity', icon: HiClock, label: 'Activity Log' },
  { path: '/favorites', icon: HiStar, label: 'Favorites' },
  { path: '/users', icon: HiUserGroup, label: 'Users' },
  { path: '/settings', icon: HiCog, label: 'Settings' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
            AI
          </div>
          <div>
            <h1 className="font-bold text-gray-900">RAG Platform</h1>
            <p className="text-xs text-gray-500">Knowledge Base AI</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User Info + Logout */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {user.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user.name || 'User'}</p>
            <p className="text-xs text-gray-500 truncate">{user.email || ''}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all"
        >
          <HiLogout className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
