import { useEffect, useState, type ReactNode } from 'react'
import { setAuthToken } from '../services/api'
import { AuthContext, type AuthContextValue } from './useAuth'

type AuthProviderProps = {
  children: ReactNode
}

const ACCESS_TOKEN_KEY = 'rt_access_token'
const REFRESH_TOKEN_KEY = 'rt_refresh_token'

export function AuthProvider({ children }: AuthProviderProps) {
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(ACCESS_TOKEN_KEY)
  })

  useEffect(() => {
    setAuthToken(accessToken)
  }, [accessToken])

  const login = (tokens: { access: string; refresh: string }) => {
    setAuthToken(tokens.access)
    setAccessToken(tokens.access)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access)
      window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh)
    }
  }

  const logout = () => {
    setAuthToken(null)
    setAccessToken(null)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY)
      window.localStorage.removeItem(REFRESH_TOKEN_KEY)
    }
  }

  const value: AuthContextValue = {
    isAuthenticated: Boolean(accessToken),
    accessToken,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

