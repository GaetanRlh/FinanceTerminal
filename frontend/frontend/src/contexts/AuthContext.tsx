import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { setAuthToken } from '../services/api'

type AuthContextValue = {
  isAuthenticated: boolean
  accessToken: string | null
  login: (tokens: { access: string; refresh: string }) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

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
    setAccessToken(tokens.access)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access)
      window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh)
    }
  }

  const logout = () => {
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

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}

