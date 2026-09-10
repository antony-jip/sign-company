import { Menu, Search, Sparkles, MoreHorizontal, ChevronLeft, MessageSquare } from 'lucide-react'
import { DASHBOARD_ITEM, ALLE_MODULES } from '@/lib/navigatie'
import { merk } from '../brand'
import { StatusBalk } from './TelefoonFrame'

// Mobiele topbalk zoals EmailMobileTopBar: pil met menu, zoeken, avatar, Daan.
export const MobielTop: React.FC<{ titel?: string; terug?: boolean }> = ({ titel, terug }) => (
  <div className="px-3 pb-1 bg-background">
    <StatusBalk />
    <div className="flex items-center gap-2 h-11 rounded-full bg-muted pl-1 pr-1">
      <span className="flex items-center justify-center w-9 h-9 rounded-full text-[#5F5E5A]">
        {terug ? <ChevronLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </span>
      <div className="flex-1 flex items-center gap-2 min-w-0">
        {titel ? (
          <span className="text-[14px] font-semibold text-foreground truncate">{titel}</span>
        ) : (
          <>
            <Search className="h-4 w-4 text-[#888780] flex-shrink-0" />
            <span className="text-[14px] text-[#888780]">Zoek in mail</span>
          </>
        )}
      </div>
      <span className="w-[34px] h-[34px] rounded-full bg-petrol text-white text-[13px] font-bold flex items-center justify-center">K</span>
      <span className="flex items-center justify-center w-[34px] h-[34px] rounded-full text-white" style={{ background: 'linear-gradient(135deg, #1A535C 0%, #2A6B75 100%)' }}>
        <Sparkles className="h-4 w-4" />
      </span>
    </div>
  </div>
)

// Onderste tabbalk zoals MobileTabBar: Dashboard, Projecten, Email, Daan, Meer.
const TABS = [DASHBOARD_ITEM, ...ALLE_MODULES.filter(m => m.label === 'Projecten' || m.label === 'Email')]

export const MobielTabBalk: React.FC<{ actief?: string }> = ({ actief = 'Projecten' }) => (
  <div className="absolute inset-x-0 bottom-0 bg-card border-t border-border" style={{ height: 78, paddingBottom: 18 }}>
    <div className="flex items-stretch h-[60px]">
      {TABS.map(item => {
        const Icon = item.icon
        const isActief = item.label === actief
        return (
          <div key={item.label} className="relative flex-1 flex flex-col items-center justify-center gap-1" style={{ color: isActief ? merk.petrol : '#8A8A85' }}>
            {isActief && <span className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-b-[2px] bg-flame" />}
            <Icon className="w-[21px] h-[21px]" />
            <span className="text-[10px] font-semibold tracking-[-0.01em] leading-none">{item.label}</span>
          </div>
        )
      })}
      <div className="relative flex-1 flex flex-col items-center justify-center gap-1" style={{ color: '#8A8A85' }}>
        <span className="w-[26px] h-[26px] rounded-[9px] flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #1A535C 0%, #2A6B75 100%)' }}>
          <MessageSquare className="w-[15px] h-[15px]" />
        </span>
        <span className="text-[10px] font-semibold tracking-[-0.01em] leading-none">Daan<span className="text-flame">.</span></span>
      </div>
      <div className="relative flex-1 flex flex-col items-center justify-center gap-1" style={{ color: '#8A8A85' }}>
        <MoreHorizontal className="w-[21px] h-[21px]" />
        <span className="text-[10px] font-semibold tracking-[-0.01em] leading-none">Meer</span>
      </div>
    </div>
  </div>
)
