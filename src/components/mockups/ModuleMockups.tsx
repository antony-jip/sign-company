/* ── Module Mini-Mockups ──
   Kleine, niet-interactieve HTML/CSS representaties van de echte app-schermen.
   Gebruikt in de FeatureShowcase en Features-pagina. */

// ─── PLANNING: Weekgrid met taakblokken ───
export function PlanningMockup() {
  const days = ['Ma', 'Di', 'Wo', 'Do', 'Vr']
  const hours = ['08', '09', '10', '11', '12', '13', '14', '15', '16']
  const tasks = [
    { day: 0, start: 1, span: 2, label: 'Montage De Vries', color: '#1A535C' },
    { day: 1, start: 3, span: 2, label: 'Gevelreclame', color: '#F15025' },
    { day: 2, start: 0, span: 3, label: 'Productie Bakker', color: '#9A5A48' },
    { day: 3, start: 2, span: 1, label: 'Inmeting', color: '#1A535C' },
    { day: 4, start: 4, span: 2, label: 'Wrapping', color: '#F15025' },
    { day: 1, start: 0, span: 1, label: 'Overleg', color: '#6A5A8A' },
  ]

  return (
    <div className="w-full h-full bg-[#FAFAF8] rounded-lg overflow-hidden text-[7px]">
      {/* Header */}
      <div className="grid grid-cols-[28px_repeat(5,1fr)] border-b border-[#E6E4E0]">
        <div className="p-1" />
        {days.map(d => (
          <div key={d} className="p-1.5 text-center font-bold uppercase tracking-[0.08em] text-[#5A5A55] border-l border-[#E6E4E0]">
            {d}
          </div>
        ))}
      </div>
      {/* Grid */}
      <div className="grid grid-cols-[28px_repeat(5,1fr)] relative">
        {/* Hour labels */}
        <div className="flex flex-col">
          {hours.map(h => (
            <div key={h} className="h-[22px] px-1 flex items-start text-[6px] text-[#A0A098] font-mono border-b border-[#E6E4E0]/50">
              {h}:00
            </div>
          ))}
        </div>
        {/* Day columns */}
        {days.map((_, di) => (
          <div key={di} className="relative border-l border-[#E6E4E0]">
            {hours.map((_, hi) => (
              <div key={hi} className="h-[22px] border-b border-[#E6E4E0]/30" />
            ))}
            {/* Tasks */}
            {tasks.filter(t => t.day === di).map((t, i) => (
              <div
                key={i}
                className="absolute left-[2px] right-[2px] rounded-[3px] px-1 py-0.5 text-white font-medium overflow-hidden"
                style={{
                  top: `${t.start * 22 + 1}px`,
                  height: `${t.span * 22 - 2}px`,
                  backgroundColor: t.color,
                  opacity: 0.85,
                }}
              >
                <span className="text-[6px] leading-tight block truncate">{t.label}</span>
              </div>
            ))}
          </div>
        ))}
        {/* Current time line */}
        <div className="absolute left-[28px] right-0 border-t-2 border-red-500/60" style={{ top: '68px' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-red-500/60 -mt-[4px] -ml-[3px]" />
        </div>
      </div>
    </div>
  )
}

// ─── WERKBONNEN: Tabel met status-badges ───
export function WerkbonnenMockup() {
  const rows = [
    { nr: 'WB-042', klant: 'Bakker Reclame', status: 'afgetekend', statusBg: '#E2F0F0', statusColor: '#1A535C', datum: '22 mrt' },
    { nr: 'WB-041', klant: 'Smit Signs', status: 'in uitvoering', statusBg: '#FAE5E0', statusColor: '#943520', datum: '21 mrt' },
    { nr: 'WB-040', klant: 'Jansen & Zn', status: 'open', statusBg: '#EEEEED', statusColor: '#5A5A55', datum: '20 mrt' },
    { nr: 'WB-039', klant: 'De Vries Signing', status: 'afgetekend', statusBg: '#E2F0F0', statusColor: '#1A535C', datum: '19 mrt' },
  ]

  return (
    <div className="w-full h-full bg-white rounded-lg overflow-hidden text-[7px]">
      {/* Search bar */}
      <div className="px-3 py-2 border-b border-[#E6E4E0]">
        <div className="bg-[#F4F2EE] rounded-md px-2 py-1 text-[7px] text-[#A0A098]">Zoeken...</div>
      </div>
      {/* Table header */}
      <div className="grid grid-cols-[50px_1fr_70px_45px] px-3 py-1.5 bg-[#F4F2EE] border-b border-[#E6E4E0]">
        <span className="font-bold uppercase tracking-[0.08em] text-[#5A5A55]">#</span>
        <span className="font-bold uppercase tracking-[0.08em] text-[#5A5A55]">Klant</span>
        <span className="font-bold uppercase tracking-[0.08em] text-[#5A5A55]">Status</span>
        <span className="font-bold uppercase tracking-[0.08em] text-[#5A5A55] text-right">Datum</span>
      </div>
      {/* Rows */}
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[50px_1fr_70px_45px] px-3 py-2 border-b border-[#E6E4E0]/50 items-center hover:bg-[#F4F2EE]/50">
          <span className="font-mono font-medium text-[#1A535C]">{r.nr}</span>
          <span className="text-ink/80">{r.klant}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[6px] font-bold inline-block w-fit" style={{ backgroundColor: r.statusBg, color: r.statusColor }}>
            {r.status}<span style={{ color: '#F15025' }}>.</span>
          </span>
          <span className="text-[#A0A098] text-right font-mono">{r.datum}</span>
        </div>
      ))}
    </div>
  )
}

// ─── KLANTPORTAAL: Chat-achtige tijdlijn ───
export function KlantportaalMockup() {
  return (
    <div className="w-full h-full bg-[#FAFAF8] rounded-lg overflow-hidden text-[7px] flex flex-col">
      {/* Header */}
      <div className="bg-[#1A535C] px-3 py-2 text-white flex items-baseline gap-1">
        <span className="font-bold text-[9px]">Klantportaal</span>
        <span className="text-[#F15025] font-bold text-[9px]">.</span>
      </div>
      {/* Chat timeline */}
      <div className="flex-1 p-3 space-y-2 overflow-hidden">
        {/* Date separator */}
        <div className="flex items-center gap-2 text-[6px] text-[#A0A098]">
          <div className="flex-1 h-px bg-[#E6E4E0]" />
          <span>21 maart</span>
          <div className="flex-1 h-px bg-[#E6E4E0]" />
        </div>
        {/* Company message (right) */}
        <div className="flex justify-end">
          <div className="bg-[#E2F0F0] rounded-xl rounded-tr-sm px-2.5 py-1.5 max-w-[70%]">
            <p className="text-[7px]">Uw offerte is verstuurd. U kunt deze bekijken via de link.</p>
            <span className="text-[5px] text-[#A0A098] mt-0.5 block">14:32</span>
          </div>
        </div>
        {/* Client message (left) */}
        <div className="flex justify-start">
          <div className="bg-[#F4F2EE] rounded-xl rounded-tl-sm px-2.5 py-1.5 max-w-[70%]">
            <p className="text-[7px]">Ziet er goed uit, akkoord.</p>
            <span className="text-[5px] text-[#A0A098] mt-0.5 block">15:10</span>
          </div>
        </div>
        {/* Invoice card */}
        <div className="flex justify-end">
          <div className="bg-white rounded-xl border border-black/[0.05] px-2.5 py-2 max-w-[75%]" style={{ boxShadow: '0 1px 3px rgba(100,80,40,0.04)' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[7px] font-semibold">Factuur #F-2024-018</span>
              <span className="text-[6px] font-bold px-1.5 py-0.5 rounded-full bg-[#E4F0EA] text-[#2D6B48]">
                Betaald<span className="text-[#F15025]">.</span>
              </span>
            </div>
            <span className="font-mono text-[8px] font-bold text-[#2D6B48]">&euro;2.450</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── OFFERTES: Mini kanban board ───
export function OffertesMockup() {
  const columns = [
    {
      label: 'Concept',
      color: '#5A5A55',
      bg: '#EEEEED',
      cards: [{ klant: 'Jansen & Zn', bedrag: '€1.850' }],
    },
    {
      label: 'Verstuurd',
      color: '#C03A18',
      bg: '#FDE8E2',
      cards: [
        { klant: 'Bakker BV', bedrag: '€3.200' },
        { klant: 'De Vries', bedrag: '€890' },
      ],
    },
    {
      label: 'Akkoord',
      color: '#2D6B48',
      bg: '#E4F0EA',
      cards: [{ klant: 'Smit Signs', bedrag: '€4.500' }],
    },
  ]

  return (
    <div className="w-full h-full bg-[#FAFAF8] rounded-lg overflow-hidden text-[7px] p-2">
      <div className="flex gap-1.5 h-full">
        {columns.map((col, ci) => (
          <div key={ci} className="flex-1 rounded-lg p-1.5" style={{ backgroundColor: col.bg + '40' }}>
            {/* Column header */}
            <div className="flex items-center gap-1 mb-1.5 px-0.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: col.color }} />
              <span className="font-bold uppercase tracking-[0.06em] text-[6px]" style={{ color: col.color }}>{col.label}</span>
              <span className="text-[6px] text-[#A0A098] ml-auto">{col.cards.length}</span>
            </div>
            {/* Cards */}
            <div className="space-y-1">
              {col.cards.map((card, i) => (
                <div
                  key={i}
                  className="bg-white rounded-md px-1.5 py-1.5 border-l-[3px]"
                  style={{ borderLeftColor: col.color, boxShadow: '0 1px 2px rgba(100,80,40,0.04)' }}
                >
                  <p className="text-[7px] font-medium text-ink/80 mb-0.5">{card.klant}</p>
                  <p className="font-mono text-[8px] font-bold" style={{ color: col.color }}>{card.bedrag}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── FACTUREN: Tabel met aging/status ───
export function FacturenMockup() {
  const rows = [
    { nr: 'F-018', klant: 'Bakker BV', bedrag: '€3.200', status: 'betaald', statusBg: '#E4F0EA', statusColor: '#2D6B48' },
    { nr: 'F-017', klant: 'Smit Signs', bedrag: '€1.450', status: 'verzonden', statusBg: '#FDE8E2', statusColor: '#C03A18' },
    { nr: 'F-016', klant: 'Jansen & Zn', bedrag: '€2.800', status: 'achterstallig', statusBg: '#FAE5E0', statusColor: '#943520' },
  ]

  return (
    <div className="w-full h-full bg-white rounded-lg overflow-hidden text-[7px]">
      {/* Stats bar */}
      <div className="flex gap-2 p-2 border-b border-[#E6E4E0]">
        <div className="flex-1 rounded-md px-2 py-1.5" style={{ background: 'linear-gradient(160deg, #E4F0EA, #E4F0EA80)' }}>
          <span className="text-[6px] uppercase tracking-[0.08em] font-bold text-[#2D6B48]/60">Betaald</span>
          <p className="font-mono text-[9px] font-bold text-[#2D6B48]">&euro;14.200</p>
        </div>
        <div className="flex-1 rounded-md px-2 py-1.5" style={{ background: 'linear-gradient(160deg, #FAE5E0, #FAE5E080)' }}>
          <span className="text-[6px] uppercase tracking-[0.08em] font-bold text-[#943520]/60">Open</span>
          <p className="font-mono text-[9px] font-bold text-[#943520]">&euro;4.250</p>
        </div>
      </div>
      {/* Table */}
      <div className="grid grid-cols-[40px_1fr_55px_60px] px-2 py-1.5 bg-[#F4F2EE] border-b border-[#E6E4E0]">
        <span className="font-bold uppercase tracking-[0.08em] text-[#5A5A55]">Nr</span>
        <span className="font-bold uppercase tracking-[0.08em] text-[#5A5A55]">Klant</span>
        <span className="font-bold uppercase tracking-[0.08em] text-[#5A5A55] text-right">Bedrag</span>
        <span className="font-bold uppercase tracking-[0.08em] text-[#5A5A55] text-right">Status</span>
      </div>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[40px_1fr_55px_60px] px-2 py-2 border-b border-[#E6E4E0]/50 items-center">
          <span className="font-mono font-medium text-[#1A535C]">{r.nr}</span>
          <span className="text-ink/80">{r.klant}</span>
          <span className="font-mono font-bold text-ink text-right">{r.bedrag}</span>
          <div className="flex justify-end">
            <span className="px-1.5 py-0.5 rounded-full text-[6px] font-bold" style={{ backgroundColor: r.statusBg, color: r.statusColor }}>
              {r.status}<span style={{ color: '#F15025' }}>.</span>
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── DAAN AI: Chat interface met metrics ───
export function DaanAIMockup() {
  return (
    <div className="w-full h-full bg-[#FAFAF8] rounded-lg overflow-hidden text-[7px] flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#E6E4E0] flex items-center gap-1.5">
        <div className="w-4 h-4 rounded-full bg-[#6A5A8A]/10 flex items-center justify-center">
          <span className="text-[6px] font-bold text-[#6A5A8A]">AI</span>
        </div>
        <span className="font-bold text-[8px] text-ink">Daan</span>
      </div>
      {/* Messages */}
      <div className="flex-1 p-2.5 space-y-2 overflow-hidden">
        {/* User query */}
        <div className="flex justify-end">
          <div className="bg-[#1A535C] text-white rounded-xl rounded-tr-sm px-2 py-1.5 max-w-[75%]">
            <p className="text-[7px]">Hoeveel offertes staan er open?</p>
          </div>
        </div>
        {/* AI response: metrics */}
        <div className="flex justify-start">
          <div className="bg-white rounded-xl border border-black/[0.05] px-2 py-2 max-w-[85%]" style={{ boxShadow: '0 1px 3px rgba(100,80,40,0.04)' }}>
            <p className="text-[7px] text-ink/70 mb-1.5">Er staan 8 offertes open met een totaalwaarde van &euro;24.500.</p>
            <div className="grid grid-cols-2 gap-1">
              <div className="rounded-md px-1.5 py-1 bg-[#FDE8E2]">
                <span className="text-[5px] uppercase font-bold text-[#F15025]/60">Open</span>
                <p className="font-mono text-[8px] font-bold text-[#F15025]">8</p>
              </div>
              <div className="rounded-md px-1.5 py-1 bg-[#E4F0EA]">
                <span className="text-[5px] uppercase font-bold text-[#2D6B48]/60">Waarde</span>
                <p className="font-mono text-[8px] font-bold text-[#2D6B48]">&euro;24.5k</p>
              </div>
              <div className="rounded-md px-1.5 py-1 bg-[#E5ECF6]">
                <span className="text-[5px] uppercase font-bold text-[#3A6B8C]/60">Conversie</span>
                <p className="font-mono text-[8px] font-bold text-[#3A6B8C]">68%</p>
              </div>
              <div className="rounded-md px-1.5 py-1 bg-[#EEE8F5]">
                <span className="text-[5px] uppercase font-bold text-[#6A5A8A]/60">Gem. dagen</span>
                <p className="font-mono text-[8px] font-bold text-[#6A5A8A]">4.2</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Input */}
      <div className="px-2.5 py-2 border-t border-[#E6E4E0]">
        <div className="flex items-center gap-1.5 bg-white rounded-lg border border-[#E6E4E0] px-2 py-1.5">
          <span className="text-[7px] text-[#A0A098] flex-1">Vraag iets aan Daan...</span>
          <div className="w-4 h-4 rounded-md bg-[#6A5A8A] flex items-center justify-center">
            <span className="text-white text-[6px]">&rarr;</span>
          </div>
        </div>
      </div>
    </div>
  )
}
