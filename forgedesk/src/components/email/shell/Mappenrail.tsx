import { createPortal } from 'react-dom'
import { Pencil, Moon, Mail, PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MailMap, Postvak, PostvakKeuze } from '@/lib/mail/types'
import { MAP_VOLGORDE } from './mapConfig'
import { PostvakKiezer } from './PostvakKiezer'
import { LabelStip, useLabels } from './LabelMenu'

interface PostvakProps {
  postvakken: Postvak[]
  actiefPostvak: PostvakKeuze
  onPostvak: (keuze: PostvakKeuze) => void
}

interface LabelProps {
  /** Welk label de lijst nu filtert, of null. */
  labelFilter: string | null
  onLabelFilter: (label: string | null) => void
}

interface RailProps extends PostvakProps, LabelProps {
  actieveMap: MailMap
  tellers: Partial<Record<MailMap, number>>
  onKies: (map: MailMap) => void
  onNieuw: () => void
  labels: boolean
  onLabels: (aan: boolean) => void
  focusModus: boolean
  onFocusModus: (aan: boolean) => void
  onInstellingen: () => void
}

/** Welke tellers de rail toont: inbox telt ongelezen, de rest telt rijen. */
function tellerVoor(map: MailMap, tellers: Partial<Record<MailMap, number>>): number {
  if (map === 'leads' || map === 'verzonden' || map === 'archief' || map === 'prullenbak' || map === 'beantwoord') return 0
  return tellers[map] ?? 0
}

export function Mappenrail({ actieveMap, tellers, onKies, onNieuw, labels, onLabels, focusModus, onFocusModus, onInstellingen, postvakken, actiefPostvak, onPostvak, labelFilter, onLabelFilter }: RailProps) {
  // Alleen eigen labels krijgen een plek in de rail: de vier vaste staan in
  // het labelmenu van een mail, en als vaste lijst maakten ze de kolom onrustig.
  const { eigen: labelKeuzes } = useLabels()
  return (
    <div
      className={cn(
        'hidden md:flex flex-col flex-shrink-0 bg-[#F3F6F6] dark:bg-[hsl(190_38%_6%)] border-r border-petrol/[0.10] dark:border-petrol/[0.22] transition-[width] duration-200',
        labels ? 'w-[200px]' : 'w-[64px]',
      )}
    >
      <div className={cn('pt-3 pb-2', labels ? 'px-3' : 'px-2')}>
        <button
          type="button"
          onClick={onNieuw}
          title="Nieuw bericht (c)"
          className={cn(
            'tap-press w-full h-10 rounded-[10px] flex items-center justify-center gap-2 text-[13px] font-semibold text-white bg-flame hover:bg-[#D8421F] shadow-[0_1px_3px_rgba(210, 70, 32,0.18)] active:scale-[0.98] transition-[background-color,transform] duration-200',
          )}
        >
          <Pencil className="h-4 w-4" />
          {labels && <span>Nieuw bericht</span>}
        </button>
      </div>

      <PostvakKiezer
        postvakken={postvakken}
        actief={actiefPostvak}
        onKies={onPostvak}
        labels={labels}
        className={cn('pb-1.5', labels ? 'px-3' : 'px-2')}
      />

      <nav className={cn('flex-1 overflow-y-auto space-y-px', labels ? 'px-2' : 'px-2')} aria-label="Mappen">
        {MAP_VOLGORDE.map((m) => {
          const actief = actieveMap === m.id
          const teller = tellerVoor(m.id, tellers)
          const Icoon = m.icoon
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onKies(m.id)}
              title={labels ? undefined : `${m.label}${teller > 0 ? ` (${teller})` : ''}`}
              aria-current={actief ? 'page' : undefined}
              className={cn(
                'tap-press relative w-full flex items-center rounded-[10px] transition-colors duration-150',
                labels ? 'h-[34px] gap-2.5 px-2.5' : 'h-11 justify-center',
                actief
                  ? 'bg-petrol/[0.10] text-petrol dark:bg-[#2A7A86]/[0.22] dark:text-[#7FB5BF] font-semibold'
                  : 'text-[#3A3A36] dark:text-foreground/75 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]',
              )}
            >
              <Icoon className={cn('flex-shrink-0', labels ? 'h-4 w-4' : 'h-[19px] w-[19px]', actief ? 'text-petrol dark:text-[#7FB5BF]' : 'text-muted-foreground')} strokeWidth={actief ? 2.1 : 1.8} />
              {labels && <span className="flex-1 text-left text-[13.5px] tracking-[-0.01em] truncate">{m.label}</span>}
              {teller > 0 && (labels ? (
                <span className={cn('font-mono tabular-nums text-[11px]', m.id === 'inbox' ? 'font-semibold text-petrol dark:text-[#7FB5BF]' : 'text-muted-foreground')}>
                  {teller}
                </span>
              ) : (
                /* Ingeklapt past er geen getal naast het icoon; een kleine
                   badge in de hoek houdt de kolom rustig. */
                <span className={cn(
                  'pointer-events-none absolute right-1 top-1 inline-flex h-[14px] min-w-[14px] items-center justify-center rounded-full px-[3px] font-mono text-[8.5px] font-bold leading-none tabular-nums ring-[1.5px] ring-[#F3F6F6] dark:ring-[hsl(190_38%_6%)]',
                  m.id === 'inbox' ? 'bg-flame text-white' : 'bg-black/[0.10] text-foreground/70 dark:bg-white/[0.14]',
                )}>{teller > 99 ? '99+' : teller}</span>
              ))}
            </button>
          )
        })}

        {labelKeuzes.length > 0 && (
          <div className="mt-3 pt-2 border-t border-petrol/[0.08]">
            {labels && <p className="px-2.5 pb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">Labels</p>}
            {labelKeuzes.map((k) => {
              const actief = labelFilter === k.naam
              return (
                <button
                  key={k.naam}
                  type="button"
                  onClick={() => onLabelFilter(actief ? null : k.naam)}
                  title={labels ? undefined : k.naam}
                  aria-pressed={actief}
                  className={cn(
                    'tap-press w-full flex items-center rounded-[10px] transition-colors duration-150',
                    labels ? 'h-[30px] gap-2.5 px-2.5' : 'h-9 justify-center',
                    actief
                      ? 'bg-petrol/[0.10] text-petrol dark:bg-[#2A7A86]/[0.22] dark:text-[#7FB5BF] font-semibold'
                      : 'text-[#3A3A36] dark:text-foreground/75 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]',
                  )}
                >
                  <LabelStip kleur={k.kleur} formaat={9} />
                  {labels && <span className="flex-1 text-left text-[12.5px] truncate">{k.naam}</span>}
                </button>
              )
            })}
          </div>
        )}
      </nav>

      <div className={cn('border-t border-petrol/[0.08] py-2 space-y-px', labels ? 'px-2' : 'px-2')}>
        <button
          type="button"
          role="switch"
          aria-checked={focusModus}
          onClick={() => onFocusModus(!focusModus)}
          title={focusModus ? 'Focus modus · aan' : 'Focus modus · uit'}
          className={cn('tap-press w-full flex items-center rounded-[10px] text-[12px] transition-colors', labels ? 'h-8 gap-2.5 px-2.5' : 'h-10 justify-center', focusModus ? 'text-foreground bg-black/[0.06] dark:bg-white/[0.08]' : 'text-muted-foreground hover:text-foreground hover:bg-black/[0.04]')}
        >
          <Moon className="h-4 w-4 flex-shrink-0" />
          {labels && <span className="flex-1 text-left">Focus modus</span>}
        </button>
        <button
          type="button"
          onClick={onInstellingen}
          title="Mailinstellingen"
          className={cn('tap-press w-full flex items-center rounded-[10px] text-[12px] text-muted-foreground hover:text-foreground hover:bg-black/[0.04] transition-colors', labels ? 'h-8 gap-2.5 px-2.5' : 'h-10 justify-center')}
        >
          <Settings className="h-4 w-4 flex-shrink-0" />
          {labels && <span className="flex-1 text-left">Instellingen</span>}
        </button>
        <button
          type="button"
          onClick={() => onLabels(!labels)}
          title={labels ? 'Rail inklappen' : 'Namen tonen'}
          className={cn('tap-press w-full flex items-center rounded-[10px] text-[12px] text-muted-foreground hover:text-foreground hover:bg-black/[0.04] transition-colors', labels ? 'h-8 gap-2.5 px-2.5' : 'h-10 justify-center')}
        >
          {labels ? <PanelLeftClose className="h-4 w-4 flex-shrink-0" /> : <PanelLeftOpen className="h-4 w-4 flex-shrink-0" />}
          {labels && <span className="flex-1 text-left">Inklappen</span>}
        </button>
      </div>
    </div>
  )
}

interface LadeProps extends PostvakProps {
  open: boolean
  onSluiten: () => void
  actieveMap: MailMap
  tellers: Partial<Record<MailMap, number>>
  onKies: (map: MailMap) => void
  onNieuw: () => void
  gebruiker: { naam?: string; email?: string; initiaal: string; avatar: { bg: string; text: string } }
  focusModus: boolean
  onFocusModus: (aan: boolean) => void
}

/** De hamburger-lade op mobiel, geportald zodat hij boven de globale header uitkomt. */
export function MobieleMappenLade({ open, onSluiten, actieveMap, tellers, onKies, onNieuw, gebruiker, focusModus, onFocusModus, postvakken, actiefPostvak, onPostvak }: LadeProps) {
  return createPortal(
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={onSluiten} aria-hidden="true" />}
      <div
        className={cn(
          'md:hidden fixed inset-y-0 left-0 z-50 w-[80vw] max-w-[300px] bg-card border-r border-border flex flex-col transform transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-hidden={!open}
      >
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border pt-[calc(env(safe-area-inset-top)+1rem)]">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: gebruiker.avatar.bg, color: gebruiker.avatar.text }}>
            <span className="text-[14px] font-bold">{gebruiker.initiaal}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-foreground truncate">{gebruiker.naam}</p>
            <p className="text-[12px] text-foreground/70 truncate">{gebruiker.email}</p>
          </div>
        </div>
        <div className="p-3">
          <button
            type="button"
            className="tap-press w-full h-10 rounded-[10px] flex items-center justify-center gap-2 text-[13px] font-semibold text-white bg-flame active:scale-[0.98] transition-transform"
            onClick={() => { onSluiten(); onNieuw() }}
          >
            <Pencil className="h-4 w-4" />
            Nieuw bericht
          </button>
        </div>
        <PostvakKiezer postvakken={postvakken} actief={actiefPostvak} onKies={onPostvak} className="px-3 pb-2" />
        <nav className="flex-1 overflow-y-auto px-2 space-y-0">
          {MAP_VOLGORDE.map((m) => {
            const actief = actieveMap === m.id
            const teller = tellerVoor(m.id, tellers)
            const Icoon = m.icoon
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => { onKies(m.id); onSluiten() }}
                className={cn(
                  'w-full py-3 px-4 flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-colors',
                  actief ? 'bg-petrol/[0.08] dark:bg-[#2A7A86]/[0.18] text-petrol dark:text-[#7FB5BF]' : 'text-foreground/70 hover:bg-background hover:text-foreground',
                )}
              >
                <Icoon className={cn('h-4 w-4 flex-shrink-0', actief && 'text-petrol')} />
                <span className="flex-1 text-left">{m.label}</span>
                {teller > 0 && <span className="text-[11px] font-mono tabular-nums text-muted-foreground">{teller}</span>}
              </button>
            )
          })}
        </nav>
        <div className="p-4 border-t border-border space-y-2.5 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <button
            type="button"
            role="switch"
            aria-checked={focusModus}
            onClick={() => onFocusModus(!focusModus)}
            className="w-full flex items-center gap-2 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Moon className="h-3 w-3" />
            <span className="flex-1 text-left">Focus modus</span>
            <span className={cn('relative inline-flex h-4 w-7 items-center rounded-full transition-colors flex-shrink-0', focusModus ? 'bg-petrol' : 'bg-[#D4D3CE] dark:bg-white/20')}>
              <span className={cn('inline-block h-3 w-3 transform rounded-full bg-white transition-transform', focusModus ? 'translate-x-[14px]' : 'translate-x-0.5')} />
            </span>
          </button>
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <Mail className="h-3 w-3" />
            <span>doen<span className="text-flame">.</span> mail</span>
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
