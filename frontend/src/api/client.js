import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth
export const login = (data) => api.post('/auth/login', data)
export const register = (data) => api.post('/auth/register', data)

// Documents
export const getDocuments = () => api.get('/documents/')
export const getDocument = (id) => api.get(`/documents/${id}`)
export const uploadDocument = (formData) =>
  api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
export const updateDocument = (id, data) => api.put(`/documents/${id}`, data)
export const deleteDocument = (id) => api.delete(`/documents/${id}`)

// Chat
export const sendMessage = (data) => api.post('/chat/', data)
export const getChatSessions = () => api.get('/chat/sessions')
export const createChatSession = (data) => api.post('/chat/sessions', data)
export const getChatSession = (id) => api.get(`/chat/sessions/${id}`)
export const updateChatSession = (id, data) => api.put(`/chat/sessions/${id}`, data)
export const deleteChatSession = (id) => api.delete(`/chat/sessions/${id}`)
export const getChatMessages = (sessionId) => api.get(`/chat/sessions/${sessionId}/messages`)

// Knowledge
export const getKnowledgeChunks = (documentId) =>
  api.get('/knowledge/', { params: documentId ? { document_id: documentId } : {} })
export const getKnowledgeChunk = (id) => api.get(`/knowledge/${id}`)
export const createKnowledgeChunk = (data) => api.post('/knowledge/', data)
export const updateKnowledgeChunk = (id, data) => api.put(`/knowledge/${id}`, data)
export const deleteKnowledgeChunk = (id) => api.delete(`/knowledge/${id}`)

// AI Features
export const getAISummaries = () => api.get('/ai/summaries')
export const getAISummary = (id) => api.get(`/ai/summaries/${id}`)
export const createAISummary = (data) => api.post('/ai/summaries', data)
export const updateAISummary = (id, data) => api.put(`/ai/summaries/${id}`, data)
export const deleteAISummary = (id) => api.delete(`/ai/summaries/${id}`)
export const smartSearch = (data) => api.post('/ai/search', data)
export const getAnalytics = () => api.get('/ai/analytics')

// Tags
export const getTags = () => api.get('/tags/')
export const createTag = (data) => api.post('/tags/', data)
export const updateTag = (id, data) => api.put(`/tags/${id}`, data)
export const deleteTag = (id) => api.delete(`/tags/${id}`)
export const getTagDocuments = (tagId) => api.get(`/tags/${tagId}/documents`)

// Prompt Templates
export const getPrompts = (category) => api.get('/prompts/', { params: category ? { category } : {} })
export const createPrompt = (data) => api.post('/prompts/', data)
export const updatePrompt = (id, data) => api.put(`/prompts/${id}`, data)
export const deletePrompt = (id) => api.delete(`/prompts/${id}`)

// Activity Log
export const getActivityLogs = (action) => api.get('/activity/', { params: action ? { action } : {} })
export const getActivityActions = () => api.get('/activity/actions')
export const deleteActivityLog = (id) => api.delete(`/activity/${id}`)

// Favorites
export const getFavorites = (entityType) => api.get('/favorites/', { params: entityType ? { entity_type: entityType } : {} })
export const createFavorite = (data) => api.post('/favorites/', data)
export const updateFavorite = (id, data) => api.put(`/favorites/${id}`, data)
export const deleteFavorite = (id) => api.delete(`/favorites/${id}`)

// Users
export const getUsers = () => api.get('/users/')
export const getUser = (id) => api.get(`/users/${id}`)
export const createUser = (data) => api.post('/users/', data)
export const updateUser = (id, data) => api.put(`/users/${id}`, data)
export const deleteUser = (id) => api.delete(`/users/${id}`)

// Settings
export const getSettings = () => api.get('/users/settings/me')
export const updateSettings = (data) => api.put('/users/settings/me', data)
export const changePassword = (data) => api.post('/users/settings/change-password', data)

// Workspaces
export const getWorkspaces = () => api.get('/workspaces/')
export const createWorkspace = (data) => api.post('/workspaces/', data)
export const getWorkspace = (id) => api.get(`/workspaces/${id}`)
export const updateWorkspace = (id, data) => api.put(`/workspaces/${id}`, data)
export const deleteWorkspace = (id) => api.delete(`/workspaces/${id}`)
export const getWorkspaceMembers = (id) => api.get(`/workspaces/${id}/members`)
export const inviteWorkspaceMember = (id, data) => api.post(`/workspaces/${id}/invite`, data)
export const removeWorkspaceMember = (workspaceId, userId) => api.delete(`/workspaces/${workspaceId}/members/${userId}`)

// Usage Analytics
export const getUsageAnalytics = () => api.get('/analytics/usage')

export default api
