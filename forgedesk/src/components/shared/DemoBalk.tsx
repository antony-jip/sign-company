import { useAuth } from '@/contexts/AuthContext'

/** De gedeelde demo-organisatie. Zie scripts/demo-data.cjs. */
export const DEMO_ORG_ID = '54b401d6-4f1c-41ad-8f1b-0def12c5b85d'

/**
 * Zegt tegen bezoekers van de openbare demo waar ze zijn. Belangrijk, want
 * iedereen zit in dezelfde omgeving: wat jij wijzigt ziet de volgende ook,
 * en 's nachts gaat alles terug naar de beginstand.
 */
export function DemoBalk() {
  const { organisatieId } = useAuth()
  if (organisatieId !== DEMO_ORG_ID) return null

  return (
    <div className="bg-[#0D343C] text-[rgba(226,240,241,0.9)] px-4 py-2 text-center text-[13px] font-medium flex-shrink-0 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
      <span>
        Dit is de demo van doen<span className="text-flame">.</span> Alles wat je hier doet mag,
        het gaat vannacht vanzelf terug naar de beginstand.
      </span>
      <a
        href="https://doen.team/demo-plannen"
        className="underline underline-offset-2 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame"
      >
        Liever dat ik het je zelf laat zien?
      </a>
    </div>
  )
}
