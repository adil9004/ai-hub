export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function authFetch(path, options = {}) {
  const token = localStorage.getItem('auth_token')
  const isFormData = options.body instanceof FormData
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }
  const res = await fetch(`${API_URL}${path}`, { ...options, headers })
  if (res.status === 401) {
    localStorage.removeItem('auth_token')
    window.location.reload()
  }
  return res
}