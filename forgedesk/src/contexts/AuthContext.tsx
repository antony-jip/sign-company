import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { signIn, signUp, signOut, getSession, onAuthStateChange, type AuthSession } from '@/services/authService'

interface User {
  id: string
  email: string
  user_metadata?: {
    voornaam?: string
    achternaam?: string
  }
}

interface AuthContextType {
  user: User | null
  session: AuthSession | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, metadata?: { voornaam?: string; achternaam?: string }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check existing session
    getSession().then(({ session, user }) => {
      setSession(session)
      setUser(user)
      setIsLoading(false)
    }).catch(() => setIsLoading(false))

    // Listen for auth changes
    const { data } = onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user || null)
      setIsLoading(false)
    })

    return () => {
      data?.subscription?.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
    const data = await signIn(email, password)
    const u = data.user
    if (u) setUser({ id: u.id, email: u.email ?? email, user_metadata: u.user_metadata })
    setSession(data.session)
  }

  const register = async (email: string, password: string, metadata?: { voornaam?: string; achternaam?: string }) => {
    const data = await signUp(email, password, metadata)
    const u = data.user
    if (u) setUser({ id: u.id, email: u.email ?? email, user_metadata: u.user_metadata })
    setSession(data.session)
  }

  const logout = async () => {
    try {
      await signOut()
    } finally {
      setUser(null)
      setSession(null)
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
