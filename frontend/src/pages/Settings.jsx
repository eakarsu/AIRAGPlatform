import { useEffect, useState } from 'react'
import { getSettings, updateSettings, changePassword } from '../api/client'
import toast from 'react-hot-toast'
import { HiCog, HiKey, HiUser, HiBell, HiColorSwatch, HiGlobe } from 'react-icons/hi'

export default function Settings() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')
  const [profileForm, setProfileForm] = useState({ name: '', email: '' })
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [prefsForm, setPrefsForm] = useState({ theme: 'light', language: 'en', notifications_enabled: true, default_model: 'anthropic/claude-haiku-4.5' })

  useEffect(() => {
    setLoading(true)
    getSettings()
      .then(r => {
        setSettings(r.data)
        setProfileForm({ name: r.data.name || '', email: r.data.email || '' })
        setPrefsForm({
          theme: r.data.theme || 'light',
          language: r.data.language || 'en',
          notifications_enabled: r.data.notifications_enabled !== false,
          default_model: r.data.default_model || 'anthropic/claude-haiku-4.5',
        })
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false))
  }, [])

  const handleProfileSave = async () => {
    try {
      await updateSettings(profileForm)
      toast.success('Profile updated')
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      localStorage.setItem('user', JSON.stringify({ ...user, name: profileForm.name, email: profileForm.email }))
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to update') }
  }

  const handlePasswordChange = async () => {
    if (!passwordForm.current_password || !passwordForm.new_password) { toast.error('Fill in all password fields'); return }
    if (passwordForm.new_password !== passwordForm.confirm_password) { toast.error('Passwords do not match'); return }
    if (passwordForm.new_password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    try {
      await changePassword({ current_password: passwordForm.current_password, new_password: passwordForm.new_password })
      toast.success('Password changed successfully')
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to change password') }
  }

  const handlePrefsSave = async () => {
    try { await updateSettings(prefsForm); toast.success('Preferences saved') }
    catch { toast.error('Failed to save preferences') }
  }

  const tabs = [
    { id: 'profile', icon: HiUser, label: 'Profile' },
    { id: 'password', icon: HiKey, label: 'Password' },
    { id: 'preferences', icon: HiColorSwatch, label: 'Preferences' },
  ]

  if (loading) {
    return (
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
        <div className="card animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-100 rounded"></div>
          <div className="h-10 bg-gray-100 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account and preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Tabs */}
        <div className="w-48 flex-shrink-0">
          <div className="space-y-1">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                <tab.icon className="w-5 h-5" /> {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                  <input value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input type="email" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} className="input-field" />
                </div>
                {settings && (
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-400">Account created: {new Date(settings.created_at).toLocaleString()}</p>
                    <p className="text-xs text-gray-400 mt-1">Role: <span className="capitalize font-medium">{settings.role || 'user'}</span></p>
                  </div>
                )}
                <button onClick={handleProfileSave} className="btn-primary">Save Profile</button>
              </div>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Change Password</h2>
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                  <input type="password" value={passwordForm.current_password} onChange={e => setPasswordForm({...passwordForm, current_password: e.target.value})} className="input-field" placeholder="Enter current password" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input type="password" value={passwordForm.new_password} onChange={e => setPasswordForm({...passwordForm, new_password: e.target.value})} className="input-field" placeholder="Enter new password" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <input type="password" value={passwordForm.confirm_password} onChange={e => setPasswordForm({...passwordForm, confirm_password: e.target.value})} className="input-field" placeholder="Confirm new password" />
                </div>
                <button onClick={handlePasswordChange} className="btn-primary">Change Password</button>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Preferences</h2>
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
                  <select value={prefsForm.theme} onChange={e => setPrefsForm({...prefsForm, theme: e.target.value})} className="input-field">
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                  <select value={prefsForm.language} onChange={e => setPrefsForm({...prefsForm, language: e.target.value})} className="input-field">
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="tr">Turkish</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default AI Model</label>
                  <select value={prefsForm.default_model} onChange={e => setPrefsForm({...prefsForm, default_model: e.target.value})} className="input-field">
                    <option value="anthropic/claude-haiku-4.5">Claude Haiku 4.5</option>
                    <option value="anthropic/claude-sonnet-4">Claude Sonnet 4</option>
                    <option value="google/gemini-2.0-flash-001">Gemini 2.0 Flash</option>
                    <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={prefsForm.notifications_enabled} onChange={e => setPrefsForm({...prefsForm, notifications_enabled: e.target.checked})} className="w-4 h-4 text-indigo-600 rounded" />
                  <span className="text-sm text-gray-700">Enable notifications</span>
                </label>
                <button onClick={handlePrefsSave} className="btn-primary">Save Preferences</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
