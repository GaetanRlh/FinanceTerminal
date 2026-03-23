import { createContext, useContext } from 'react'

export type AuthContextValue = {
  isAuthenticated: boolean
  accessToken: string | null
  login: (tokens: { access: string; refresh: string }) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
