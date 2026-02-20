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
  return data
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
  return data
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
  return { session: data.session, user: data.session?.user || null }
}

export async function resetPassword(email: string) {
  if (!isSupabaseConfigured() || !supabase) {
    return // Demo mode - no-op
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  if (error) throw error
}

export function onAuthStateChange(callback: (event: string, session: any) => void) {
  if (!isSupabaseConfigured() || !supabase) {
    // Demo mode - check localStorage
    const user = localStorage.getItem('workmate_demo_user')
    if (user) {
      callback('SIGNED_IN', { access_token: 'demo', user: JSON.parse(user) })
    }
    return { data: { subscription: { unsubscribe: () => {} } } }
  }
  return supabase.auth.onAuthStateChange(callback)
}
