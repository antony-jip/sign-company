import { toast } from 'sonner'
import type { Undo } from '@/lib/mail/mailStore'

/**
 * De store buffert archiveren en verwijderen vijf seconden; de shell laat
 * die tijd zien als een toast met "Ongedaan maken". Ook bij bulk: "14 mails
 * gearchiveerd · Ongedaan maken".
 */
export function toonUndo(omschrijving: string, undo: Undo, naOngedaan?: () => void): void {
  const duur = Math.max(1500, undo.klaarOver - Date.now())
  toast(omschrijving, {
    duration: duur,
    action: {
      label: 'Ongedaan maken',
      onClick: () => {
        undo.ongedaan()
        naOngedaan?.()
      },
    },
  })
}

export function meervoud(aantal: number, enkel: string, meer: string): string {
  return aantal === 1 ? `1 ${enkel}` : `${aantal} ${meer}`
}
