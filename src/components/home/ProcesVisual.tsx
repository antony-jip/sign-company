'use client'

import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
  MotionValue,
} from 'framer-motion'
import { useRef } from 'react'
import {
  User,
  ClipboardList,
  Receipt,
  Image as ImageIcon,
  Calendar,
  Smile,
  Check,
} from 'lucide-react'

const PETROL = '#1A535C'
const PETROL_DARK = '#143F46'
const PETROL_SOFT = '#C8D5D7'
const FLAME = '#F15025'
const LINE_SOFT = '#B8B3A8'
const MUTED = '#6B6B66'
const MUTED_SOFT = '#9B9B95'

type LucideIcon = React.ComponentType<{ className?: string; style?: React.CSSProperties; strokeWidth?: number }>

function Sparkle({ cx, cy, size }: { cx: number; cy: number; size: number }) {
  const s = size
  const h = s * 0.28
  const d = `M ${cx} ${cy - s} C ${cx + h} ${cy - h}, ${cx + s} ${cy}, ${cx + s} ${cy} C ${cx + h} ${cy + h}, ${cx} ${cy + s}, ${cx} ${cy + s} C ${cx - h} ${cy + h}, ${cx - s} ${cy}, ${cx - s} ${cy} C ${cx - h} ${cy - h}, ${cx} ${cy - s}, ${cx} ${cy - s} Z`
  return <path d={d} fill={FLAME} />
}

type NodeProps = {
  xPct: number
  yPct: number
  icon: LucideIcon
  label: string
  subtitle?: string
  progress: MotionValue<number>
  size?: number
  tone?: 'light' | 'dark'
  labelPosition?: 'below' | 'above'
}

function FlowNode({
  xPct,
  yPct,
  icon: Icon,
  label,
  subtitle,
  progress,
  size = 58,
  tone = 'light',
  labelPosition = 'below',
}: NodeProps) {
  const opacity = useTransform(progress, [0, 0.4, 1], [0, 1, 1])
  const scale = useTransform(progress, [0, 0.4, 0.7, 1], [0.7, 1.06, 1, 1])
  const haloOpacity = useTransform(progress, [0, 0.3, 0.8, 1], [0, 0.5, 0, 0])
  const haloScale = useTransform(progress, [0, 0.3, 0.9, 1], [0.8, 1.7, 2.2, 2.2])

  const bg = tone === 'dark' ? PETROL_DARK : '#FFFFFF'
  const iconColor = tone === 'dark' ? '#FFFFFF' : PETROL

  return (
    <motion.div
      className="absolute pointer-events-none flex flex-col items-center"
      style={{
        left: `${xPct}%`,
        top: `${yPct}%`,
        translateX: '-50%',
        translateY: '-50%',
        opacity,
      }}
    >
      {labelPosition === 'above' && (
        <LabelBlock label={label} subtitle={subtitle} dir="above" />
      )}
      <div className="relative" style={{ width: size, height: size }}>
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${FLAME}55 0%, ${FLAME}00 70%)`,
            filter: 'blur(6px)',
            opacity: haloOpacity,
            scale: haloScale,
          }}
        />
        <motion.div
          className="relative rounded-full flex items-center justify-center"
          style={{
            width: size,
            height: size,
            backgroundColor: bg,
            border: tone === 'light' ? `1.5px solid ${PETROL}` : 'none',
            boxShadow: tone === 'dark'
              ? '0 8px 28px rgba(20,63,70,0.28)'
              : '0 2px 10px rgba(26,83,92,0.08), 0 10px 24px rgba(26,83,92,0.04)',
            scale,
          }}
        >
          <Icon className="w-[22px] h-[22px]" style={{ color: iconColor }} strokeWidth={1.5} />
        </motion.div>
      </div>
      {labelPosition === 'below' && (
        <LabelBlock label={label} subtitle={subtitle} dir="below" />
      )}
    </motion.div>
  )
}

function LabelBlock({ label, subtitle, dir }: { label: string; subtitle?: string; dir: 'above' | 'below' }) {
  return (
    <div className={`${dir === 'above' ? 'mb-2' : 'mt-2.5'} text-center whitespace-nowrap`}>
      <p
        className="font-heading font-extrabold text-[13px] md:text-[16px] tracking-tight leading-none"
        style={{ color: PETROL }}
      >
        {label}
        <span style={{ color: FLAME }}>.</span>
      </p>
      {subtitle && (
        <p
          className="font-mono text-[8px] md:text-[9px] font-bold tracking-[0.12em] uppercase mt-1"
          style={{ color: MUTED_SOFT }}
        >
          {subtitle}
        </p>
      )}
    </div>
  )
}

function ProjectNode({
  progress,
  blueprintProgress,
  xPct,
  yPct,
}: {
  progress: MotionValue<number>
  blueprintProgress: MotionValue<number>
  xPct: number
  yPct: number
}) {
  const opacity = useTransform(progress, [0, 0.4, 1], [0, 1, 1])
  const scale = useTransform(progress, [0, 0.5, 0.8, 1], [0.85, 1.04, 1, 1])
  const blueprintOpacity = useTransform(blueprintProgress, [0, 0.4, 1], [0, 1, 1])
  const blueprintPath = useTransform(blueprintProgress, [0, 1], [0, 1])

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: `${xPct}%`, top: `${yPct}%`, translateX: '-50%', translateY: '-50%', opacity }}
    >
      <motion.div className="relative flex flex-col items-center" style={{ scale, transformOrigin: 'center' }}>
        <div
          className="relative rounded-lg overflow-hidden"
          style={{
            width: 128,
            height: 96,
            backgroundColor: '#FFFFFF',
            border: `1.5px solid ${PETROL}`,
            boxShadow: '0 2px 10px rgba(26,83,92,0.06), 0 12px 32px rgba(26,83,92,0.08)',
          }}
        >
          <svg viewBox="0 0 128 96" className="absolute inset-0 w-full h-full" aria-hidden>
            <defs>
              <pattern id="blueprintGrid" width="8" height="8" patternUnits="userSpaceOnUse">
                <path d="M 8 0 L 0 0 0 8" fill="none" stroke={PETROL} strokeWidth={0.3} opacity={0.12} />
              </pattern>
            </defs>
            <rect width="128" height="96" fill="url(#blueprintGrid)" />
          </svg>
          <motion.svg viewBox="0 0 128 96" className="absolute inset-0 w-full h-full" style={{ opacity: blueprintOpacity }}>
            <motion.rect x={22} y={26} width={84} height={52} fill="none" stroke={PETROL} strokeWidth={1.3} style={{ pathLength: blueprintPath }} />
            <motion.line x1={56} y1={26} x2={56} y2={78} stroke={PETROL} strokeWidth={1} style={{ pathLength: blueprintPath }} />
            <motion.line x1={22} y1={54} x2={56} y2={54} stroke={PETROL} strokeWidth={1} style={{ pathLength: blueprintPath }} />
            <motion.path d="M 38 54 A 7 7 0 0 1 45 47" fill="none" stroke={PETROL} strokeWidth={0.8} style={{ pathLength: blueprintPath }} />
            <motion.line x1={20} y1={16} x2={108} y2={16} stroke={FLAME} strokeWidth={0.8} strokeDasharray="2.5 2.5" style={{ pathLength: blueprintPath }} />
            <motion.line x1={20} y1={12} x2={20} y2={20} stroke={FLAME} strokeWidth={0.8} style={{ pathLength: blueprintPath }} />
            <motion.line x1={108} y1={12} x2={108} y2={20} stroke={FLAME} strokeWidth={0.8} style={{ pathLength: blueprintPath }} />
            <motion.text x={64} y={12} textAnchor="middle" style={{ fill: FLAME, fontSize: 5.5, fontWeight: 700, letterSpacing: 0.4, opacity: blueprintOpacity }}>
              1200 MM
            </motion.text>
            <motion.circle cx={22} cy={26} r={1.3} fill={FLAME} style={{ opacity: blueprintOpacity }} />
          </motion.svg>
        </div>
        <div className="mt-2.5 text-center">
          <p className="font-heading font-extrabold text-[14px] md:text-[17px] tracking-tight leading-none" style={{ color: PETROL }}>
            Project<span style={{ color: FLAME }}>.</span>
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}

function PortaalNode({
  progress,
  akkoordProgress,
  xPct,
  yPct,
}: {
  progress: MotionValue<number>
  akkoordProgress: MotionValue<number>
  xPct: number
  yPct: number
}) {
  const opacity = useTransform(progress, [0, 0.4, 1], [0, 1, 1])
  const scaleIn = useTransform(progress, [0, 0.45, 0.8, 1], [0.8, 1.05, 1, 1])
  const akkoordOpacity = useTransform(akkoordProgress, [0, 0.35, 1], [0, 1, 1])
  const akkoordScale = useTransform(akkoordProgress, [0, 0.45, 0.75, 1], [0.4, 1.12, 0.97, 1])
  const akkoordRotate = useTransform(akkoordProgress, [0, 0.45, 1], [-4, 2, -2])
  const haloOpacity = useTransform(akkoordProgress, [0, 0.4, 1], [0, 0.45, 0])
  const haloScale = useTransform(akkoordProgress, [0, 1], [0.8, 2.2])

  return (
    <motion.div
      className="absolute pointer-events-none flex flex-col items-center"
      style={{ left: `${xPct}%`, top: `${yPct}%`, translateX: '-50%', translateY: '-50%', opacity }}
    >
      <motion.div
        className="relative rounded-lg flex flex-col items-center"
        style={{
          width: 72,
          height: 92,
          backgroundColor: '#FFFFFF',
          border: `2px solid ${PETROL}`,
          boxShadow: '0 6px 20px rgba(26,83,92,0.15)',
          scale: scaleIn,
          transformOrigin: 'center',
        }}
      >
        <div className="mt-2 rounded-sm relative overflow-hidden" style={{ width: 54, height: 44, backgroundColor: '#F5F4F1' }}>
          <svg viewBox="0 0 54 44" className="absolute inset-0 w-full h-full">
            <circle cx={11} cy={12} r={4} fill="#F6C24B" opacity={0.6} />
            <path d="M 0 38 L 16 22 L 28 30 L 42 18 L 54 28 L 54 44 L 0 44 Z" fill={PETROL} opacity={0.25} />
          </svg>
        </div>
        <motion.div
          className="absolute flex items-center justify-center px-2"
          style={{
            left: '50%',
            bottom: 8,
            translateX: '-50%',
            height: 20,
            minWidth: 56,
            borderRadius: 10,
            backgroundColor: FLAME,
            boxShadow: '0 3px 10px rgba(241,80,37,0.35)',
            opacity: akkoordOpacity,
            scale: akkoordScale,
            rotate: akkoordRotate,
            transformOrigin: 'center',
          }}
        >
          <Check className="w-[10px] h-[10px] text-white" strokeWidth={3} />
          <span className="text-white text-[8px] font-bold ml-0.5 tracking-[0.06em]">Akkoord</span>
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, ${FLAME}66 0%, ${FLAME}00 70%)`,
              filter: 'blur(8px)',
              opacity: haloOpacity,
              scale: haloScale,
              zIndex: -1,
            }}
          />
        </motion.div>
      </motion.div>
      <div className="mt-2.5 text-center whitespace-nowrap">
        <p className="font-heading font-extrabold text-[13px] md:text-[15px] tracking-tight leading-none" style={{ color: PETROL }}>
          Portaal<span style={{ color: FLAME }}>.</span>
        </p>
      </div>
    </motion.div>
  )
}

const PHASE_COPY = [
  'Je klant doet een aanvraag.',
  'Jij maakt er één project van.',
  'Offerte en tekening klaar voor je klant.',
  'Klant geeft akkoord via het portaal.',
  'Inplannen en uitvoeren.',
  'Factuur de deur uit. Gedaan.',
]

function PhaseLine({ index, slot, text }: { index: MotionValue<number>; slot: number; text: string }) {
  const opacity = useTransform(index, (v) => (v === slot ? 1 : 0))
  const translateY = useTransform(index, (v) => (v === slot ? 0 : 4))
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center gap-3"
      style={{ opacity, y: translateY, transition: 'opacity 0.4s ease, transform 0.4s ease' }}
    >
      <span className="font-mono text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: FLAME }}>
        {String(slot + 1).padStart(2, '0')}
      </span>
      <span className="font-sans text-[13px] md:text-[15px] leading-snug" style={{ color: MUTED }}>
        {text}
      </span>
    </motion.div>
  )
}

function PhaseCaption({ index }: { index: MotionValue<number> }) {
  return (
    <div className="relative h-7 mt-4 md:mt-6 text-center">
      {PHASE_COPY.map((txt, i) => (
        <PhaseLine key={i} index={index} slot={i} text={txt} />
      ))}
    </div>
  )
}

export default function ProcesVisual() {
  const sectionRef = useRef<HTMLElement>(null)
  const reduceMotion = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })

  // Spring-smoothed scroll for butter-smooth animations across all phases
  const smooth = useSpring(scrollYProgress, { stiffness: 80, damping: 30, mass: 0.4 })

  // ═════════════ Phase windows (sequential flow) ═════════════
  // 00-10: Klant + arrow to Project
  const pKlant = useTransform(smooth, [0, 0.05], [0.85, 1])
  const pKlantArrow = useTransform(smooth, [0, 0.12], [0.3, 1])

  // 10-22: Project + blueprint
  const pProject = useTransform(smooth, [0.08, 0.22], [0, 1])
  const pProjectBlueprint = useTransform(smooth, [0.14, 0.28], [0, 1])

  // 22-35: Paths to Offerte + Tekening + nodes appearing
  const pBranchPaths = useTransform(smooth, [0.22, 0.36], [0, 1])
  const pOfferte = useTransform(smooth, [0.28, 0.42], [0, 1])
  const pTekening = useTransform(smooth, [0.30, 0.44], [0, 1])

  // 42-55: Merge paths (Offerte → Portaal, Tekening → Portaal)
  const pMergePaths = useTransform(smooth, [0.42, 0.56], [0, 1])

  // 55-68: Portaal + Akkoord stamp
  const pPortaal = useTransform(smooth, [0.52, 0.64], [0, 1])
  const pAkkoord = useTransform(smooth, [0.62, 0.72], [0, 1])

  // 68-78: Planning path + node
  const pPortaalPlanningPath = useTransform(smooth, [0.68, 0.76], [0, 1])
  const pPlanning = useTransform(smooth, [0.72, 0.80], [0, 1])

  // 78-88: Factuur path + node
  const pPlanningFactuurPath = useTransform(smooth, [0.78, 0.84], [0, 1])
  const pFactuur = useTransform(smooth, [0.82, 0.88], [0, 1])

  // 88-98: Gedaan path + node + sparkles
  const pFactuurGedaanPath = useTransform(smooth, [0.86, 0.92], [0, 1])
  const pGedaan = useTransform(smooth, [0.90, 0.96], [0, 1])
  const pSparkles = useTransform(smooth, [0.92, 0.98], [0, 1])
  const pGedaanGlow = useTransform(pGedaan, [0, 1], [0, 0.12])

  // Moving pulse along Klant → Project arrow
  const pulseLeft = useTransform(smooth, [0, 0.04, 0.08, 0.12], ['7%', '13%', '19%', '22%'])
  const pulseOpacity = useTransform(smooth, [0, 0.02, 0.11, 0.13], [0, 1, 1, 0])
  const trailLeft = useTransform(smooth, [0.01, 0.05, 0.09, 0.13], ['7%', '13%', '19%', '22%'])
  const trailOpacity = useTransform(smooth, [0.01, 0.03, 0.12, 0.14], [0, 0.4, 0.4, 0])

  // Phase caption index — 6 phases matching PHASE_COPY
  const copyIndex = useTransform(smooth, (v) => {
    if (v < 0.14) return 0 // Klant
    if (v < 0.28) return 1 // Project
    if (v < 0.52) return 2 // Offerte/Tekening
    if (v < 0.72) return 3 // Portaal + Akkoord
    if (v < 0.88) return 4 // Planning
    return 5 // Factuur + Gedaan
  })

  if (reduceMotion) {
    return (
      <section className="py-20 md:py-28 bg-white">
        <div className="container-site text-center">
          <p className="font-mono text-[12px] font-bold tracking-[0.2em] uppercase mb-4" style={{ color: FLAME }}>Hoe het werkt</p>
          <h2 className="font-heading text-[28px] md:text-[40px] font-extrabold tracking-[-1.5px] leading-[1.05]" style={{ color: PETROL }}>
            Eén project. Alles geregeld<span style={{ color: FLAME }}>.</span>
          </h2>
          <p className="text-[16px] md:text-[18px] mt-3 leading-relaxed" style={{ color: MUTED }}>
            Van klant tot oplevering. In één cockpit.
          </p>
          <ol className="mt-10 max-w-2xl mx-auto space-y-3 text-left">
            {[
              ['Klant', 'Doet aanvraag.'],
              ['Project', 'Alles komt samen in één cockpit.'],
              ['Offerte + Tekening', 'Klaar voor je klant.'],
              ['Portaal', 'Klant keurt goed met één klik.'],
              ['Planning', 'Inplannen en uitvoeren.'],
              ['Factuur', 'De deur uit. Gedaan.'],
            ].map(([t, d], i) => (
              <li key={i} className="flex gap-3 items-baseline">
                <span className="font-mono text-[12px] font-bold" style={{ color: FLAME }}>0{i + 1}</span>
                <p className="text-[15px]" style={{ color: PETROL }}>
                  <strong>{t}.</strong> <span style={{ color: MUTED }}>{d}</span>
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    )
  }

  return (
    <section ref={sectionRef} className="bg-white relative">
      <div style={{ height: '240vh' }}>
        <div className="sticky top-0 h-screen flex flex-col items-center justify-center py-4 md:py-6 bg-white overflow-hidden">
          <div className="container-site w-full">
            <div className="text-center mb-4 md:mb-6">
              <p className="font-mono text-[11px] md:text-[12px] font-bold tracking-[0.2em] uppercase mb-2 md:mb-3" style={{ color: FLAME }}>
                Hoe het werkt
              </p>
              <h2 className="font-heading text-[24px] md:text-[36px] font-extrabold tracking-[-1.5px] leading-[1.05]" style={{ color: PETROL }}>
                Eén project. Alles geregeld<span style={{ color: FLAME }}>.</span>
              </h2>
              <motion.p className="text-[13px] md:text-[15px] mt-2 leading-relaxed" style={{ color: MUTED }}>
                Van klant tot oplevering. In één cockpit.
              </motion.p>
            </div>

            <div
              className="relative w-full mx-auto rounded-2xl bg-white"
              style={{
                aspectRatio: '1200 / 600',
                maxWidth: 'min(1000px, calc((100vh - 240px) * 2))',
                border: '1px solid rgba(26,83,92,0.06)',
                boxShadow: '0 1px 2px rgba(26,83,92,0.04), 0 8px 24px rgba(26,83,92,0.06), 0 24px 60px rgba(26,83,92,0.05)',
              }}
            >
              <svg viewBox="0 0 1200 600" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <marker id="procesArrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
                    <path d="M 0 0 L 9 4.5 L 0 9 z" fill={FLAME} />
                  </marker>
                  <linearGradient id="gradProject" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={PETROL} stopOpacity={0.7} />
                    <stop offset="100%" stopColor={PETROL} stopOpacity={0.4} />
                  </linearGradient>
                  <linearGradient id="gradPortaal" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={PETROL} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={PETROL} stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="gradFinish" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={PETROL} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={FLAME} stopOpacity={0.7} />
                  </linearGradient>
                  <pattern id="cardDots" width="28" height="28" patternUnits="userSpaceOnUse">
                    <circle cx="14" cy="14" r="0.7" fill={PETROL} opacity={0.07} />
                  </pattern>
                </defs>

                <rect width="1200" height="600" fill="url(#cardDots)" />

                {/* 1. Klant → Project (flame arrow, emphasized entry) */}
                <motion.path
                  d="M 120 300 L 230 300"
                  stroke={FLAME}
                  strokeWidth={2}
                  strokeLinecap="round"
                  fill="none"
                  markerEnd="url(#procesArrow)"
                  style={{ pathLength: pKlantArrow }}
                />

                {/* 2. Project → Offerte (up-right) */}
                <motion.path
                  d="M 304 270 Q 400 210 466 170"
                  stroke="url(#gradProject)"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  fill="none"
                  style={{ pathLength: pBranchPaths }}
                />
                {/* 3. Project → Tekening (down-right) */}
                <motion.path
                  d="M 304 330 Q 400 390 466 430"
                  stroke="url(#gradProject)"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  fill="none"
                  style={{ pathLength: pBranchPaths }}
                />

                {/* 4. Offerte → Portaal (merge down-right) */}
                <motion.path
                  d="M 518 180 Q 610 240 680 280"
                  stroke="url(#gradPortaal)"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  fill="none"
                  style={{ pathLength: pMergePaths }}
                />
                {/* 5. Tekening → Portaal (merge up-right) */}
                <motion.path
                  d="M 518 420 Q 610 360 680 320"
                  stroke="url(#gradPortaal)"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  fill="none"
                  style={{ pathLength: pMergePaths }}
                />

                {/* 6. Portaal → Planning (straight, subtle) */}
                <motion.path
                  d="M 736 300 L 860 300"
                  stroke="url(#gradFinish)"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  fill="none"
                  style={{ pathLength: pPortaalPlanningPath }}
                />

                {/* 7. Planning → Factuur */}
                <motion.path
                  d="M 912 300 L 1020 300"
                  stroke="url(#gradFinish)"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  fill="none"
                  style={{ pathLength: pPlanningFactuurPath }}
                />

                {/* 8. Factuur → Gedaan */}
                <motion.path
                  d="M 1072 300 L 1130 300"
                  stroke="url(#gradFinish)"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  fill="none"
                  style={{ pathLength: pFactuurGedaanPath }}
                />

                {/* Ambient glow under Gedaan */}
                <motion.ellipse
                  cx={1152}
                  cy={340}
                  rx={70}
                  ry={22}
                  fill={FLAME}
                  style={{ opacity: pGedaanGlow, filter: 'blur(10px)' }}
                />

                {/* Sparkles around Gedaan */}
                <motion.g style={{ opacity: pSparkles }}>
                  <Sparkle cx={1110} cy={276} size={4} />
                  <Sparkle cx={1180} cy={276} size={4} />
                  <Sparkle cx={1115} cy={332} size={2.6} />
                  <Sparkle cx={1185} cy={332} size={2.6} />
                  <Sparkle cx={1152} cy={258} size={3} />
                  <Sparkle cx={1080} cy={300} size={2} />
                  <Sparkle cx={1216} cy={300} size={2} />
                </motion.g>
              </svg>

              {/* Pulse trail behind primary orb */}
              <motion.span
                aria-hidden
                className="absolute pointer-events-none rounded-full"
                style={{
                  left: trailLeft,
                  top: '50%',
                  width: 22,
                  height: 22,
                  marginLeft: -11,
                  marginTop: -11,
                  background: `radial-gradient(circle, ${FLAME}88 0%, ${FLAME}00 60%)`,
                  filter: 'blur(4px)',
                  opacity: trailOpacity,
                }}
              />
              {/* Primary pulse orb — travels along Klant → Project arrow */}
              <motion.span
                aria-hidden
                className="absolute pointer-events-none rounded-full"
                style={{
                  left: pulseLeft,
                  top: '50%',
                  width: 12,
                  height: 12,
                  marginLeft: -6,
                  marginTop: -6,
                  background: `radial-gradient(circle, #FFFFFF 0%, ${FLAME} 40%, ${FLAME}00 85%)`,
                  opacity: pulseOpacity,
                }}
              />

              {/* Nodes — sequential flow */}
              <FlowNode xPct={7} yPct={50} icon={User} label="Klant" subtitle="Doet aanvraag" progress={pKlant} />
              <ProjectNode xPct={22} yPct={50} progress={pProject} blueprintProgress={pProjectBlueprint} />

              <FlowNode xPct={40} yPct={22} icon={ClipboardList} label="Offerte" subtitle="Calculeer en verstuur" progress={pOfferte} labelPosition="above" />
              <FlowNode xPct={40} yPct={78} icon={ImageIcon} label="Tekening" subtitle="Drukproef en akkoord" progress={pTekening} labelPosition="below" />

              <PortaalNode xPct={57} yPct={50} progress={pPortaal} akkoordProgress={pAkkoord} />

              <FlowNode xPct={73} yPct={50} icon={Calendar} label="Planning" subtitle="Werkbon en montage" progress={pPlanning} />
              <FlowNode xPct={86} yPct={50} icon={Receipt} label="Factuur" subtitle="Incasseer eenvoudig" progress={pFactuur} />
              <FlowNode xPct={96} yPct={50} icon={Smile} label="Gedaan" progress={pGedaan} tone="dark" size={64} />
            </div>

            <PhaseCaption index={copyIndex} />
          </div>
        </div>
      </div>
    </section>
  )
}
