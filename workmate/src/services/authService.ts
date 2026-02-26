import supabase, { isSupabaseConfigured } from './supabaseClient'

export async function signIn(email: string, password: string) {
  if (!isSupabaseConfigured() || !supabase) {
    // Demo mode - store in localStorage
    localStorage.setItem('workmate_demo_user', JSON.stringify({
      id: 'demo-user',
      email,
      user_metadata: { voornaam: 'Demo', achternaam: 'Gebruiker' }
    }))
    return { user: { id: 'demo-user', email, user_metadata: { voornaam: 'Demo', achternaam: 'Gebruiker' } }, session: { access_token: 'demo' } }
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  const user = data.user ? { id: data.user.id, email: data.user.email ?? '', user_metadata: (data.user.user_metadata ?? {}) as Record<string, string> } : null
  return { user, session: data.session ? { access_token: data.session.access_token, user: user ?? undefined } : null }
}

export async function signUp(email: string, password: string, metadata?: { voornaam?: string; achternaam?: string }) {
  if (!isSupabaseConfigured() || !supabase) {
    const user = { id: 'demo-user', email, user_metadata: metadata || {} }
    localStorage.setItem('workmate_demo_user', JSON.stringify(user))
    return { user, session: { access_token: 'demo' } }
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata }
  })
  if (error) throw error
  const user = data.user ? { id: data.user.id, email: data.user.email ?? '', user_metadata: (data.user.user_metadata ?? {}) as Record<string, string> } : null
  return { user, session: data.session ? { access_token: data.session.access_token, user: user ?? undefined } : null }
}

export async function signOut() {
  if (!isSupabaseConfigured() || !supabase) {
    localStorage.removeItem('workmate_demo_user')
    return
  }
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  if (!isSupabaseConfigured() || !supabase) {
    const user = localStorage.getItem('workmate_demo_user')
    if (user) {
      return { session: { access_token: 'demo', user: JSON.parse(user) }, user: JSON.parse(user) }
    }
    return { session: null, user: null }
  }
  const { data } = await supabase.auth.getSession()
  const user = data.session?.user ? { id: data.session.user.id, email: data.session.user.email ?? '', user_metadata: (data.session.user.user_metadata ?? {}) as Record<string, string> } : null
  return { session: data.session ? { access_token: data.session.access_token, user: user ?? undefined } : null, user }
}

export async function resetPassword(email: string) {
  if (!isSupabaseConfigured() || !supabase) {
    return // Demo mode - no-op
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  if (error) throw error
}

export interface AuthSession {
  access_token: string
  user?: {
    id: string
    email: string
    user_metadata?: Record<string, string>
  }
}

export function onAuthStateChange(callback: (event: string, session: AuthSession | null) => void) {
  if (!isSupabaseConfigured() || !supabase) {
    // Demo mode - check localStorage
    const user = localStorage.getItem('workmate_demo_user')
    if (user) {
      callback('SIGNED_IN', { access_token: 'demo', user: JSON.parse(user) })
    }
    return { data: { subscription: { unsubscribe: () => {} } } }
  }
  return supabase.auth.onAuthStateChange((event, session) => {
    const mapped: AuthSession | null = session ? {
      access_token: session.access_token,
      user: session.user ? { id: session.user.id, email: session.user.email ?? '', user_metadata: (session.user.user_metadata ?? {}) as Record<string, string> } : undefined
    } : null
    callback(event, mapped)
  })
}
