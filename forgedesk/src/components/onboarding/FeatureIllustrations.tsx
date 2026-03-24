import React from 'react'

// ─── 1. Offertes — Document met regelitems ──────────────────

export function IllustratieOffertes() {
  return (
    <svg width="280" height="260" viewBox="0 0 280 260" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Paper */}
      <rect
        x="50" y="20" width="180" height="220" rx="12"
        fill="currentColor" className="text-card" stroke="#E8866A" strokeWidth="1.5" opacity="0.9"
      />
      {/* Header bar */}
      <rect
        x="70" y="40" width="100" height="8" rx="4" fill="#E8866A" opacity="0.3"
      />
      {/* Line items */}
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x="70" y={72 + i * 28} width={120 - i * 15} height="6" rx="3" fill="#E8866A" opacity={0.15 + i * 0.05} />
          <rect x="200" y={72 + i * 28} width="20" height="6" rx="3" fill="#E8866A" opacity="0.2" />
        </g>
      ))}
      {/* Divider */}
      <line
        x1="70" y1="190" x2="210" y2="190" stroke="#E8866A" strokeWidth="1" opacity="0.2"
      />
      {/* Total */}
      <rect
        x="160" y="200" width="50" height="8" rx="4" fill="#E8866A" opacity="0.4"
      />
      {/* PDF badge */}
      <g>
        <rect x="195" y="25" width="40" height="20" rx="6" fill="#E8866A" />
        <text x="215" y="39" textAnchor="middle" fill="white" fontSize="9" fontWeight="700">PDF</text>
      </g>
    </svg>
  )
}

// ─── 2. Facturen — Invoice met betaalstatus ─────────────────

export function IllustratieFacturen() {
  return (
    <svg width="280" height="260" viewBox="0 0 280 260" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Paper */}
      <rect
        x="50" y="20" width="180" height="220" rx="12"
        fill="currentColor" className="text-card" stroke="#7EB5A6" strokeWidth="1.5" opacity="0.9"
      />
      {/* Euro symbol */}
      <text
        x="140" y="85" textAnchor="middle" fill="#7EB5A6" fontSize="36" fontWeight="800" opacity="0.2"
      >€</text>
      {/* Amount */}
      <rect
        x="95" y="100" width="90" height="10" rx="5" fill="#7EB5A6" opacity="0.3"
      />
      {/* Progress bar bg */}
      <rect
        x="80" y="130" width="120" height="8" rx="4" fill="#7EB5A6" opacity="0.1"
      />
      {/* Progress bar fill */}
      <rect
        x="80" y="130" width="120" height="8" rx="4" fill="#7EB5A6" opacity="0.5"
      />
      {/* Detail lines */}
      {[0, 1].map((i) => (
        <rect key={i}
          x="80" y={155 + i * 18} width={90 - i * 20} height="5" rx="2.5" fill="#7EB5A6" opacity="0.15"
        />
      ))}
      {/* Betaald badge */}
      <g transform="rotate(-8, 180, 198)">
        <rect x="145" y="185" width="70" height="26" rx="8" fill="#7EB5A6" />
        <text x="180" y="202" textAnchor="middle" fill="white" fontSize="10" fontWeight="700">Betaald ✓</text>
      </g>
    </svg>
  )
}

// ─── 3. Klanten — Contact kaarten ───────────────────────────

export function IllustratieKlanten() {
  const cards = [
    { x: 40, y: 30, initials: 'JB', color: '#8BAFD4' },
    { x: 110, y: 50, initials: 'PJ', color: '#9B8EC4' },
    { x: 40, y: 120, initials: 'LV', color: '#E8866A' },
    { x: 110, y: 140, initials: 'MK', color: '#7EB5A6' },
  ]

  return (
    <svg width="280" height="260" viewBox="0 0 280 260" fill="none" xmlns="http://www.w3.org/2000/svg">
      {cards.map((card, i) => (
        <g key={i}>
          <rect x={card.x} y={card.y} width="130" height="80" rx="12"
            fill="currentColor" className="text-card" stroke={card.color} strokeWidth="1.5" opacity="0.9" />
          {/* Avatar */}
          <circle cx={card.x + 28} cy={card.y + 30} r="14" fill={card.color} opacity="0.2" />
          <text x={card.x + 28} y={card.y + 35} textAnchor="middle" fill={card.color} fontSize="11" fontWeight="700">{card.initials}</text>
          {/* Name + detail */}
          <rect x={card.x + 52} y={card.y + 22} width="60" height="6" rx="3" fill={card.color} opacity="0.25" />
          <rect x={card.x + 52} y={card.y + 34} width="40" height="5" rx="2.5" fill={card.color} opacity="0.12" />
          {/* Contact line */}
          <rect x={card.x + 16} y={card.y + 56} width="98" height="5" rx="2.5" fill={card.color} opacity="0.1" />
        </g>
      ))}
    </svg>
  )
}

// ─── 4. Projecten — Kanban bord ──────────────────────────────

export function IllustratieProjecten() {
  const columns = [
    { x: 42, label: 'Todo', color: '#8BAFD4', cards: [{ h: 30 }, { h: 22 }] },
    { x: 112, label: 'Bezig', color: '#E8866A', cards: [{ h: 35 }, { h: 25 }, { h: 20 }] },
    { x: 182, label: 'Klaar', color: '#7EB5A6', cards: [{ h: 28 }] },
  ]

  return (
    <svg width="280" height="260" viewBox="0 0 280 260" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Board bg */}
      <rect
        x="30" y="25" width="220" height="210" rx="12"
        fill="currentColor" className="text-card" stroke="#8BAFD4" strokeWidth="1.5" opacity="0.9"
      />
      {/* Columns */}
      {columns.map((col, ci) => (
        <g key={ci}>
          {/* Column header */}
          <rect x={col.x} y="42" width="58" height="6" rx="3" fill={col.color} opacity="0.35" />
          {/* Divider */}
          <line x1={col.x} y1="58" x2={col.x + 58} y2="58" stroke={col.color} strokeWidth="0.5" opacity="0.2" />
          {/* Cards */}
          {col.cards.map((card, i) => {
            const y = 66 + i * (card.h + 8)
            return (
              <g key={i}>
                <rect x={col.x} y={y} width="58" height={card.h} rx="6"
                  fill={col.color} opacity="0.1" stroke={col.color} strokeWidth="0.8" />
                <rect x={col.x + 8} y={y + 8} width="30" height="4" rx="2" fill={col.color} opacity="0.25" />
                {card.h > 24 && (
                  <rect x={col.x + 8} y={y + 16} width="20" height="3" rx="1.5" fill={col.color} opacity="0.12" />
                )}
              </g>
            )
          })}
        </g>
      ))}
    </svg>
  )
}

// ─── 5. Werkbonnen — Clipboard met checks ───────────────────

export function IllustratieWerkbonnen() {
  return (
    <svg width="280" height="260" viewBox="0 0 280 260" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Clipboard */}
      <rect
        x="60" y="30" width="160" height="200" rx="12"
        fill="currentColor" className="text-card" stroke="#C4A882" strokeWidth="1.5" opacity="0.9"
      />
      {/* Clip */}
      <rect
        x="110" y="18" width="60" height="24" rx="8"
        fill="#C4A882" opacity="0.3"
      />
      {/* Checklist items */}
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          {/* Checkbox */}
          <rect x="82" y={65 + i * 34} width="16" height="16" rx="4"
            fill={i < 3 ? '#C4A882' : 'none'} stroke="#C4A882" strokeWidth="1.5" opacity={i < 3 ? 0.25 : 0.15} />
          {/* Checkmark */}
          {i < 3 && (
            <path
              d={`M${86} ${73 + i * 34}l3 3 5-6`}
              stroke="#C4A882" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            />
          )}
          {/* Text */}
          <rect x="108" y={68 + i * 34} width={80 - i * 10} height="6" rx="3" fill="#C4A882" opacity="0.18" />
        </g>
      ))}
      {/* Camera icon hint */}
      <circle
        cx="185" cy="200" r="14" fill="#C4A882" opacity="0.15"
      />
      {/* Signature line */}
      <path
        d="M90 205 Q110 195 130 205 Q150 215 170 200"
        stroke="#C4A882" strokeWidth="1.5" fill="none" opacity="0.3" strokeLinecap="round"
      />
    </svg>
  )
}

// ─── 5. Planning — Weekkalender ─────────────────────────────

export function IllustratiePlanning() {
  const blocks = [
    { x: 62, y: 90, w: 45, h: 50, color: '#9B8EC4' },
    { x: 62, y: 155, w: 45, h: 30, color: '#7EB5A6' },
    { x: 117, y: 75, w: 45, h: 35, color: '#E8866A' },
    { x: 117, y: 130, w: 45, h: 60, color: '#8BAFD4' },
    { x: 172, y: 90, w: 45, h: 40, color: '#C4A882' },
    { x: 172, y: 145, w: 45, h: 45, color: '#9B8EC4' },
  ]

  return (
    <svg width="280" height="260" viewBox="0 0 280 260" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Calendar frame */}
      <rect
        x="45" y="25" width="190" height="210" rx="12"
        fill="currentColor" className="text-card" stroke="#9B8EC4" strokeWidth="1.5" opacity="0.9"
      />
      {/* Day headers */}
      {['Ma', 'Di', 'Wo'].map((day, i) => (
        <text key={day}
          x={84 + i * 55} y="55" textAnchor="middle" fill="#9B8EC4" fontSize="10" fontWeight="600" opacity="0.5"
        >{day}</text>
      ))}
      {/* Grid lines */}
      <line x1="107" y1="62" x2="107" y2="220" stroke="#9B8EC4" strokeWidth="0.5" opacity="0.1" />
      <line x1="162" y1="62" x2="162" y2="220" stroke="#9B8EC4" strokeWidth="0.5" opacity="0.1" />
      {/* Calendar blocks */}
      {blocks.map((b, i) => (
        <rect key={i}
          x={b.x} y={b.y} width={b.w} height={b.h} rx="6"
          fill={b.color} opacity="0.2"
        />
      ))}
    </svg>
  )
}

// ─── 7. Visualizer — Canvas met design tools ────────────────

export function IllustratieVisualizer() {
  return (
    <svg width="280" height="260" viewBox="0 0 280 260" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Canvas frame */}
      <rect
        x="45" y="25" width="190" height="200" rx="12"
        fill="currentColor" className="text-card" stroke="#B8A076" strokeWidth="1.5" opacity="0.9"
      />
      {/* Design preview area */}
      <rect
        x="60" y="45" width="120" height="80" rx="8"
        fill="#B8A076" opacity="0.06" stroke="#B8A076" strokeWidth="1" strokeDasharray="4 3"
      />
      {/* Shape 1 - rectangle */}
      <rect
        x="75" y="60" width="40" height="30" rx="4" fill="#E8866A" opacity="0.2"
      />
      {/* Shape 2 - circle */}
      <circle
        cx="145" cy="85" r="18" fill="#9B8EC4" opacity="0.2"
      />
      {/* Pen tool path */}
      <path
        d="M80 100 Q100 70 130 90 Q155 110 165 80"
        stroke="#B8A076" strokeWidth="2" fill="none" opacity="0.5" strokeLinecap="round"
      />
      {/* Color palette */}
      {[
        { cx: 72, color: '#E8866A' },
        { cx: 92, color: '#7EB5A6' },
        { cx: 112, color: '#8BAFD4' },
        { cx: 132, color: '#9B8EC4' },
        { cx: 152, color: '#B8A076' },
      ].map((dot, i) => (
        <circle key={i}
          cx={dot.cx} cy="150" r="8" fill={dot.color} opacity="0.4"
        />
      ))}
      {/* Tool icons area */}
      <g>
        <rect x="195" y="50" width="28" height="28" rx="6" fill="#B8A076" opacity="0.12" />
        <rect x="195" y="86" width="28" height="28" rx="6" fill="#B8A076" opacity="0.08" />
        <rect x="195" y="122" width="28" height="28" rx="6" fill="#B8A076" opacity="0.05" />
      </g>
      {/* Layers hint */}
      <rect
        x="60" y="175" width="160" height="8" rx="4" fill="#B8A076" opacity="0.1"
      />
      <rect
        x="60" y="190" width="100" height="6" rx="3" fill="#B8A076" opacity="0.07"
      />
    </svg>
  )
}

// ─── 8. Email — Inbox met berichten ─────────────────────────

export function IllustratieEmail() {
  const emails = [
    { y: 55, from: 'AB', subject: 95, color: '#8BAFD4' },
    { y: 100, from: 'PJ', subject: 75, color: '#9B8EC4' },
    { y: 145, from: 'LV', subject: 85, color: '#E8866A' },
  ]

  return (
    <svg width="280" height="260" viewBox="0 0 280 260" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Inbox frame */}
      <rect
        x="40" y="25" width="200" height="210" rx="12"
        fill="currentColor" className="text-card" stroke="#8BAFD4" strokeWidth="1.5" opacity="0.9"
      />
      {/* Header */}
      <rect
        x="60" y="40" width="50" height="7" rx="3.5" fill="#8BAFD4" opacity="0.3"
      />
      {/* Email rows */}
      {emails.map((e, i) => (
        <g key={i}>
          {/* Row bg */}
          <rect x="50" y={e.y} width="180" height="35" rx="8" fill={e.color} opacity="0.06" />
          {/* Avatar */}
          <circle cx={70} cy={e.y + 17} r="10" fill={e.color} opacity="0.2" />
          <text x={70} y={e.y + 21} textAnchor="middle" fill={e.color} fontSize="8" fontWeight="700">{e.from}</text>
          {/* Subject line */}
          <rect x={88} y={e.y + 11} width={e.subject} height="5" rx="2.5" fill={e.color} opacity="0.2" />
          {/* Preview */}
          <rect x={88} y={e.y + 21} width={e.subject - 20} height="4" rx="2" fill={e.color} opacity="0.1" />
        </g>
      ))}
      {/* Compose button */}
      <g>
        <circle cx="210" cy="205" r="18" fill="#8BAFD4" opacity="0.9" />
        <line x1="203" y1="205" x2="217" y2="205" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <line x1="210" y1="198" x2="210" y2="212" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  )
}

// ─── 7. AI Daan — Chat met sparkles ───────────────────────

export function IllustratieForgie() {
  return (
    <svg width="280" height="260" viewBox="0 0 280 260" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Chat bubble */}
      <rect
        x="50" y="40" width="180" height="160" rx="16"
        fill="currentColor" className="text-card" stroke="#D4836A" strokeWidth="1.5" opacity="0.9"
      />
      {/* Chat tail */}
      <path
        d="M80 200 L70 220 L100 200" fill="currentColor" className="text-card"
        stroke="#D4836A" strokeWidth="1.5" opacity="0.9"
      />
      {/* Typing dots */}
      {[0, 1, 2].map((i) => (
        <circle key={i}
          cx={120 + i * 18} cy="80" r="5" fill="#D4836A" opacity="0.3"
        />
      ))}
      {/* AI-generated text lines */}
      {[0, 1, 2, 3].map((i) => (
        <rect key={i}
          x="75" y={105 + i * 18} width={140 - i * 25} height="6" rx="3"
          fill="#D4836A" opacity="0.2"
        />
      ))}
      {/* Sparkle bursts */}
      {[
        { cx: 200, cy: 50 },
        { cx: 220, cy: 80 },
        { cx: 60, cy: 60 },
      ].map((s, i) => (
        <g key={i}>
          <path
            d={`M${s.cx} ${s.cy - 6}l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z`}
            fill="#D4836A" opacity="0.5"
          />
        </g>
      ))}
    </svg>
  )
}

// ─── Export map ──────────────────────────────────────────────

export const FeatureIllustrations = [
  IllustratieOffertes,
  IllustratieFacturen,
  IllustratieKlanten,
  IllustratieProjecten,
  IllustratieWerkbonnen,
  IllustratiePlanning,
  IllustratieVisualizer,
  IllustratieEmail,
  IllustratieForgie,
]
