import { useEffect, useState } from 'react'
import { supabase } from '@/services/supabaseHelpers'
import { logger } from '@/utils/logger'

/**
 * Openbare ingang van de demo. Haalt server-side een sessietoken op, wisselt
 * dat in en laadt de app opnieuw, zodat de AuthContext gewoon opstart vanuit
 * de opgeslagen sessie in plaats van dat we hem hier half moeten vullen.
 */
export function DemoStart() {
  const [fout, setFout] = useState<string | null>(null)

  useEffect(() => {
    let afgebroken = false

    async function start() {
      try {
        const res = await fetch('/api/demo-sessie', { method: 'POST' })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || 'Demo starten mislukt')
        }
        const { token_hash, email } = await res.json()
        if (afgebroken || !supabase) return

        const { error } = await supabase.auth.verifyOtp({ token_hash, type: 'magiclink', email })
        if (error) throw error

        window.location.replace('/')
      } catch (e) {
        logger.error('Demo starten mislukt:', e)
        if (!afgebroken) setFout(e instanceof Error ? e.message : 'Demo starten mislukt')
      }
    }

    start()
    return () => { afgebroken = true }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D343C] px-6">
      <div className="max-w-md w-full text-center">
        <div className="font-heading text-[34px] font-bold tracking-[-0.03em] text-white leading-none mb-6">
          doen<span className="text-flame">.</span>
        </div>

        {fout ? (
          <>
            <p className="text-[15px] text-[rgba(226,240,241,0.82)] leading-relaxed">{fout}</p>
            <p className="text-[13px] text-[rgba(226,240,241,0.55)] mt-4">
              Bel gerust even, dan laat ik het je zelf zien. 06 29 39 93 26
            </p>
          </>
        ) : (
          <>
            <p className="text-[15px] text-[rgba(226,240,241,0.82)] leading-relaxed">
              De demo wordt klaargezet. Je kijkt zo mee in een signbedrijf van negen man.
            </p>
            <div
              className="mt-8 h-[2px] w-40 mx-auto overflow-hidden bg-[rgba(226,240,241,0.16)]"
              role="status"
              aria-label="Demo wordt geladen"
            >
              <div className="h-full w-1/3 bg-flame animate-[demo-loop_1.1s_ease-in-out_infinite]" />
            </div>
            <style>{`@keyframes demo-loop{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>
          </>
        )}
      </div>
    </div>
  )
}
