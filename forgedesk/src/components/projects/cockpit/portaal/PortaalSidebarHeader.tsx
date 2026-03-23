import { ExternalLink, Send, ChevronDown } from 'lucide-react'

interface PortaalSidebarHeaderProps {
  expanded: boolean
  setExpanded: (v: boolean) => void
  isActief: boolean
  hasKlantReactie: boolean
  itemCount: number
  previewText: string
  previewAfzender: string
  previewTijd: string
  voortgang: { goedgekeurd: number; totaal: number }
  onNavigate: () => void
}

export function PortaalSidebarHeader({
  expanded,
  setExpanded,
  isActief,
  hasKlantReactie,
  itemCount,
  previewText,
  previewAfzender,
  previewTijd,
  voortgang,
  onNavigate,
}: PortaalSidebarHeaderProps) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#FAFAF8] transition-colors select-none"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Left accent dot */}
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
        isActief
          ? 'bg-petrol shadow-sm'
          : 'bg-gray-200'
      }`}>
        <Send className={`h-4 w-4 ${isActief ? 'text-white' : 'text-gray-500'}`} />
      </div>

      {/* Title + meta */}
      <div className="flex-shrink-0 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Portaal</span>
          {hasKlantReactie && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
            </span>
          )}
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            isActief
              ? 'bg-mod-projecten-light text-mod-projecten-text'
              : 'bg-gray-100 text-gray-500'
          }`}>
            {isActief ? 'Actief' : 'Verlopen'}
          </span>
          {itemCount > 0 && (
            <span className="text-[10px] text-muted-foreground/60">
              {itemCount} item{itemCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {/* Preview of last message when collapsed */}
        {!expanded && previewText && (
          <p className={`text-[11px] truncate max-w-[300px] mt-0.5 ${hasKlantReactie ? 'text-foreground font-medium' : 'text-muted-foreground/70'}`}>
            {hasKlantReactie && (
              <span className="text-rose-500 font-semibold">Klant heeft gereageerd — </span>
            )}
            <span className={hasKlantReactie ? '' : 'font-medium'}>{previewAfzender}</span>
            {': '}
            {previewText.length > 50 ? `${previewText.slice(0, 50)}...` : previewText}
            <span className="text-muted-foreground/40 ml-1.5">{previewTijd}</span>
          </p>
        )}
        {!expanded && voortgang.totaal > 0 && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="flex items-center gap-1 h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-mod-projecten rounded-full transition-all"
                style={{ width: `${(voortgang.goedgekeurd / voortgang.totaal) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground/60 font-mono">
              {voortgang.goedgekeurd}/{voortgang.totaal}
            </span>
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Open in portalen button */}
      <button
        onClick={(e) => { e.stopPropagation(); onNavigate() }}
        className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-all flex-shrink-0"
      >
        Openen
        <ExternalLink className="h-3 w-3" />
      </button>

      {/* Expand/collapse chevron */}
      <ChevronDown className={`h-4 w-4 text-muted-foreground/50 transition-transform ${expanded ? 'rotate-180' : ''}`} />
    </div>
  )
}
