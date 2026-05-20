import axios from 'axios'

const api = axios.create({
  baseURL: '/api',   // ← through Vite proxy, not direct
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    const isCustomerPage = window.location.pathname.startsWith('/customer')
    // Django Token auth for customers, Bearer JWT for staff
    config.headers.Authorization = isCustomerPage
      ? `Token ${token}`
      : `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      const isCustomerPage = window.location.pathname.startsWith('/customer')
      if (isCustomerPage) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('customer')
        window.location.href = '/customer-login'  // ← match your actual route
        return Promise.reject(error)
      }

      try {
        const refresh = localStorage.getItem('refresh_token')
        const response = await axios.post('/api/auth/refresh/', { refresh })
        localStorage.setItem('access_token', response.data.access)
        original.headers.Authorization = `Bearer ${response.data.access}`
        return api(original)
      } catch {
        localStorage.clear()
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default api