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

// ─── 4. Werkbonnen — Clipboard met checks ───────────────────

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

// ─── 6. AI Forgie — Chat met sparkles ───────────────────────

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
  IllustratieWerkbonnen,
  IllustratiePlanning,
  IllustratieForgie,
]
