import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { signIn, signUp, signOut, getSession, onAuthStateChange, type AuthSession } from '@/services/authService'
import { getProfile } from '@/services/supabaseService'
import type { TeamRol } from '@/types'

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
  organisatieId: string | null
  userRol: TeamRol | null
  isAdmin: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, metadata?: { voornaam?: string; achternaam?: string }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [organisatieId, setOrganisatieId] = useState<string | null>(null)
  const [userRol, setUserRol] = useState<TeamRol | null>(null)

  const fetchOrgData = async (userId: string) => {
    try {
      const profile = await getProfile(userId)
      if (profile) {
        setOrganisatieId(profile.organisatie_id || null)
        setUserRol(profile.rol || null)
      }
    } catch {
      // Silently fail — org data is not critical for auth
    }
  }

  useEffect(() => {
    // Check existing session
    getSession().then(({ session, user }) => {
      setSession(session)
      setUser(user)
      if (user?.id) {
        fetchOrgData(user.id).then(() => setIsLoading(false))
      } else {
        setIsLoading(false)
      }
    }).catch(() => setIsLoading(false))

    // Listen for auth changes
    const { data } = onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user || null)
      if (session?.user?.id) {
        fetchOrgData(session.user.id)
      } else {
        setOrganisatieId(null)
        setUserRol(null)
      }
      setIsLoading(false)
    })

    return () => {
      data?.subscription?.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
    const data = await signIn(email, password)
    const u = data.user
    if (u) {
      setUser({ id: u.id, email: u.email ?? email, user_metadata: u.user_metadata })
      await fetchOrgData(u.id)
    }
    setSession(data.session)
  }

  const register = async (email: string, password: string, metadata?: { voornaam?: string; achternaam?: string }) => {
    const data = await signUp(email, password, metadata)
    const u = data.user
    if (u) {
      setUser({ id: u.id, email: u.email ?? email, user_metadata: u.user_metadata })
      await fetchOrgData(u.id)
    }
    setSession(data.session)
  }

  const logout = async () => {
    try {
      await signOut()
    } finally {
      setUser(null)
      setSession(null)
      setOrganisatieId(null)
      setUserRol(null)
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isAuthenticated: !!user,
      isLoading,
      organisatieId,
      userRol,
      isAdmin: userRol === 'admin',
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
