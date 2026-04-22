import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { signIn, signUp, signOut, getSession, onAuthStateChange, type AuthSession } from '@/services/authService'
import { getProfile, updateProfile, createOrganisatie, getOrganisatie, createMedewerker } from '@/services/supabaseService'
import { isSupabaseConfigured } from '@/services/supabaseClient'
import type { TeamRol, Organisatie } from '@/types'
import { logger } from '@/utils/logger'

interface User {
  id: string
  email: string
  user_metadata?: {
    voornaam?: string
    achternaam?: string
  }
}

type TrialStatus = 'trial' | 'actief' | 'verlopen' | 'opgezegd'

interface AuthContextType {
  user: User | null
  session: AuthSession | null
  isAuthenticated: boolean
  isLoading: boolean
  organisatieId: string | null
  userRol: TeamRol | null
  isAdmin: boolean
  organisatie: Organisatie | null
  trialDagenOver: number
  trialStatus: TrialStatus
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, metadata?: { voornaam?: string; achternaam?: string }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TRULY_PUBLIC_ROUTES = [
  '/login', '/register', '/registreren', '/check-inbox',
  '/wachtwoord-vergeten', '/wachtwoord-resetten',
  '/goedkeuring/', '/boeken/', '/betalen/',
  '/offerte-bekijken/', '/formulier/', '/portaal/',
]
const ONBOARDING_ROUTES = ['/welkom', '/team-welkom', '/onboarding']

function isTrulyPublic(pathname: string): boolean {
  return TRULY_PUBLIC_ROUTES.some((r) => pathname.startsWith(r))
}

function isOnboardingRoute(pathname: string): boolean {
  return ONBOARDING_ROUTES.some((r) => pathname.startsWith(r))
}

const inFlightRedirects = new Set<string>()

function computeTrialDagenOver(trialEinde?: string): number {
  if (!trialEinde) return 30
  const einde = new Date(trialEinde)
  const nu = new Date()
  const diff = einde.getTime() - nu.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [organisatieId, setOrganisatieId] = useState<string | null>(null)
  const [userRol, setUserRol] = useState<TeamRol | null>(null)
  const [organisatie, setOrganisatie] = useState<Organisatie | null>(null)
  const [trialDagenOver, setTrialDagenOver] = useState(30)
  const [trialStatus, setTrialStatus] = useState<TrialStatus>('trial')

  let navigate: ReturnType<typeof useNavigate> | null = null
  let location: ReturnType<typeof useLocation> | null = null
  try {
    navigate = useNavigate()
    location = useLocation()
  } catch (err) {
    // Outside router context — skip navigation
  }

  const triggerOnboarding = (accessToken: string) => {
    fetch('/api/trigger-onboarding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    })
      .then(res => { if (!res.ok) console.warn('[onboarding-trigger] HTTP', res.status) })
      .catch(err => console.warn('[onboarding-trigger]', err.message))
  }

  const handleOnboardingRedirect = async (userId: string, currentPath: string, accessToken?: string) => {
    if (isTrulyPublic(currentPath)) return
    if (inFlightRedirects.has(userId)) return
    inFlightRedirects.add(userId)

    if (!isSupabaseConfigured()) {
      setOrganisatieId('demo-org')
      setOrganisatie({
        id: 'demo-org',
        naam: 'Demo Bedrijf',
        eigenaar_id: userId,
        abonnement_status: 'trial',
        onboarding_compleet: true,
        onboarding_stap: 4,
        created_at: new Date().toISOString(),
      })
      setTrialDagenOver(30)
      setTrialStatus('trial')
      inFlightRedirects.delete(userId)
      return
    }

    try {
      const profile = await getProfile(userId)
      if (!profile) return

      setOrganisatieId(profile.organisatie_id || null)
      setUserRol(profile.rol || null)

      if (!profile.organisatie_id) {
        // Trigger handle_new_user heeft de koppeling niet kunnen maken
        // via uitnodigingen. Dit betekent: legitieme nieuwe user zonder
        // invite → nieuwe org.
        const org = await createOrganisatie('Mijn Bedrijf', userId)
        await updateProfile(userId, { organisatie_id: org.id, rol: 'admin' } as Parameters<typeof updateProfile>[1])
        setOrganisatieId(org.id)
        setUserRol('admin')
        setOrganisatie(org)
        setTrialDagenOver(30)
        setTrialStatus('trial')
        if (accessToken) triggerOnboarding(accessToken)
        if (!isOnboardingRoute(currentPath)) navigate?.('/welkom')
      } else {
        const org = await getOrganisatie(profile.organisatie_id)
        if (org) {
          setOrganisatie(org)
          setTrialDagenOver(computeTrialDagenOver(org.trial_einde))
          setTrialStatus((org.abonnement_status as TrialStatus) || 'trial')

          if (profile.uitgenodigd_door && !profile.voornaam) {
            try {
              await createMedewerker({ naam: profile.email || 'Nieuw teamlid', email: profile.email || '', status: 'actief', user_id: userId } as Parameters<typeof createMedewerker>[0])
            } catch { /* may already exist */ }
            if (!isOnboardingRoute(currentPath)) navigate?.('/team-welkom')
          } else if (!org.onboarding_compleet) {
            if (!isOnboardingRoute(currentPath)) navigate?.('/onboarding')
          }
        }
      }
    } catch (err) {
      logger.error('Onboarding redirect failed:', err)
    } finally {
      inFlightRedirects.delete(userId)
    }
  }

  const fetchOrgData = async (userId: string) => {
    try {
      const profile = await getProfile(userId)
      if (profile) {
        setOrganisatieId(profile.organisatie_id || null)
        setUserRol(profile.rol || null)

        if (profile.organisatie_id) {
          const org = await getOrganisatie(profile.organisatie_id)
          if (org) {
            setOrganisatie(org)
            setTrialDagenOver(computeTrialDagenOver(org.trial_einde))
            setTrialStatus((org.abonnement_status as TrialStatus) || 'trial')
          }
        }
      }
    } catch (err) {
      logger.error('Fetch org data failed:', err)
    }
  }

  useEffect(() => {
    // Check existing session
    getSession().then(({ session: sess, user: u }) => {
      setSession(sess)
      setUser(u)
      if (u?.id) {
        const currentPath = location?.pathname || window.location.pathname
        handleOnboardingRedirect(u.id, currentPath, sess?.access_token).then(() => setIsLoading(false))
        // Sync email settings from server to localStorage (fire-and-forget)
        import('@/services/gmailService').then(({ syncEmailSettingsFromServer }) => {
          syncEmailSettingsFromServer().catch(() => {})
        }).catch(() => {})
      } else {
        setIsLoading(false)
      }
    }).catch(() => setIsLoading(false))

    const { data } = onAuthStateChange((event, sess) => {
      setSession(sess)
      setUser(sess?.user || null)
      if (sess?.user?.id) {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          const currentPath = window.location.pathname
          handleOnboardingRedirect(sess.user.id, currentPath, sess.access_token)
        } else {
          fetchOrgData(sess.user.id)
        }
        import('@/services/gmailService').then(({ syncEmailSettingsFromServer }) => {
          syncEmailSettingsFromServer().catch(() => {})
        }).catch(() => {})
      } else {
        setOrganisatieId(null)
        setUserRol(null)
        setOrganisatie(null)
      }
      setIsLoading(false)
    })

    return () => {
      data?.subscription?.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = async (email: string, password: string) => {
    const data = await signIn(email, password)
    const u = data.user
    if (u) {
      setUser({ id: u.id, email: u.email ?? email, user_metadata: u.user_metadata })
      await handleOnboardingRedirect(u.id, location?.pathname || '/', data.session?.access_token)
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
      setOrganisatie(null)
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
      organisatie,
      trialDagenOver,
      trialStatus,
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
