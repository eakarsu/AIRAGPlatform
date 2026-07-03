const configuredApiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

export const API_BASE_URL = configuredApiUrl || (import.meta.env.DEV ? 'http://localhost:8050/api' : '/api')

const API_ORIGIN = API_BASE_URL.endsWith('/api') ? API_BASE_URL.slice(0, -4) : API_BASE_URL

export function apiUrl(path) {
  if (!path) return API_BASE_URL
  if (/^https?:\/\//i.test(path)) return path
  if (path.startsWith('/api/')) return `${API_ORIGIN}${path}`
  if (path.startsWith('/')) return `${API_BASE_URL}${path}`
  return `${API_BASE_URL}/${path}`
}
