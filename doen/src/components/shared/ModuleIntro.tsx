import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { guidanceAan, isIntroGezien, markeerIntroGezien, GUIDANCE_EVENT } from '@/lib/guidance'

interface ModuleIntroProps {
  /** Sleutel voor doen_intro_<id>; per module uniek. */
  id: string
  tekst: string
  actie?: { label: string; naar: string }
  className?: string
}

/**
 * Eenmalige uitleg-regel voor nieuwe gebruikers, bovenaan een module.
 * Wegklikken onthoudt dat per apparaat; de globale guidance-schakelaar in
 * het gebruikersmenu zet alles in één keer uit of juist weer aan.
 */
export function ModuleIntro({ id, tekst, actie, className }: ModuleIntroProps) {
  const navigate = useNavigate()
  const [zichtbaar, setZichtbaar] = useState(() => guidanceAan() && !isIntroGezien(id))

  useEffect(() => {
    const bijwerken = () => setZichtbaar(guidanceAan() && !isIntroGezien(id))
    window.addEventListener(GUIDANCE_EVENT, bijwerken)
    return () => window.removeEventListener(GUIDANCE_EVENT, bijwerken)
  }, [id])

  if (!zichtbaar) return null

  const sluit = () => {
    markeerIntroGezien(id)
    setZichtbaar(false)
  }

  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-xl bg-petrol/[0.06] dark:bg-petrol/15 px-4 py-3',
        className,
      )}
    >
      <Info className="h-4 w-4 text-petrol dark:text-[#7FB5BF] mt-0.5 flex-shrink-0" aria-hidden />
      <p className="flex-1 text-[13px] text-foreground/80 leading-relaxed">
        {tekst}
        {actie && (
          <>
            {' '}
            <button
              type="button"
              onClick={() => navigate(actie.naar)}
              className="text-petrol dark:text-[#7FB5BF] font-medium hover:underline focus-visible:outline-none focus-visible:underline"
            >
              {actie.label} →
            </button>
          </>
        )}
      </p>
      <button
        type="button"
        onClick={sluit}
        aria-label="Uitleg verbergen"
        className="p-0.5 rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-background/60 transition-colors flex-shrink-0"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
