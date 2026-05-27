'use client'

import { useEffect } from 'react'
import {
  motion,
  animate,
  useMotionValue,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from 'framer-motion'
import {
  User,
  PencilRuler,
  ClipboardList,
  Image as ImageIcon,
  MonitorCheck,
  Calendar,
  Receipt,
  Smile,
  type LucideIcon,
} from 'lucide-react'

const PETROL = '#1A535C'
const PETROL_DARK = '#143F46'
const FLAME = '#F15025'
const MUTED = '#6B6B66'
const LINE = '#B8B3A8'

type Step = {
  icon: LucideIcon
  label: string
  sub?: string
  xPct: number
  yPct: number
  labelPos: 'above' | 'below'
  win: [number, number]
  tone?: 'light' | 'dark'
}

// Coördinaten in de viewBox 1200 x 400
const STEPS: Step[] = [
  { icon: User,         label: 'Klant',    sub: 'Doet aanvraag',        xPct: 9.2,  yPct: 50,    labelPos: 'below', win: [0.00, 0.06] },
  { icon: PencilRuler,  label: 'Project',  sub: 'Alles op één plek',    xPct: 23.3, yPct: 50,    labelPos: 'below', win: [0.10, 0.18] },
  { icon: ClipboardList,label: 'Offerte',  sub: 'Calculeer en verstuur', xPct: 40,   yPct: 23.75, labelPos: 'above', win: [0.28, 0.36] },
  { icon: ImageIcon,    label: 'Tekening', sub: 'Drukproef en akkoord', xPct: 40,   yPct: 76.25, labelPos: 'below', win: [0.30, 0.38] },
  { icon: MonitorCheck, label: 'Portaal',  sub: 'Klant keurt goed',     xPct: 56.7, yPct: 50,    labelPos: 'below', win: [0.50, 0.58] },
  { icon: Calendar,     label: 'Planning', sub: 'Werkbon en montage',   xPct: 72.5, yPct: 50,    labelPos: 'below', win: [0.66, 0.74] },
  { icon: Receipt,      label: 'Factuur',  sub: 'Incasseer eenvoudig',  xPct: 84.2, yPct: 50,    labelPos: 'below', win: [0.78, 0.86] },
  { icon: Smile,        label: 'Gedaan',   xPct: 95,   yPct: 50,        labelPos: 'below', win: [0.90, 0.97], tone: 'dark' },
]

export default function HeroFlow() {
  const reduce = useReducedMotion()
  const progress = useMotionValue(0)

  useEffect(() => {
    if (reduce) {
      progress.set(1)
      return
    }
    const controls = animate(progress, 1, { duration: 6.2, ease: [0.16, 1, 0.3, 1], delay: 0.5 })
    return () => controls.stop()
  }, [reduce, progress])

  // Reizende flame-pulse over de entree-lijn (Klant → Project)
  const pulseX = useTransform(progress, [0, 0.1], [150, 235])
  const pulseOpacity = useTransform(progress, [0, 0.015, 0.09, 0.11], [0, 1, 1, 0])

  return (
    <>
      {/* DESKTOP — horizontale auto-play flow */}
      <div className="relative w-full mx-auto hidden lg:block" style={{ aspectRatio: '1200 / 400', maxWidth: 1180 }}>
        <svg viewBox="0 0 1200 400" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
          <defs>
            <marker id="hfArrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M 0 0 L 8 4 L 0 8 z" fill={FLAME} />
            </marker>
          </defs>

          {/* Klant → Project (flame entree) */}
          <FlowPath d="M 150 200 L 232 200" progress={progress} win={[0, 0.1]} stroke={FLAME} width={2} arrow />
          {/* Project → Offerte / Tekening */}
          <FlowPath d="M 322 178 Q 400 130 446 112" progress={progress} win={[0.18, 0.3]} />
          <FlowPath d="M 322 222 Q 400 270 446 288" progress={progress} win={[0.18, 0.3]} />
          {/* Offerte → Portaal / Tekening → Portaal */}
          <FlowPath d="M 514 112 Q 600 160 644 184" progress={progress} win={[0.4, 0.52]} />
          <FlowPath d="M 514 288 Q 600 240 644 216" progress={progress} win={[0.4, 0.52]} />
          {/* Portaal → Planning → Factuur (gestippeld) */}
          <FlowDotted d="M 722 200 L 836 200" progress={progress} win={[0.58, 0.66]} />
          <FlowDotted d="M 906 200 L 976 200" progress={progress} win={[0.74, 0.8]} />
          {/* Factuur → Gedaan */}
          <FlowPath d="M 1046 200 L 1106 200" progress={progress} win={[0.86, 0.92]} stroke={FLAME} width={2} />

          {/* Gedaan-sparkles */}
          <Sparkles progress={progress} />

          {/* Reizende flame-pulse */}
          {!reduce && (
            <motion.circle cx={pulseX} cy={200} r={4} fill={FLAME} style={{ opacity: pulseOpacity }} />
          )}
        </svg>

        {STEPS.map((s, i) => (
          <FlowNode key={s.label} step={s} progress={progress} floatDelay={i * 0.25} />
        ))}
      </div>

      {/* MOBIEL / TABLET — compacte verticale stappenlijst (statisch) */}
      <ol className="lg:hidden mt-2 space-y-3 max-w-sm">
        {STEPS.filter((s) => s.label !== 'Tekening').map((s, i) => {
          const Icon = s.icon
          return (
            <li key={s.label} className="flex items-center gap-3">
              <span
                className="w-9 h-9 rounded-full inline-flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: s.tone === 'dark' ? PETROL_DARK : '#FFFFFF',
                  border: s.tone === 'dark' ? 'none' : `1.5px solid ${PETROL}`,
                }}
              >
                <Icon className="w-4 h-4" style={{ color: s.tone === 'dark' ? '#FFFFFF' : PETROL }} strokeWidth={1.6} />
              </span>
              <div className="min-w-0">
                <span className="font-mono text-[10px] font-bold mr-2" style={{ color: FLAME }}>0{i + 1}</span>
                <span className="font-heading text-[15px] font-bold" style={{ color: PETROL }}>{s.label}</span>
                {s.sub && <span className="text-[12px] ml-2" style={{ color: MUTED }}>{s.sub}</span>}
              </div>
            </li>
          )
        })}
      </ol>
    </>
  )
}

function FlowPath({
  d,
  progress,
  win,
  stroke = PETROL,
  width = 1.6,
  arrow = false,
}: {
  d: string
  progress: MotionValue<number>
  win: [number, number]
  stroke?: string
  width?: number
  arrow?: boolean
}) {
  const pathLength = useTransform(progress, win, [0, 1])
  const opacity = useTransform(progress, [win[0], win[0] + 0.01], [0, stroke === FLAME ? 1 : 0.55])
  return (
    <motion.path
      d={d}
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      fill="none"
      markerEnd={arrow ? 'url(#hfArrow)' : undefined}
      style={{ pathLength, opacity }}
    />
  )
}

function FlowDotted({ d, progress, win }: { d: string; progress: MotionValue<number>; win: [number, number] }) {
  const opacity = useTransform(progress, win, [0, 0.5])
  return (
    <motion.path
      d={d}
      stroke={PETROL}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeDasharray="1 9"
      fill="none"
      style={{ opacity }}
    />
  )
}

function FlowNode({ step, progress, floatDelay }: { step: Step; progress: MotionValue<number>; floatDelay: number }) {
  const { icon: Icon, label, sub, xPct, yPct, labelPos, win, tone = 'light' } = step
  const opacity = useTransform(progress, [win[0], win[0] + 0.05], [0, 1])
  const scale = useTransform(progress, [win[0], win[0] + 0.04, win[0] + 0.1], [0.6, 1.08, 1])
  const haloOpacity = useTransform(progress, [win[0], win[0] + 0.04, win[0] + 0.14], [0, 0.5, 0])
  const haloScale = useTransform(progress, [win[0], win[0] + 0.04, win[0] + 0.16], [0.8, 1.7, 2.2])

  const size = 56
  const bg = tone === 'dark' ? PETROL_DARK : '#FFFFFF'
  const iconColor = tone === 'dark' ? '#FFFFFF' : PETROL

  return (
    <motion.div
      className="absolute flex flex-col items-center pointer-events-none"
      style={{ left: `${xPct}%`, top: `${yPct}%`, translateX: '-50%', translateY: '-50%', opacity }}
      animate={{ y: [0, -2.5, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: floatDelay }}
    >
      {labelPos === 'above' && <Label label={label} sub={sub} dir="above" />}
      <div className="relative" style={{ width: size, height: size }}>
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${FLAME}66 0%, ${FLAME}00 70%)`,
            filter: 'blur(8px)',
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
            boxShadow:
              tone === 'dark'
                ? '0 4px 12px rgba(20,63,70,0.2), 0 12px 36px rgba(20,63,70,0.3)'
                : '0 1px 3px rgba(26,83,92,0.06), 0 8px 22px rgba(26,83,92,0.07)',
            scale,
          }}
        >
          <Icon className="w-[21px] h-[21px]" style={{ color: iconColor }} strokeWidth={1.5} />
        </motion.div>
      </div>
      {labelPos === 'below' && <Label label={label} sub={sub} dir="below" />}
    </motion.div>
  )
}

function Label({ label, sub, dir }: { label: string; sub?: string; dir: 'above' | 'below' }) {
  return (
    <div className={`text-center whitespace-nowrap ${dir === 'above' ? 'mb-3' : 'mt-3'}`}>
      <p className="font-heading text-[15px] font-bold tracking-tight leading-none" style={{ color: PETROL }}>
        {label}<span style={{ color: FLAME }}>.</span>
      </p>
      {sub && (
        <p className="font-mono text-[9px] font-medium tracking-[0.14em] uppercase mt-1.5" style={{ color: MUTED }}>
          {sub}
        </p>
      )}
    </div>
  )
}

function Sparkles({ progress }: { progress: MotionValue<number> }) {
  const opacity = useTransform(progress, [0.93, 0.99], [0, 1])
  const glow = useTransform(progress, [0.9, 1], [0, 0.1])
  const spark = (cx: number, cy: number, s: number) => {
    const h = s * 0.28
    const d = `M ${cx} ${cy - s} C ${cx + h} ${cy - h}, ${cx + s} ${cy}, ${cx + s} ${cy} C ${cx + h} ${cy + h}, ${cx} ${cy + s}, ${cx} ${cy + s} C ${cx - h} ${cy + h}, ${cx - s} ${cy}, ${cx - s} ${cy} C ${cx - h} ${cy - h}, ${cx} ${cy - s}, ${cx} ${cy - s} Z`
    return <path key={`${cx}-${cy}`} d={d} fill={FLAME} />
  }
  return (
    <>
      <motion.circle cx={1140} cy={200} r={52} fill={FLAME} style={{ opacity: glow, filter: 'blur(18px)' }} />
      <motion.g style={{ opacity }}>
        <motion.g animate={{ scale: [1, 1.07, 1] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} style={{ transformOrigin: '1140px 200px' }}>
          {spark(1098, 168, 4)}
          {spark(1186, 168, 4)}
          {spark(1100, 236, 2.6)}
          {spark(1184, 236, 2.6)}
          {spark(1140, 150, 3)}
          {spark(1072, 200, 2.2)}
          {spark(1212, 200, 2.2)}
        </motion.g>
      </motion.g>
    </>
  )
}
