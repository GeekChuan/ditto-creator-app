import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { authApi, clearAuth, getRefreshToken, getStoredUser, setAuth } from '../api/auth'
import type { UserInfo } from '../types/user'

interface AuthContextValue {
  user: UserInfo | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshMe: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(getStoredUser())
  const [loading, setLoading] = useState(true)

  const refreshMe = async () => {
    try {
      const me = await authApi.me()
      setUser(me)
    } catch {
      clearAuth()
      setUser(null)
    }
  }

  useEffect(() => {
    refreshMe().finally(() => setLoading(false))
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    login: async (username: string, password: string) => {
      const res = await authApi.login({ username, password })
      setAuth(res.access_token, res.refresh_token, res.user)
      setUser(res.user)
    },
    logout: async () => {
      const refreshToken = getRefreshToken()
      if (refreshToken) {
        await authApi.logout(refreshToken).catch(() => undefined)
      }
      clearAuth()
      setUser(null)
    },
    refreshMe,
  }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
