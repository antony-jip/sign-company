import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Hook for portaal reminder status.
 *
 * Reminders are now handled by Trigger.dev cron job (portaal-herinnering-cron).
 * This hook only queries the portaal_activiteiten table for UI display.
 */
export function usePortaalHerinnering() {
  const { user } = useAuth()
  const hasRun = useRef(false)
  const [laatsteHerinnering, setLaatsteHerinnering] = useState<string | null>(null)

  useEffect(() => {
    if (hasRun.current || !user?.id) return
    hasRun.current = true

    // Query latest reminder activity for UI display
    async function fetchLaatste() {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
        if (!supabaseUrl || !supabaseKey) return

        const supabase = createClient(supabaseUrl, supabaseKey)
        const { data } = await supabase
          .from('portaal_activiteiten')
          .select('created_at')
          .eq('actie', 'herinnering_verstuurd')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (data?.created_at) {
          setLaatsteHerinnering(data.created_at)
        }
      } catch (err) {
        // Table may not exist yet — ignore
      }
    }

    fetchLaatste()
  }, [user?.id])

  return { laatsteHerinnering }
}
