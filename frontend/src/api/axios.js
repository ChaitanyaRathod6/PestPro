import axios from 'axios'

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      // ── If this is a customer page, don't try JWT refresh ──
      const isCustomerPage = window.location.pathname.startsWith('/customer')
      if (isCustomerPage) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('customer')
        window.location.href = '/customer/login'
        return Promise.reject(error)
      }

      // ── Staff JWT refresh (only for staff pages) ──
      try {
        const refresh = localStorage.getItem('refresh_token')
        const response = await axios.post(
          'http://127.0.0.1:8000/auth/refresh/',
          { refresh }
        )
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