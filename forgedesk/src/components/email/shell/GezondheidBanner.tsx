import { AlertTriangle, PowerOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SyncStatus } from '@/lib/mail/types'

function korteTijd(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const dag = d.toLocaleDateString('nl-NL', { weekday: 'short' }).replace('.', '')
  const tijd = d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  return `${dag} ${tijd}`
}

/**
 * Bovenaan de lijst zodra de sync hapert: "Mailbox niet gesynchroniseerd
 * sinds di 14:02 · Wachtwoord geweigerd · Opnieuw verbinden". Uitgezet is rood.
 * `onbekend` betekent dat de gezondheid niet op te halen was; die toont de
 * banner ook, want zwijgen leest als "alles goed".
 */
export function GezondheidBanner({ sync, onVerbinden }: { sync: SyncStatus; onVerbinden: () => void }) {
  if (sync.status === 'ok') return null
  const uit = sync.status === 'uitgezet'
  const onbekend = sync.status === 'onbekend'
  const sinds = korteTijd(sync.laatsteSucces)
  const Icoon = uit ? PowerOff : AlertTriangle
  return (
    <div
      role="status"
      className={cn(
        'mx-4 mt-2 mb-1 px-3 py-2 rounded-lg text-[12px] flex items-center gap-2.5 flex-shrink-0',
        uit ? 'bg-[#FDE8E4] text-[#C0451A] dark:bg-[#C0451A]/15 dark:text-[#FDA38C]' : 'bg-[#F5F2E8] text-[#8A7A4A] dark:bg-[#8A7A4A]/15 dark:text-[#D4B566]',
      )}
    >
      <Icoon className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="flex-1 min-w-0 truncate">
        {uit ? 'Mailbox uitgezet' : onbekend ? 'Status onbekend' : 'Mailbox niet gesynchroniseerd'}
        {sinds ? ` sinds ${sinds}` : ''}
        {sync.laatsteFout ? ` · ${sync.laatsteFout}` : ''}
      </span>
      <button type="button" onClick={onVerbinden} className="font-semibold underline-offset-2 hover:underline whitespace-nowrap">
        Opnieuw verbinden
      </button>
    </div>
  )
}
