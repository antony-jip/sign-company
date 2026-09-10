import type { ReactNode } from 'react'
import { Search, Bell, Plus, X } from 'lucide-react'
import { DASHBOARD_ITEM, ALLE_MODULES, SETTINGS_ITEM } from '@/lib/navigatie'
import { staticFile, Img } from 'remotion'

// Desktop-omlijsting van de app, zoals Sidebar (rail), Header en TabBar.
// Ontwerpmaat 1280 x 960 (4:3). Alles binnenin rendert op css-px.
export const VENSTER_B = 1440
export const VENSTER_H = 1080

const RAIL = [DASHBOARD_ITEM, ...ALLE_MODULES.filter(m => ['Projecten', 'Offertes', 'Klanten', 'Werkbonnen', 'Maatjes', 'Planning', 'Taken', 'Email', 'Portaal'].includes(m.label))]

type Props = {
  actief: string
  moduleTitel: string
  tabs?: { label: string; actief?: boolean }[]
  meldingen?: number
  mailOngelezen?: number
  children: ReactNode
  klasse?: string
}

export const AppVenster: React.FC<Props> = ({ actief, moduleTitel, tabs = [], meldingen = 4, mailOngelezen = 0, children, klasse }) => (
  <div className={`bg-background text-foreground flex ${klasse ?? ''}`} style={{ width: VENSTER_B, height: VENSTER_H, fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
    {/* Rail */}
    <aside className="doen-sidebar flex flex-col items-center flex-shrink-0 border-r border-border" style={{ width: 64 }}>
      <div className="flex items-center justify-center" style={{ height: 68 }}>
        <Img src={staticFile('logos/doen-app-icon.svg')} style={{ width: 40, height: 40 }} />
      </div>
      <div className="w-6 doen-sidebar-divider" />
      <nav className="flex flex-col items-center pt-3 w-full">
        {RAIL.map((item) => {
          const Icon = item.icon
          const active = item.label === actief
          return (
            <div key={item.label} data-doel={item.label === 'Email' ? 'rail-email' : undefined} className="relative flex items-center justify-center w-full" style={{ height: 44 }}>
              {active && <div className="doen-sidebar-active-pill absolute rounded-[12px]" style={{ insetInline: 10, insetBlock: 4 }} />}
              {active && <span className="doen-sidebar-flame-accent z-10" />}
              {item.label === 'Email' && mailOngelezen === 0 && <span className="absolute right-[13px] top-[7px] z-10 h-[7px] w-[7px] rounded-full bg-flame ring-2 ring-background" />}
              {item.label === 'Email' && mailOngelezen > 0 && <span className="absolute right-[6px] top-[3px] z-10 min-w-[18px] h-[18px] px-1 rounded-full bg-flame text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-background">{mailOngelezen}</span>}
              <Icon className="relative z-10 h-[19px] w-[19px]" style={{ color: active ? '#fff' : item.color }} strokeWidth={active ? 2.2 : 1.8} />
            </div>
          )
        })}
      </nav>
      <div className="mt-auto mb-4 flex flex-col items-center gap-3">
        <SETTINGS_ITEM.icon className="h-[19px] w-[19px] text-muted-foreground" strokeWidth={1.8} />
        <span className="w-8 h-8 rounded-full bg-petrol text-white text-[12px] font-bold flex items-center justify-center">A</span>
      </div>
    </aside>

    <div className="flex-1 min-w-0 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 border-b border-border/60 flex-shrink-0" style={{ height: 56 }}>
        <span className="font-heading text-[15px] font-bold text-foreground">{moduleTitel}<span className="text-flame">.</span></span>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 h-8 px-3 rounded-lg bg-muted text-[13px] text-muted-foreground" style={{ width: 220 }}>
            <Search className="h-3.5 w-3.5" /> Zoeken...
            <span className="ml-auto font-mono text-[10px] rounded border border-border px-1">⌘K</span>
          </div>
          <span className="relative flex items-center justify-center w-8 h-8 text-muted-foreground">
            <Bell className="h-[18px] w-[18px]" />
            {meldingen > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-flame text-white text-[10px] font-bold flex items-center justify-center">{meldingen}</span>}
          </span>
          <span className="w-8 h-8 rounded-full bg-petrol text-white text-[11px] font-bold flex items-center justify-center">AB</span>
        </div>
      </header>
      {/* Document-tabs */}
      {tabs.length > 0 && (
        <div className="flex items-center gap-1 px-3 border-b border-border/60 flex-shrink-0" style={{ height: 40, backgroundColor: 'hsl(38 20% 96%)' }}>
          {tabs.map((tab) => (
            <span key={tab.label} className={`flex items-center gap-[7px] h-[28px] pl-[11px] pr-[8px] text-[12px] tracking-[-0.01em] rounded-[7px] border ${tab.actief ? 'bg-card font-semibold text-petrol border-border shadow-[0_1px_2px_rgba(130,100,60,0.07)]' : 'font-medium border-transparent text-petrol/60'}`}>
              {tab.label}
              {tab.actief && <X className="w-[11px] h-[11px] text-petrol/40" />}
            </span>
          ))}
          <Plus className="w-3.5 h-3.5 text-petrol/50 ml-1" />
        </div>
      )}
      <div className="flex-1 min-h-0 relative overflow-hidden">{children}</div>
    </div>
  </div>
)
