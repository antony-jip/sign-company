'use client'

import {
  motion,
  useScroll,
  useTransform,
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
}

function FlowNode({
  xPct,
  yPct,
  icon: Icon,
  label,
  subtitle,
  progress,
  size = 64,
  tone = 'light',
}: NodeProps) {
  const opacity = useTransform(progress, [0, 0.4, 1], [0, 1, 1])
  const scale = useTransform(progress, [0, 0.4, 0.7, 1], [0.88, 1.04, 1, 1])
  const haloOpacity = useTransform(progress, [0, 0.3, 0.8, 1], [0, 0.55, 0, 0])
  const haloScale = useTransform(progress, [0, 0.3, 0.9, 1], [0.8, 1.6, 2.1, 2.1])

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
          <Icon className="w-[26px] h-[26px]" style={{ color: iconColor }} strokeWidth={1.5} />
        </motion.div>
      </div>
      <div className="mt-3 text-center whitespace-nowrap">
        <p
          className="font-heading font-extrabold text-[15px] md:text-[18px] tracking-tight leading-none"
          style={{ color: PETROL }}
        >
          {label}
          <span style={{ color: FLAME }}>.</span>
        </p>
        {subtitle && (
          <p
            className="font-mono text-[9px] md:text-[10px] font-bold tracking-[0.12em] uppercase mt-1.5"
            style={{ color: MUTED_SOFT }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </motion.div>
  )
}

function ProjectNode({
  progress,
  blueprintProgress,
}: {
  progress: MotionValue<number>
  blueprintProgress: MotionValue<number>
}) {
  const opacity = useTransform(progress, [0, 0.4, 1], [0, 1, 1])
  const scale = useTransform(progress, [0, 0.5, 0.8, 1], [0.9, 1.02, 1, 1])
  const blueprintOpacity = useTransform(blueprintProgress, [0, 0.4, 1], [0, 1, 1])
  const blueprintPath = useTransform(blueprintProgress, [0, 1], [0, 1])

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: '50%', top: '18%', translateX: '-50%', translateY: '-50%', opacity }}
    >
      <motion.div className="relative flex flex-col items-center" style={{ scale, transformOrigin: 'center' }}>
        <div
          className="relative rounded-xl overflow-hidden"
          style={{
            width: 152,
            height: 116,
            backgroundColor: '#FFFFFF',
            border: `1.5px solid ${PETROL}`,
            boxShadow: '0 2px 10px rgba(26,83,92,0.06), 0 12px 32px rgba(26,83,92,0.08)',
          }}
        >
          <svg viewBox="0 0 152 116" className="absolute inset-0 w-full h-full" aria-hidden>
            <defs>
              <pattern id="blueprintGrid" width="8" height="8" patternUnits="userSpaceOnUse">
                <path d="M 8 0 L 0 0 0 8" fill="none" stroke={PETROL} strokeWidth={0.3} opacity={0.12} />
              </pattern>
            </defs>
            <rect width="152" height="116" fill="url(#blueprintGrid)" />
          </svg>
          <motion.svg
            viewBox="0 0 152 116"
            className="absolute inset-0 w-full h-full"
            style={{ opacity: blueprintOpacity }}
          >
            <motion.rect x={28} y={32} width={98} height={60} fill="none" stroke={PETROL} strokeWidth={1.3} style={{ pathLength: blueprintPath }} />
            <motion.line x1={66} y1={32} x2={66} y2={92} stroke={PETROL} strokeWidth={1} style={{ pathLength: blueprintPath }} />
            <motion.line x1={28} y1={64} x2={66} y2={64} stroke={PETROL} strokeWidth={1} style={{ pathLength: blueprintPath }} />
            <motion.path d="M 46 64 A 8 8 0 0 1 54 56" fill="none" stroke={PETROL} strokeWidth={0.8} style={{ pathLength: blueprintPath }} />
            <motion.line x1={46} y1={64} x2={54} y2={56} stroke={PETROL} strokeWidth={0.8} style={{ pathLength: blueprintPath }} />
            <motion.line x1={84} y1={31} x2={108} y2={31} stroke="#FFFFFF" strokeWidth={2} style={{ pathLength: blueprintPath }} />
            <motion.line x1={84} y1={31} x2={108} y2={31} stroke={PETROL} strokeWidth={0.6} style={{ pathLength: blueprintPath }} />
            <motion.line x1={24} y1={20} x2={128} y2={20} stroke={FLAME} strokeWidth={0.8} strokeDasharray="2.5 2.5" style={{ pathLength: blueprintPath }} />
            <motion.line x1={24} y1={16} x2={24} y2={24} stroke={FLAME} strokeWidth={0.8} style={{ pathLength: blueprintPath }} />
            <motion.line x1={128} y1={16} x2={128} y2={24} stroke={FLAME} strokeWidth={0.8} style={{ pathLength: blueprintPath }} />
            <motion.text x={76} y={15} textAnchor="middle" style={{ fill: FLAME, fontSize: 6, fontWeight: 700, letterSpacing: 0.5, opacity: blueprintOpacity }}>
              1200 MM
            </motion.text>
            <motion.circle cx={28} cy={32} r={1.5} fill={FLAME} style={{ opacity: blueprintOpacity }} />
          </motion.svg>
        </div>
        <div className="mt-3 text-center">
          <p className="font-heading font-extrabold text-[17px] md:text-[20px] tracking-tight" style={{ color: PETROL }}>
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
}: {
  progress: MotionValue<number>
  akkoordProgress: MotionValue<number>
}) {
  const opacity = useTransform(progress, [0, 0.4, 1], [0, 1, 1])
  const translateY = useTransform(progress, [0, 1], [12, 0])
  const akkoordOpacity = useTransform(akkoordProgress, [0, 0.35, 1], [0, 1, 1])
  const akkoordScale = useTransform(akkoordProgress, [0, 0.45, 0.75, 1], [0.4, 1.12, 0.97, 1])
  const akkoordRotate = useTransform(akkoordProgress, [0, 0.45, 1], [-4, 2, -2])
  const haloOpacity = useTransform(akkoordProgress, [0, 0.4, 1], [0, 0.45, 0])
  const haloScale = useTransform(akkoordProgress, [0, 1], [0.8, 2.2])

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: '50%', top: '52%', translateX: '-50%', translateY: '-50%', opacity }}
    >
      <motion.div
        className="relative rounded-lg flex flex-col items-center"
        style={{
          width: 84,
          height: 108,
          backgroundColor: '#FFFFFF',
          border: `2px solid ${PETROL}`,
          boxShadow: '0 6px 20px rgba(26,83,92,0.15)',
          translateY,
        }}
      >
        <div className="mt-2 rounded-sm relative overflow-hidden" style={{ width: 64, height: 54, backgroundColor: '#F5F4F1' }}>
          <svg viewBox="0 0 64 54" className="absolute inset-0 w-full h-full">
            <circle cx={14} cy={14} r={5} fill="#F6C24B" opacity={0.6} />
            <path d="M 0 46 L 20 28 L 34 38 L 50 22 L 64 34 L 64 54 L 0 54 Z" fill={PETROL} opacity={0.25} />
            <path d="M 24 54 L 24 40 L 34 40 L 34 54" stroke={PETROL} strokeWidth={0.8} fill="none" opacity={0.6} />
          </svg>
        </div>
        <motion.div
          className="absolute flex items-center justify-center px-2"
          style={{
            left: '50%',
            bottom: 10,
            translateX: '-50%',
            height: 22,
            minWidth: 64,
            borderRadius: 11,
            backgroundColor: FLAME,
            boxShadow: '0 3px 10px rgba(241,80,37,0.35)',
            opacity: akkoordOpacity,
            scale: akkoordScale,
            rotate: akkoordRotate,
            transformOrigin: 'center',
          }}
        >
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
          <span className="text-white text-[9px] font-bold ml-0.5 tracking-[0.06em]">Akkoord</span>
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
      <div className="mt-2 text-center whitespace-nowrap">
        <p className="font-heading font-extrabold text-[13px] md:text-[14px] tracking-tight" style={{ color: PETROL }}>
          Portaal<span style={{ color: FLAME }}>.</span>
        </p>
      </div>
    </motion.div>
  )
}

const PHASE_COPY = [
  'Je klant doet een aanvraag.',
  'Jij maakt er één project van.',
  'Offerte, factuur, tekening, planning. Uit één hand.',
  'Jouw klant keurt goed via het portaal.',
  'Gedaan. Door naar de volgende.',
]

function PhaseLine({ index, slot, text }: { index: MotionValue<number>; slot: number; text: string }) {
  const opacity = useTransform(index, (v) => (v === slot ? 1 : 0))
  const translateY = useTransform(index, (v) => (v === slot ? 0 : 4))
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center gap-3"
      style={{ opacity, y: translateY, transition: 'opacity 0.35s, transform 0.35s' }}
    >
      <span className="font-mono text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: FLAME }}>
        {String(slot + 1).padStart(2, '0')}
      </span>
      <span className="font-sans text-[14px] md:text-[16px] leading-snug" style={{ color: MUTED }}>
        {text}
      </span>
    </motion.div>
  )
}

function PhaseCaption({ index }: { index: MotionValue<number> }) {
  return (
    <div className="relative h-8 mt-6 md:mt-8 text-center">
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

  // Klant + Arrow are visible from the start so the card never feels empty
  const p1Klant = useTransform(scrollYProgress, [0, 0.05], [0.85, 1])
  const p1Arrow = useTransform(scrollYProgress, [0, 0.15], [0.4, 1])
  const p2Project = useTransform(scrollYProgress, [0.10, 0.28], [0, 1])
  const p2Blueprint = useTransform(scrollYProgress, [0.18, 0.34], [0, 1])
  const p3Paths = useTransform(scrollYProgress, [0.28, 0.44], [0, 1])
  const p3Offerte = useTransform(scrollYProgress, [0.34, 0.46], [0, 1])
  const p3Factuur = useTransform(scrollYProgress, [0.36, 0.48], [0, 1])
  const p3Tekening = useTransform(scrollYProgress, [0.38, 0.50], [0, 1])
  const p3Planning = useTransform(scrollYProgress, [0.40, 0.52], [0, 1])
  const p4TekeningPortaal = useTransform(scrollYProgress, [0.48, 0.58], [0, 1])
  const p4Portaal = useTransform(scrollYProgress, [0.52, 0.62], [0, 1])
  const p4Akkoord = useTransform(scrollYProgress, [0.62, 0.72], [0, 1])
  const p5Paths = useTransform(scrollYProgress, [0.70, 0.85], [0, 1])
  const p5Gedaan = useTransform(scrollYProgress, [0.82, 0.92], [0, 1])
  const p5Sparkles = useTransform(scrollYProgress, [0.85, 0.95], [0, 1])
  const p5GedaanGlow = useTransform(p5Gedaan, [0, 1], [0, 0.12])

  // Pulse travels along Klant → Project arrow (earlier, since arrow pre-drawn)
  const pulseLeft = useTransform(
    scrollYProgress,
    [0.02, 0.06, 0.10, 0.14, 0.17],
    ['11.5%', '22%', '34%', '46%', '50%']
  )
  const pulseTop = useTransform(
    scrollYProgress,
    [0.02, 0.06, 0.10, 0.14, 0.17],
    ['40%', '30%', '24%', '20%', '18%']
  )
  const pulseOpacity = useTransform(scrollYProgress, [0.02, 0.04, 0.15, 0.17], [0, 1, 1, 0])
  const trailLeft = useTransform(
    scrollYProgress,
    [0.03, 0.07, 0.11, 0.15, 0.18],
    ['11.5%', '22%', '34%', '46%', '50%']
  )
  const trailTop = useTransform(
    scrollYProgress,
    [0.03, 0.07, 0.11, 0.15, 0.18],
    ['40%', '30%', '24%', '20%', '18%']
  )
  const trailOpacity = useTransform(scrollYProgress, [0.03, 0.05, 0.16, 0.18], [0, 0.4, 0.4, 0])

  const copyIndex = useTransform(scrollYProgress, (v) => {
    if (v < 0.12) return 0
    if (v < 0.28) return 1
    if (v < 0.50) return 2
    if (v < 0.72) return 3
    return 4
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
              ['Offerte, Factuur, Tekening, Planning', 'Vier pijlers, één systeem.'],
              ['Portaal', 'Klant keurt goed met één klik.'],
              ['Gedaan', 'Volgende.'],
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
                aspectRatio: '1200 / 800',
                maxWidth: 'min(860px, calc((100vh - 240px) * 1.5))',
                border: '1px solid rgba(26,83,92,0.06)',
                boxShadow: '0 1px 2px rgba(26,83,92,0.04), 0 8px 24px rgba(26,83,92,0.06), 0 24px 60px rgba(26,83,92,0.05)',
              }}
            >
              <svg viewBox="0 0 1200 800" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <marker id="procesArrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
                    <path d="M 0 0 L 9 4.5 L 0 9 z" fill={FLAME} />
                  </marker>
                  <linearGradient id="convergeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={FLAME} stopOpacity={0.0} />
                    <stop offset="40%" stopColor={FLAME} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={FLAME} stopOpacity={0.6} />
                  </linearGradient>
                  <pattern id="cardDots" width="24" height="24" patternUnits="userSpaceOnUse">
                    <circle cx="12" cy="12" r="0.8" fill={PETROL} opacity={0.08} />
                  </pattern>
                </defs>
                <rect width="1200" height="800" fill="url(#cardDots)" />

                <motion.path d="M 176 318 Q 360 200 534 152" stroke={FLAME} strokeWidth={2} strokeLinecap="round" fill="none" markerEnd="url(#procesArrow)" style={{ pathLength: p1Arrow }} />

                <motion.path d="M 560 208 Q 400 360 218 560" stroke={LINE_SOFT} strokeWidth={1.2} strokeLinecap="round" fill="none" style={{ pathLength: p3Paths }} />
                <motion.path d="M 585 210 Q 520 380 455 560" stroke={LINE_SOFT} strokeWidth={1.2} strokeLinecap="round" fill="none" style={{ pathLength: p3Paths }} />
                <motion.path d="M 615 210 Q 680 380 745 560" stroke={LINE_SOFT} strokeWidth={1.2} strokeLinecap="round" fill="none" style={{ pathLength: p3Paths }} />
                <motion.path d="M 640 208 Q 820 360 982 560" stroke={LINE_SOFT} strokeWidth={1.2} strokeLinecap="round" fill="none" style={{ pathLength: p3Paths }} />

                <motion.path d="M 730 556 Q 680 500 622 460" stroke={PETROL_SOFT} strokeWidth={1.2} strokeLinecap="round" fill="none" strokeDasharray="3 3" style={{ pathLength: p4TekeningPortaal }} />

                <motion.path d="M 215 625 Q 400 760 570 696" stroke="url(#convergeGradient)" strokeWidth={1.6} strokeLinecap="round" fill="none" style={{ pathLength: p5Paths }} />
                <motion.path d="M 450 628 Q 500 722 580 698" stroke="url(#convergeGradient)" strokeWidth={1.6} strokeLinecap="round" fill="none" style={{ pathLength: p5Paths }} />
                <motion.path d="M 750 628 Q 700 722 620 698" stroke="url(#convergeGradient)" strokeWidth={1.6} strokeLinecap="round" fill="none" style={{ pathLength: p5Paths }} />
                <motion.path d="M 985 625 Q 800 760 630 696" stroke="url(#convergeGradient)" strokeWidth={1.6} strokeLinecap="round" fill="none" style={{ pathLength: p5Paths }} />

                <motion.ellipse cx={600} cy={700} rx={120} ry={30} fill={FLAME} style={{ opacity: p5GedaanGlow, filter: 'blur(12px)' }} />

                <motion.g style={{ opacity: p5Sparkles }}>
                  <Sparkle cx={530} cy={672} size={5} />
                  <Sparkle cx={672} cy={672} size={5} />
                  <Sparkle cx={548} cy={726} size={3} />
                  <Sparkle cx={654} cy={728} size={3} />
                  <Sparkle cx={600} cy={646} size={3.5} />
                  <Sparkle cx={500} cy={706} size={2.2} />
                  <Sparkle cx={700} cy={708} size={2.2} />
                  <Sparkle cx={580} cy={658} size={2} />
                  <Sparkle cx={622} cy={660} size={2} />
                </motion.g>
              </svg>

              <motion.span
                aria-hidden
                className="absolute pointer-events-none rounded-full"
                style={{ left: trailLeft, top: trailTop, width: 22, height: 22, marginLeft: -11, marginTop: -11, background: `radial-gradient(circle, ${FLAME}88 0%, ${FLAME}00 60%)`, filter: 'blur(4px)', opacity: trailOpacity }}
              />
              <motion.span
                aria-hidden
                className="absolute pointer-events-none rounded-full"
                style={{ left: pulseLeft, top: pulseTop, width: 14, height: 14, marginLeft: -7, marginTop: -7, background: `radial-gradient(circle, #FFFFFF 0%, ${FLAME} 40%, ${FLAME}00 85%)`, opacity: pulseOpacity }}
              />

              <FlowNode xPct={11.5} yPct={40} icon={User} label="Klant" subtitle="Doet aanvraag" progress={p1Klant} />
              <ProjectNode progress={p2Project} blueprintProgress={p2Blueprint} />
              <FlowNode xPct={17.5} yPct={74} icon={ClipboardList} label="Offerte" subtitle="Calculeer en verstuur" progress={p3Offerte} />
              <FlowNode xPct={37.5} yPct={74} icon={Receipt} label="Factuur" subtitle="Incasseer eenvoudig" progress={p3Factuur} />
              <FlowNode xPct={62.5} yPct={74} icon={ImageIcon} label="Tekening" subtitle="Drukproef en akkoord" progress={p3Tekening} />
              <FlowNode xPct={82.5} yPct={74} icon={Calendar} label="Planning" subtitle="Werkbon en montage" progress={p3Planning} />
              <PortaalNode progress={p4Portaal} akkoordProgress={p4Akkoord} />
              <FlowNode xPct={50} yPct={87} icon={Smile} label="Gedaan" progress={p5Gedaan} tone="dark" size={72} />
            </div>

            <PhaseCaption index={copyIndex} />
          </div>
        </div>
      </div>
    </section>
  )
}
