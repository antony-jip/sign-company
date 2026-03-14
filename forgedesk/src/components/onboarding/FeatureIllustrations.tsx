import React from 'react'
import { motion } from 'framer-motion'

const spring = { type: 'spring' as const, stiffness: 300, damping: 25 }

// ─── 1. Offertes — Document met regelitems ──────────────────

export function IllustratieOffertes() {
  return (
    <svg width="280" height="260" viewBox="0 0 280 260" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Paper */}
      <motion.rect
        x="50" y="20" width="180" height="220" rx="12"
        fill="currentColor" className="text-card" stroke="#E8866A" strokeWidth="1.5" opacity="0.9"
        initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 0.9 }}
        transition={{ ...spring, delay: 0.1 }}
      />
      {/* Header bar */}
      <motion.rect
        x="70" y="40" width="100" height="8" rx="4" fill="#E8866A" opacity="0.3"
        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} style={{ originX: 0 }}
        transition={{ ...spring, delay: 0.25 }}
      />
      {/* Line items */}
      {[0, 1, 2, 3].map((i) => (
        <motion.g key={i}
          initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
          transition={{ ...spring, delay: 0.35 + i * 0.1 }}
        >
          <rect x="70" y={72 + i * 28} width={120 - i * 15} height="6" rx="3" fill="#E8866A" opacity={0.15 + i * 0.05} />
          <rect x="200" y={72 + i * 28} width="20" height="6" rx="3" fill="#E8866A" opacity="0.2" />
        </motion.g>
      ))}
      {/* Divider */}
      <motion.line
        x1="70" y1="190" x2="210" y2="190" stroke="#E8866A" strokeWidth="1" opacity="0.2"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      />
      {/* Total */}
      <motion.rect
        x="160" y="200" width="50" height="8" rx="4" fill="#E8866A" opacity="0.4"
        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} style={{ originX: 1 }}
        transition={{ ...spring, delay: 0.8 }}
      />
      {/* PDF badge */}
      <motion.g
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.9 }}
      >
        <rect x="195" y="25" width="40" height="20" rx="6" fill="#E8866A" />
        <text x="215" y="39" textAnchor="middle" fill="white" fontSize="9" fontWeight="700">PDF</text>
      </motion.g>
    </svg>
  )
}

// ─── 2. Facturen — Invoice met betaalstatus ─────────────────

export function IllustratieFacturen() {
  return (
    <svg width="280" height="260" viewBox="0 0 280 260" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Paper */}
      <motion.rect
        x="50" y="20" width="180" height="220" rx="12"
        fill="currentColor" className="text-card" stroke="#7EB5A6" strokeWidth="1.5" opacity="0.9"
        initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 0.9 }}
        transition={{ ...spring, delay: 0.1 }}
      />
      {/* Euro symbol */}
      <motion.text
        x="140" y="85" textAnchor="middle" fill="#7EB5A6" fontSize="36" fontWeight="800" opacity="0.2"
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
      >€</motion.text>
      {/* Amount */}
      <motion.rect
        x="95" y="100" width="90" height="10" rx="5" fill="#7EB5A6" opacity="0.3"
        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} style={{ originX: 0.5 }}
        transition={{ ...spring, delay: 0.35 }}
      />
      {/* Progress bar bg */}
      <motion.rect
        x="80" y="130" width="120" height="8" rx="4" fill="#7EB5A6" opacity="0.1"
        initial={{ opacity: 0 }} animate={{ opacity: 0.1 }}
        transition={{ delay: 0.4 }}
      />
      {/* Progress bar fill */}
      <motion.rect
        x="80" y="130" width="120" height="8" rx="4" fill="#7EB5A6" opacity="0.5"
        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} style={{ originX: 0 }}
        transition={{ duration: 1.2, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      />
      {/* Detail lines */}
      {[0, 1].map((i) => (
        <motion.rect key={i}
          x="80" y={155 + i * 18} width={90 - i * 20} height="5" rx="2.5" fill="#7EB5A6" opacity="0.15"
          initial={{ x: -15, opacity: 0 }} animate={{ x: 0, opacity: 0.15 }}
          transition={{ ...spring, delay: 0.6 + i * 0.1 }}
        />
      ))}
      {/* Betaald badge */}
      <motion.g
        initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: -8 }}
        transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 1.0 }}
      >
        <rect x="145" y="185" width="70" height="26" rx="8" fill="#7EB5A6" />
        <text x="180" y="202" textAnchor="middle" fill="white" fontSize="10" fontWeight="700">Betaald ✓</text>
      </motion.g>
    </svg>
  )
}

// ─── 3. Klanten — Contact kaarten ───────────────────────────

export function IllustratieKlanten() {
  const cards = [
    { x: 40, y: 30, delay: 0.15, initials: 'JB', color: '#8BAFD4' },
    { x: 110, y: 50, delay: 0.25, initials: 'PJ', color: '#9B8EC4' },
    { x: 40, y: 120, delay: 0.35, initials: 'LV', color: '#E8866A' },
    { x: 110, y: 140, delay: 0.45, initials: 'MK', color: '#7EB5A6' },
  ]

  return (
    <svg width="280" height="260" viewBox="0 0 280 260" fill="none" xmlns="http://www.w3.org/2000/svg">
      {cards.map((card, i) => (
        <motion.g key={i}
          initial={{ y: 25, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ ...spring, delay: card.delay }}
        >
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
        </motion.g>
      ))}
    </svg>
  )
}

// ─── 4. Projecten — Kanban bord ──────────────────────────────

export function IllustratieProjecten() {
  const columns = [
    { x: 42, label: 'Todo', color: '#8BAFD4', cards: [{ h: 30, delay: 0.3 }, { h: 22, delay: 0.4 }] },
    { x: 112, label: 'Bezig', color: '#E8866A', cards: [{ h: 35, delay: 0.35 }, { h: 25, delay: 0.45 }, { h: 20, delay: 0.55 }] },
    { x: 182, label: 'Klaar', color: '#7EB5A6', cards: [{ h: 28, delay: 0.5 }] },
  ]

  return (
    <svg width="280" height="260" viewBox="0 0 280 260" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Board bg */}
      <motion.rect
        x="30" y="25" width="220" height="210" rx="12"
        fill="currentColor" className="text-card" stroke="#8BAFD4" strokeWidth="1.5" opacity="0.9"
        initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 0.9 }}
        transition={{ ...spring, delay: 0.1 }}
      />
      {/* Columns */}
      {columns.map((col, ci) => (
        <motion.g key={ci}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.15 + ci * 0.08 }}
        >
          {/* Column header */}
          <rect x={col.x} y="42" width="58" height="6" rx="3" fill={col.color} opacity="0.35" />
          {/* Divider */}
          <line x1={col.x} y1="58" x2={col.x + 58} y2="58" stroke={col.color} strokeWidth="0.5" opacity="0.2" />
          {/* Cards */}
          {col.cards.map((card, i) => {
            const y = 66 + i * (card.h + 8)
            return (
              <motion.g key={i}
                initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                transition={{ ...spring, delay: card.delay }}
              >
                <rect x={col.x} y={y} width="58" height={card.h} rx="6"
                  fill={col.color} opacity="0.1" stroke={col.color} strokeWidth="0.8" />
                <rect x={col.x + 8} y={y + 8} width="30" height="4" rx="2" fill={col.color} opacity="0.25" />
                {card.h > 24 && (
                  <rect x={col.x + 8} y={y + 16} width="20" height="3" rx="1.5" fill={col.color} opacity="0.12" />
                )}
              </motion.g>
            )
          })}
        </motion.g>
      ))}
    </svg>
  )
}

// ─── 5. Werkbonnen — Clipboard met checks ───────────────────

export function IllustratieWerkbonnen() {
  return (
    <svg width="280" height="260" viewBox="0 0 280 260" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Clipboard */}
      <motion.rect
        x="60" y="30" width="160" height="200" rx="12"
        fill="currentColor" className="text-card" stroke="#C4A882" strokeWidth="1.5" opacity="0.9"
        initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 0.9 }}
        transition={{ ...spring, delay: 0.1 }}
      />
      {/* Clip */}
      <motion.rect
        x="110" y="18" width="60" height="24" rx="8"
        fill="#C4A882" opacity="0.3"
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} style={{ originY: 0 }}
        transition={{ ...spring, delay: 0.15 }}
      />
      {/* Checklist items */}
      {[0, 1, 2, 3].map((i) => (
        <motion.g key={i}
          initial={{ x: -15, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
          transition={{ ...spring, delay: 0.3 + i * 0.12 }}
        >
          {/* Checkbox */}
          <rect x="82" y={65 + i * 34} width="16" height="16" rx="4"
            fill={i < 3 ? '#C4A882' : 'none'} stroke="#C4A882" strokeWidth="1.5" opacity={i < 3 ? 0.25 : 0.15} />
          {/* Checkmark */}
          {i < 3 && (
            <motion.path
              d={`M${86} ${73 + i * 34}l3 3 5-6`}
              stroke="#C4A882" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: 0.3, delay: 0.5 + i * 0.15 }}
            />
          )}
          {/* Text */}
          <rect x="108" y={68 + i * 34} width={80 - i * 10} height="6" rx="3" fill="#C4A882" opacity="0.18" />
        </motion.g>
      ))}
      {/* Camera icon hint */}
      <motion.circle
        cx="185" cy="200" r="14" fill="#C4A882" opacity="0.15"
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.85 }}
      />
      {/* Signature line */}
      <motion.path
        d="M90 205 Q110 195 130 205 Q150 215 170 200"
        stroke="#C4A882" strokeWidth="1.5" fill="none" opacity="0.3" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, delay: 0.9, ease: 'easeOut' }}
      />
    </svg>
  )
}

// ─── 5. Planning — Weekkalender ─────────────────────────────

export function IllustratiePlanning() {
  const blocks = [
    { x: 62, y: 90, w: 45, h: 50, color: '#9B8EC4', delay: 0.3 },
    { x: 62, y: 155, w: 45, h: 30, color: '#7EB5A6', delay: 0.4 },
    { x: 117, y: 75, w: 45, h: 35, color: '#E8866A', delay: 0.35 },
    { x: 117, y: 130, w: 45, h: 60, color: '#8BAFD4', delay: 0.45 },
    { x: 172, y: 90, w: 45, h: 40, color: '#C4A882', delay: 0.5 },
    { x: 172, y: 145, w: 45, h: 45, color: '#9B8EC4', delay: 0.55 },
  ]

  return (
    <svg width="280" height="260" viewBox="0 0 280 260" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Calendar frame */}
      <motion.rect
        x="45" y="25" width="190" height="210" rx="12"
        fill="currentColor" className="text-card" stroke="#9B8EC4" strokeWidth="1.5" opacity="0.9"
        initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 0.9 }}
        transition={{ ...spring, delay: 0.1 }}
      />
      {/* Day headers */}
      {['Ma', 'Di', 'Wo'].map((day, i) => (
        <motion.text key={day}
          x={84 + i * 55} y="55" textAnchor="middle" fill="#9B8EC4" fontSize="10" fontWeight="600" opacity="0.5"
          initial={{ opacity: 0 }} animate={{ opacity: 0.5 }}
          transition={{ delay: 0.2 + i * 0.05 }}
        >{day}</motion.text>
      ))}
      {/* Grid lines */}
      <motion.line x1="107" y1="62" x2="107" y2="220" stroke="#9B8EC4" strokeWidth="0.5" opacity="0.1"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.2 }} />
      <motion.line x1="162" y1="62" x2="162" y2="220" stroke="#9B8EC4" strokeWidth="0.5" opacity="0.1"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.25 }} />
      {/* Calendar blocks */}
      {blocks.map((b, i) => (
        <motion.rect key={i}
          x={b.x} y={b.y} width={b.w} height={b.h} rx="6"
          fill={b.color} opacity="0.2"
          initial={{ scaleY: 0, opacity: 0 }} animate={{ scaleY: 1, opacity: 0.2 }}
          style={{ originY: 0 }}
          transition={{ type: 'spring', stiffness: 250, damping: 20, delay: b.delay }}
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
      <motion.rect
        x="45" y="25" width="190" height="200" rx="12"
        fill="currentColor" className="text-card" stroke="#B8A076" strokeWidth="1.5" opacity="0.9"
        initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 0.9 }}
        transition={{ ...spring, delay: 0.1 }}
      />
      {/* Design preview area */}
      <motion.rect
        x="60" y="45" width="120" height="80" rx="8"
        fill="#B8A076" opacity="0.06" stroke="#B8A076" strokeWidth="1" strokeDasharray="4 3"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
      />
      {/* Shape 1 - rectangle */}
      <motion.rect
        x="75" y="60" width="40" height="30" rx="4" fill="#E8866A" opacity="0.2"
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.35 }}
      />
      {/* Shape 2 - circle */}
      <motion.circle
        cx="145" cy="85" r="18" fill="#9B8EC4" opacity="0.2"
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.45 }}
      />
      {/* Pen tool path */}
      <motion.path
        d="M80 100 Q100 70 130 90 Q155 110 165 80"
        stroke="#B8A076" strokeWidth="2" fill="none" opacity="0.5" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      />
      {/* Color palette */}
      {[
        { cx: 72, color: '#E8866A', delay: 0.6 },
        { cx: 92, color: '#7EB5A6', delay: 0.65 },
        { cx: 112, color: '#8BAFD4', delay: 0.7 },
        { cx: 132, color: '#9B8EC4', delay: 0.75 },
        { cx: 152, color: '#B8A076', delay: 0.8 },
      ].map((dot, i) => (
        <motion.circle key={i}
          cx={dot.cx} cy="150" r="8" fill={dot.color} opacity="0.4"
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15, delay: dot.delay }}
        />
      ))}
      {/* Tool icons area */}
      <motion.g
        initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
        transition={{ ...spring, delay: 0.85 }}
      >
        <rect x="195" y="50" width="28" height="28" rx="6" fill="#B8A076" opacity="0.12" />
        <rect x="195" y="86" width="28" height="28" rx="6" fill="#B8A076" opacity="0.08" />
        <rect x="195" y="122" width="28" height="28" rx="6" fill="#B8A076" opacity="0.05" />
      </motion.g>
      {/* Layers hint */}
      <motion.rect
        x="60" y="175" width="160" height="8" rx="4" fill="#B8A076" opacity="0.1"
        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} style={{ originX: 0 }}
        transition={{ ...spring, delay: 0.9 }}
      />
      <motion.rect
        x="60" y="190" width="100" height="6" rx="3" fill="#B8A076" opacity="0.07"
        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} style={{ originX: 0 }}
        transition={{ ...spring, delay: 0.95 }}
      />
    </svg>
  )
}

// ─── 8. Email — Inbox met berichten ─────────────────────────

export function IllustratieEmail() {
  const emails = [
    { y: 55, from: 'AB', subject: 95, color: '#8BAFD4', delay: 0.25 },
    { y: 100, from: 'PJ', subject: 75, color: '#9B8EC4', delay: 0.35 },
    { y: 145, from: 'LV', subject: 85, color: '#E8866A', delay: 0.45 },
  ]

  return (
    <svg width="280" height="260" viewBox="0 0 280 260" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Inbox frame */}
      <motion.rect
        x="40" y="25" width="200" height="210" rx="12"
        fill="currentColor" className="text-card" stroke="#8BAFD4" strokeWidth="1.5" opacity="0.9"
        initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 0.9 }}
        transition={{ ...spring, delay: 0.1 }}
      />
      {/* Header */}
      <motion.rect
        x="60" y="40" width="50" height="7" rx="3.5" fill="#8BAFD4" opacity="0.3"
        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} style={{ originX: 0 }}
        transition={{ ...spring, delay: 0.2 }}
      />
      {/* Email rows */}
      {emails.map((e, i) => (
        <motion.g key={i}
          initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
          transition={{ ...spring, delay: e.delay }}
        >
          {/* Row bg */}
          <rect x="50" y={e.y} width="180" height="35" rx="8" fill={e.color} opacity="0.06" />
          {/* Avatar */}
          <circle cx={70} cy={e.y + 17} r="10" fill={e.color} opacity="0.2" />
          <text x={70} y={e.y + 21} textAnchor="middle" fill={e.color} fontSize="8" fontWeight="700">{e.from}</text>
          {/* Subject line */}
          <rect x={88} y={e.y + 11} width={e.subject} height="5" rx="2.5" fill={e.color} opacity="0.2" />
          {/* Preview */}
          <rect x={88} y={e.y + 21} width={e.subject - 20} height="4" rx="2" fill={e.color} opacity="0.1" />
        </motion.g>
      ))}
      {/* Compose button */}
      <motion.g
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.7 }}
      >
        <circle cx="210" cy="205" r="18" fill="#8BAFD4" opacity="0.9" />
        <line x1="203" y1="205" x2="217" y2="205" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <line x1="210" y1="198" x2="210" y2="212" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </motion.g>
    </svg>
  )
}

// ─── 7. AI Forgie — Chat met sparkles ───────────────────────

export function IllustratieForgie() {
  return (
    <svg width="280" height="260" viewBox="0 0 280 260" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Chat bubble */}
      <motion.rect
        x="50" y="40" width="180" height="160" rx="16"
        fill="currentColor" className="text-card" stroke="#D4836A" strokeWidth="1.5" opacity="0.9"
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 0.9 }}
        transition={{ ...spring, delay: 0.1 }}
      />
      {/* Chat tail */}
      <motion.path
        d="M80 200 L70 220 L100 200" fill="currentColor" className="text-card"
        stroke="#D4836A" strokeWidth="1.5" opacity="0.9"
        initial={{ opacity: 0 }} animate={{ opacity: 0.9 }}
        transition={{ delay: 0.2 }}
      />
      {/* Typing dots */}
      {[0, 1, 2].map((i) => (
        <motion.circle key={i}
          cx={120 + i * 18} cy="80" r="5" fill="#D4836A" opacity="0.3"
          animate={{ y: [0, -6, 0], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 0.8, delay: 0.3 + i * 0.15, repeat: 2 }}
        />
      ))}
      {/* AI-generated text lines appearing */}
      {[0, 1, 2, 3].map((i) => (
        <motion.rect key={i}
          x="75" y={105 + i * 18} width={140 - i * 25} height="6" rx="3"
          fill="#D4836A" opacity="0.2"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 0.2 }}
          style={{ originX: 0 }}
          transition={{ duration: 0.4, delay: 1.2 + i * 0.2, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
      {/* Sparkle bursts */}
      {[
        { cx: 200, cy: 50, delay: 0.8 },
        { cx: 220, cy: 80, delay: 1.0 },
        { cx: 60, cy: 60, delay: 1.1 },
      ].map((s, i) => (
        <motion.g key={i}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0.6] }}
          transition={{ duration: 0.5, delay: s.delay }}
        >
          <path
            d={`M${s.cx} ${s.cy - 6}l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z`}
            fill="#D4836A" opacity="0.5"
          />
        </motion.g>
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
