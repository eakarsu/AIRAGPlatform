import { NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { HiHome, HiDocument, HiChat, HiDatabase, HiClipboardList, HiSearch, HiChartBar, HiLogout, HiTag, HiTemplate, HiClock, HiStar, HiUserGroup, HiCog, HiOfficeBuilding, HiChevronDown, HiViewGrid, HiSparkles, HiShieldCheck, HiTerminal } from 'react-icons/hi'
import { getWorkspaces } from '../api/client'

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
  { path: '/workspaces', icon: HiOfficeBuilding, label: 'Workspaces' },
  { path: '/users', icon: HiUserGroup, label: 'Users' },
  { path: '/settings', icon: HiCog, label: 'Settings' },
  { path: '/custom-views', icon: HiViewGrid, label: 'RAG Views' },
  { path: '/ai-hub', icon: HiSparkles, label: 'AI Hub' },
  { path: '/platform-ops', icon: HiShieldCheck, label: 'Platform Ops' },
  { path: '/system-chat', icon: HiTerminal, label: 'System Chat' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [workspaces, setWorkspaces] = useState([])
  const [activeWorkspace, setActiveWorkspace] = useState(null)
  const [showWsDropdown, setShowWsDropdown] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    getWorkspaces()
      .then(res => {
        setWorkspaces(res.data || [])
        if (res.data?.length > 0 && !activeWorkspace) {
          setActiveWorkspace(res.data[0])
        }
      })
      .catch(() => {})
  }, [])

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

      {/* Workspace Selector */}
      {workspaces.length > 0 && (
        <div className="px-3 py-2 border-b border-gray-100 relative">
          <button
            onClick={() => setShowWsDropdown(!showWsDropdown)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 text-sm transition-colors"
          >
            <div className="w-6 h-6 bg-gradient-to-br from-indigo-400 to-purple-500 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {activeWorkspace?.name?.[0]?.toUpperCase() || 'W'}
            </div>
            <span className="flex-1 text-left text-gray-700 truncate font-medium text-xs">
              {activeWorkspace?.name || 'Select Workspace'}
            </span>
            <HiChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
          </button>
          {showWsDropdown && (
            <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
              {workspaces.map(ws => (
                <button
                  key={ws.id}
                  onClick={() => { setActiveWorkspace(ws); setShowWsDropdown(false) }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${activeWorkspace?.id === ws.id ? 'text-indigo-700 bg-indigo-50' : 'text-gray-700'}`}
                >
                  {ws.name}
                  <span className="text-gray-400 ml-1">({ws.member_count} members)</span>
                </button>
              ))}
              <button
                onClick={() => { navigate('/workspaces'); setShowWsDropdown(false) }}
                className="w-full text-left px-3 py-2 text-xs text-indigo-600 hover:bg-indigo-50 border-t border-gray-100 transition-colors"
              >
                + Manage Workspaces
              </button>
            </div>
          )}
        </div>
      )}

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
