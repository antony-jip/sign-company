import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Vite bakt env-vars in tijdens de build. Ontbreken ze, dan valt de hele app
// terug op de lokale demo-modus: authService maakt dan zelf een gebruiker aan
// en ProtectedRoute laat alles door. In productie betekent dat een app zonder
// inlogscherm, bereikbaar voor iedereen die het adres kent. Eén verkeerd
// gescopete variabele op Vercel is genoeg.
//
// Daarom faalt de build hier hard in plaats van stil de demo-modus te serveren.
// De demo-modus blijft bestaan voor lokaal werk zonder Supabase.
if (import.meta.env.PROD && !(supabaseUrl && supabaseAnonKey)) {
  throw new Error(
    'VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY ontbreken in een productiebuild. ' +
    'Zonder die twee draait de app in demo-modus en is er geen inlogscherm. ' +
    'Zet ze in de omgeving van deze deploy en bouw opnieuw.'
  )
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey && supabaseAnonKey !== 'your-supabase-anon-key-here')
}

export default supabase
