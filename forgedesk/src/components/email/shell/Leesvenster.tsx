import type { ReactNode } from 'react'
import { Reply } from 'lucide-react'
import type { EmailBody, EmailLijstItem } from '@/lib/mail/types'
import { ConversationView, readerActies } from '../reader'

export type AntwoordModus = 'antwoord' | 'allen' | 'doorsturen'

interface Props {
  emailId: string
  compact: boolean
  onSluiten: () => void
  onVolgende: () => void
  onVorige: () => void
  onAntwoord: (modus: AntwoordModus, mail: EmailLijstItem, body: EmailBody | null, voorstel?: string) => void
  /** De inline composer, of niets. Op mobiel zonder composer staat hier één grote Beantwoorden-knop. */
  voet: ReactNode
  onBeantwoorden?: () => void
  /** Knoppen van de shell in de leeskop, bijvoorbeeld de klantkaart. */
  kopActies?: ReactNode
  /** Gedeeld postvak: toewijzen en interne notities in het leesvenster. */
  gedeeld?: boolean
}

/** De naad tussen shell en reader: één plek die ConversationView aanroept. */
export function Leesvenster({ emailId, compact, onSluiten, onVolgende, onVorige, onAntwoord, voet, onBeantwoorden, gedeeld, kopActies }: Props) {
  const mobieleVoet = compact && !voet && onBeantwoorden ? (
    <div className="px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] bg-card border-t border-border">
      <button
        type="button"
        onClick={onBeantwoorden}
        className="tap-press w-full h-12 rounded-[12px] inline-flex items-center justify-center gap-2 text-[15px] font-semibold text-white bg-flame active:scale-[0.98] transition-transform"
      >
        <Reply className="h-4 w-4" />
        Beantwoorden
      </button>
    </div>
  ) : voet

  return (
    <ConversationView
      emailId={emailId}
      onSluiten={onSluiten}
      onAntwoord={onAntwoord}
      onVolgende={onVolgende}
      onVorige={onVorige}
      voet={mobieleVoet}
      compact={compact}
      kopActies={kopActies}
      gedeeld={gedeeld}
    />
  )
}

export { readerActies }
