import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(() => {
    try {
      const s = localStorage.getItem('user')
      return s ? JSON.parse(s) : null
    } catch { return null }
  })
  const [loading, setLoading] = useState(false)

  const login = async (username, password) => {
    const response = await api.post('/auth/login/', { username, password })
    const { access, refresh, user } = response.data
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
    localStorage.setItem('user', JSON.stringify(user))
    setUser(user)
    return user
  }

  const setAuthUser = (userObj) => {
    if (!userObj) return
    localStorage.setItem('user', JSON.stringify(userObj))
    setUser(userObj)
  }

  const logout = async () => {
    try {
      const refresh = localStorage.getItem('refresh_token')
      await api.post('/auth/logout/', { refresh })
    } catch {}
    localStorage.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, setAuthUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)