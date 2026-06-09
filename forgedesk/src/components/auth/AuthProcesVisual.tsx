import {
  motion,
  animate,
  useMotionValue,
  useTransform,
  useReducedMotion,
  useInView,
  type MotionValue,
} from 'framer-motion'
import { useEffect, useRef } from 'react'
import {
  User,
  ClipboardList,
  Receipt,
  Image as ImageIcon,
  Calendar,
  Smile,
  Check,
  type LucideIcon,
} from 'lucide-react'

const PETROL = '#1A535C'
const PETROL_DARK = '#143F46'
const FLAME = '#F15025'

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
  floatDelay?: number
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
  floatDelay = 0,
}: NodeProps) {
  const opacity = useTransform(progress, [0, 0.4, 1], [0, 1, 1])
  const scale = useTransform(progress, [0, 0.4, 0.7, 1], [0.7, 1.06, 1, 1])
  const haloOpacity = useTransform(progress, [0, 0.3, 0.8, 1], [0, 0.55, 0, 0])
  const haloScale = useTransform(progress, [0, 0.3, 0.9, 1], [0.8, 1.8, 2.3, 2.3])

  const bg = tone === 'dark' ? PETROL_DARK : 'hsl(var(--card))'

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
      animate={{ y: [0, -2.5, 0] }}
      transition={{ duration: 5 + (floatDelay % 1.5), repeat: Infinity, ease: 'easeInOut', delay: floatDelay }}
    >
      {labelPosition === 'above' && <LabelBlock label={label} subtitle={subtitle} dir="above" />}
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
          className={`relative rounded-full flex items-center justify-center ${
            tone === 'light' ? 'border-[1.5px] border-[#1A535C] dark:border-[#3D7A85]' : ''
          }`}
          style={{
            width: size,
            height: size,
            backgroundColor: bg,
            boxShadow:
              tone === 'dark'
                ? '0 4px 12px rgba(20,63,70,0.2), 0 12px 36px rgba(20,63,70,0.3)'
                : '0 1px 3px rgba(26,83,92,0.06), 0 3px 10px rgba(26,83,92,0.08), 0 12px 28px rgba(26,83,92,0.05)',
            scale,
          }}
        >
          <Icon
            className={`w-[22px] h-[22px] ${tone === 'dark' ? 'text-white' : 'text-[#1A535C] dark:text-[#9FCAD2]'}`}
            strokeWidth={1.5}
          />
        </motion.div>
      </div>
      {labelPosition === 'below' && <LabelBlock label={label} subtitle={subtitle} dir="below" />}
    </motion.div>
  )
}

function LabelBlock({ label, subtitle, dir }: { label: string; subtitle?: string; dir: 'above' | 'below' }) {
  return (
    <div className={`${dir === 'above' ? 'mb-2' : 'mt-2.5'} text-center whitespace-nowrap`}>
      <p className="font-heading font-extrabold text-[13px] md:text-[16px] tracking-tight leading-none text-[#1A535C] dark:text-[#9FCAD2]">
        {label}
        <span style={{ color: FLAME }}>.</span>
      </p>
      {subtitle && (
        <p
          className="font-mono text-[8px] md:text-[9px] font-bold tracking-[0.12em] uppercase mt-1 text-[#9B9B95] dark:text-muted-foreground/70"
          style={{ fontFamily: '"DM Mono", ui-monospace, monospace' }}
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
            backgroundColor: 'hsl(var(--card))',
            border: `1.5px solid ${PETROL}`,
            boxShadow: '0 2px 10px rgba(26,83,92,0.06), 0 12px 32px rgba(26,83,92,0.08)',
          }}
        >
          <svg viewBox="0 0 128 96" className="absolute inset-0 w-full h-full" aria-hidden>
            <defs>
              <pattern id="apvBlueprintGrid" width="8" height="8" patternUnits="userSpaceOnUse">
                <path d="M 8 0 L 0 0 0 8" fill="none" stroke={PETROL} strokeWidth={0.3} opacity={0.12} />
              </pattern>
            </defs>
            <rect width="128" height="96" fill="url(#apvBlueprintGrid)" />
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
          <p className="font-heading font-extrabold text-[14px] md:text-[17px] tracking-tight leading-none text-[#1A535C] dark:text-[#9FCAD2]">
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
          backgroundColor: 'hsl(var(--card))',
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
        <p className="font-heading font-extrabold text-[13px] md:text-[15px] tracking-tight leading-none text-[#1A535C] dark:text-[#9FCAD2]">
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
      <span className="font-mono text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: FLAME, fontFamily: '"DM Mono", ui-monospace, monospace' }}>
        {String(slot + 1).padStart(2, '0')}
      </span>
      <span className="font-sans text-[13px] md:text-[15px] leading-snug text-[#6B6B66] dark:text-muted-foreground">
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

/* ─── Mobile vertical timeline ─────────────────────────────────────── */

type MobileStepData = {
  nr: string
  icon: LucideIcon
  label: string
  subtitle: string
  tone?: 'light' | 'dark' | 'portaal'
}

const MOBILE_STEPS: MobileStepData[] = [
  { nr: '01', icon: User, label: 'Klant', subtitle: 'Doet aanvraag' },
  { nr: '02', icon: ClipboardList, label: 'Project', subtitle: 'Alles komt samen in één cockpit' },
  { nr: '03', icon: ClipboardList, label: 'Offerte', subtitle: 'Calculeer en verstuur' },
  { nr: '04', icon: ImageIcon, label: 'Tekening', subtitle: 'Drukproef en akkoord' },
  { nr: '05', icon: Check, label: 'Portaal', subtitle: 'Klant geeft akkoord', tone: 'portaal' },
  { nr: '06', icon: Calendar, label: 'Planning', subtitle: 'Werkbon en montage' },
  { nr: '07', icon: Receipt, label: 'Factuur', subtitle: 'Incasseer eenvoudig' },
  { nr: '08', icon: Smile, label: 'Gedaan', subtitle: 'Door naar de volgende', tone: 'dark' },
]

function MobileStep({ step, index, isLast }: { step: MobileStepData; index: number; isLast: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px 0%' })
  const Icon = step.icon
  const isDark = step.tone === 'dark'
  const isPortaal = step.tone === 'portaal'

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: Math.min(index * 0.04, 0.2), ease: [0.16, 1, 0.3, 1] }}
      className="flex gap-4 relative"
    >
      <div className="relative flex flex-col items-center flex-shrink-0" style={{ width: 48 }}>
        <motion.div
          initial={{ scale: 0.6 }}
          animate={inView ? { scale: 1 } : {}}
          transition={{ duration: 0.5, delay: Math.min(index * 0.04, 0.2) + 0.1, ease: [0.16, 1, 0.3, 1] }}
          className={`relative z-10 rounded-full flex items-center justify-center ${
            !isDark && !isPortaal ? 'border-[1.5px] border-[#1A535C] dark:border-[#3D7A85]' : ''
          }`}
          style={{
            width: 48,
            height: 48,
            backgroundColor: isDark ? PETROL_DARK : isPortaal ? FLAME : 'hsl(var(--card))',
            boxShadow: isDark
              ? '0 6px 20px rgba(20,63,70,0.25)'
              : isPortaal
              ? '0 4px 14px rgba(241,80,37,0.3)'
              : '0 2px 10px rgba(26,83,92,0.08), 0 6px 16px rgba(26,83,92,0.05)',
          }}
        >
          <Icon
            className={`w-5 h-5 ${isDark || isPortaal ? 'text-white' : 'text-[#1A535C] dark:text-[#9FCAD2]'}`}
            strokeWidth={1.8}
          />
          {isDark && inView && (
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full"
              style={{ border: `2px solid ${FLAME}` }}
              initial={{ opacity: 0.7, scale: 1 }}
              animate={{ opacity: 0, scale: 2 }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
            />
          )}
        </motion.div>
        {!isLast && (
          <motion.div
            initial={{ scaleY: 0 }}
            animate={inView ? { scaleY: 1 } : {}}
            transition={{ duration: 0.5, delay: Math.min(index * 0.04, 0.2) + 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-px flex-1 mt-1 origin-top bg-[#1A535C]/[0.22] dark:bg-white/15"
            style={{ minHeight: 52 }}
          />
        )}
      </div>
      <div className="flex-1 pb-7">
        <p className="font-mono text-[10px] font-bold tracking-[0.18em]" style={{ color: FLAME, fontFamily: '"DM Mono", ui-monospace, monospace' }}>
          {step.nr}
        </p>
        <h3 className="font-heading text-[18px] font-extrabold tracking-tight leading-tight mt-0.5 text-[#1A535C] dark:text-[#9FCAD2]">
          {step.label}
          <span style={{ color: FLAME }}>.</span>
        </h3>
        <p className="text-[13px] mt-1 leading-relaxed text-[#6B6B66] dark:text-muted-foreground">
          {step.subtitle}
        </p>
      </div>
    </motion.div>
  )
}

function MobileFlow() {
  return (
    <div className="max-w-md mx-auto">
      {MOBILE_STEPS.map((step, i) => (
        <MobileStep key={step.nr} step={step} index={i} isLast={i === MOBILE_STEPS.length - 1} />
      ))}
    </div>
  )
}

/* ─── Main: autoplay-driven flow visual ────────────────────────────── */

export function AuthProcesVisual() {
  const containerRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  const inView = useInView(containerRef, { once: true, margin: '-15% 0%' })

  const smooth = useMotionValue(0)

  useEffect(() => {
    if (reduceMotion) {
      smooth.set(1)
      return
    }
    if (!inView) return
    const controls = animate(smooth, 1, { duration: 10, ease: [0.45, 0, 0.55, 1] })
    return () => controls.stop()
  }, [inView, reduceMotion, smooth])

  const pKlant = useTransform(smooth, [0, 0.05], [0.85, 1])
  const pKlantArrow = useTransform(smooth, [0, 0.12], [0.3, 1])
  const pProject = useTransform(smooth, [0.08, 0.22], [0, 1])
  const pProjectBlueprint = useTransform(smooth, [0.14, 0.28], [0, 1])
  const pBranchPaths = useTransform(smooth, [0.22, 0.36], [0, 1])
  const pOfferte = useTransform(smooth, [0.28, 0.42], [0, 1])
  const pTekening = useTransform(smooth, [0.30, 0.44], [0, 1])
  const pMergePaths = useTransform(smooth, [0.42, 0.56], [0, 1])
  const pPortaal = useTransform(smooth, [0.52, 0.64], [0, 1])
  const pAkkoord = useTransform(smooth, [0.62, 0.72], [0, 1])
  const pPortaalPlanningPath = useTransform(smooth, [0.68, 0.76], [0, 1])
  const pPlanning = useTransform(smooth, [0.72, 0.80], [0, 1])
  const pPlanningFactuurPath = useTransform(smooth, [0.78, 0.84], [0, 1])
  const pFactuur = useTransform(smooth, [0.82, 0.88], [0, 1])
  const pFactuurGedaanPath = useTransform(smooth, [0.86, 0.92], [0, 1])
  const pGedaan = useTransform(smooth, [0.90, 0.96], [0, 1])
  const pSparkles = useTransform(smooth, [0.92, 0.98], [0, 1])
  const pGedaanGlow = useTransform(pGedaan, [0, 1], [0, 0.12])
  const pGedaanOuterGlow = useTransform(pGedaan, [0, 1], [0, 0.08])

  const pulseLeft = useTransform(smooth, [0, 0.04, 0.08, 0.12], ['7%', '13%', '19%', '22%'])
  const pulseOpacity = useTransform(smooth, [0, 0.02, 0.11, 0.13], [0, 1, 1, 0])
  const trailLeft = useTransform(smooth, [0.01, 0.05, 0.09, 0.13], ['7%', '13%', '19%', '22%'])
  const trailOpacity = useTransform(smooth, [0.01, 0.03, 0.12, 0.14], [0, 0.4, 0.4, 0])

  const copyIndex = useTransform(smooth, (v): number => {
    if (v < 0.14) return 0
    if (v < 0.28) return 1
    if (v < 0.52) return 2
    if (v < 0.72) return 3
    if (v < 0.88) return 4
    return 5
  })

  const branchAfterglow = useTransform(pBranchPaths, [0.8, 1], [0, 0.55])
  const mergeAfterglow = useTransform(pMergePaths, [0.8, 1], [0, 0.55])
  const finishAfterglow = useTransform(pFactuurGedaanPath, [0.8, 1], [0, 0.7])

  if (reduceMotion) {
    return (
      <div ref={containerRef} className="w-full">
        <ol className="max-w-2xl mx-auto space-y-3 text-left">
          {[
            ['Klant', 'Doet aanvraag.'],
            ['Project', 'Alles komt samen in één cockpit.'],
            ['Offerte + Tekening', 'Klaar voor je klant.'],
            ['Portaal', 'Klant keurt goed met één klik.'],
            ['Planning', 'Inplannen en uitvoeren.'],
            ['Factuur', 'De deur uit. Gedaan.'],
          ].map(([t, d], i) => (
            <li key={i} className="flex gap-3 items-baseline">
              <span className="font-mono text-[12px] font-bold" style={{ color: FLAME, fontFamily: '"DM Mono", ui-monospace, monospace' }}>
                0{i + 1}
              </span>
              <p className="text-[15px] text-[#1A535C] dark:text-[#9FCAD2]">
                <strong>{t}.</strong> <span className="text-[#6B6B66] dark:text-muted-foreground">{d}</span>
              </p>
            </li>
          ))}
        </ol>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full">
      {/* Mobile: vertical timeline */}
      <div className="md:hidden">
        <MobileFlow />
      </div>

      {/* Desktop: autoplay diamond */}
      <div className="hidden md:block">
        <div
          className="relative w-full mx-auto"
          style={{
            aspectRatio: '1200 / 600',
            maxWidth: '1200px',
          }}
        >
          <svg viewBox="0 0 1200 600" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
            <defs>
              <marker id="apvArrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
                <path d="M 0 0 L 9 4.5 L 0 9 z" fill={FLAME} />
              </marker>
              <linearGradient id="apvGradProject" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={PETROL} stopOpacity={0.7} />
                <stop offset="100%" stopColor={PETROL} stopOpacity={0.4} />
              </linearGradient>
              <linearGradient id="apvGradPortaal" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={PETROL} stopOpacity={0.5} />
                <stop offset="100%" stopColor={PETROL} stopOpacity={0.6} />
              </linearGradient>
              <linearGradient id="apvGradFinish" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={PETROL} stopOpacity={0.5} />
                <stop offset="100%" stopColor={FLAME} stopOpacity={0.7} />
              </linearGradient>
            </defs>

            <motion.path d="M 120 300 L 230 300" stroke={FLAME} strokeWidth={2} strokeLinecap="round" fill="none" markerEnd="url(#apvArrow)" style={{ pathLength: pKlantArrow }} />
            <motion.path d="M 304 270 Q 400 210 466 170" stroke="url(#apvGradProject)" strokeWidth={1.6} strokeLinecap="round" fill="none" style={{ pathLength: pBranchPaths }} />
            <motion.path d="M 304 330 Q 400 390 466 430" stroke="url(#apvGradProject)" strokeWidth={1.6} strokeLinecap="round" fill="none" style={{ pathLength: pBranchPaths }} />
            <motion.path d="M 518 180 Q 610 240 680 280" stroke="url(#apvGradPortaal)" strokeWidth={1.6} strokeLinecap="round" fill="none" style={{ pathLength: pMergePaths }} />
            <motion.path d="M 518 420 Q 610 360 680 320" stroke="url(#apvGradPortaal)" strokeWidth={1.6} strokeLinecap="round" fill="none" style={{ pathLength: pMergePaths }} />
            <motion.path d="M 736 300 L 860 300" stroke="url(#apvGradFinish)" strokeWidth={1.8} strokeLinecap="round" fill="none" style={{ pathLength: pPortaalPlanningPath }} />
            <motion.path d="M 912 300 L 1020 300" stroke="url(#apvGradFinish)" strokeWidth={1.8} strokeLinecap="round" fill="none" style={{ pathLength: pPlanningFactuurPath }} />
            <motion.path d="M 1072 300 L 1130 300" stroke="url(#apvGradFinish)" strokeWidth={1.8} strokeLinecap="round" fill="none" style={{ pathLength: pFactuurGedaanPath }} />

            <motion.circle cx={1152} cy={300} r={60} fill={FLAME} style={{ opacity: pGedaanOuterGlow, filter: 'blur(20px)' }} />
            <motion.ellipse cx={1152} cy={340} rx={56} ry={18} fill={FLAME} style={{ opacity: pGedaanGlow, filter: 'blur(10px)' }} />

            <motion.g style={{ opacity: pSparkles }}>
              <motion.g animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} style={{ transformOrigin: '1152px 300px' }}>
                <Sparkle cx={1106} cy={266} size={4.5} />
                <Sparkle cx={1198} cy={266} size={4.5} />
                <Sparkle cx={1108} cy={340} size={3} />
                <Sparkle cx={1196} cy={340} size={3} />
                <Sparkle cx={1152} cy={248} size={3.5} />
                <Sparkle cx={1152} cy={354} size={2.2} />
                <Sparkle cx={1072} cy={300} size={2.4} />
                <Sparkle cx={1232} cy={300} size={2.4} />
                <Sparkle cx={1128} cy={280} size={1.5} />
                <Sparkle cx={1176} cy={280} size={1.5} />
                <Sparkle cx={1128} cy={320} size={1.5} />
                <Sparkle cx={1176} cy={320} size={1.5} />
              </motion.g>
            </motion.g>

            <motion.g style={{ opacity: branchAfterglow }}>
              <path d="M 304 270 Q 400 210 466 170" stroke={FLAME} strokeWidth={1.2} fill="none" strokeDasharray="3 18" strokeLinecap="round">
                <animate attributeName="stroke-dashoffset" from="0" to="-21" dur="3s" repeatCount="indefinite" />
              </path>
              <path d="M 304 330 Q 400 390 466 430" stroke={FLAME} strokeWidth={1.2} fill="none" strokeDasharray="3 18" strokeLinecap="round">
                <animate attributeName="stroke-dashoffset" from="0" to="-21" dur="3s" repeatCount="indefinite" />
              </path>
            </motion.g>
            <motion.g style={{ opacity: mergeAfterglow }}>
              <path d="M 518 180 Q 610 240 680 280" stroke={FLAME} strokeWidth={1.2} fill="none" strokeDasharray="3 18" strokeLinecap="round">
                <animate attributeName="stroke-dashoffset" from="0" to="-21" dur="3s" repeatCount="indefinite" />
              </path>
              <path d="M 518 420 Q 610 360 680 320" stroke={FLAME} strokeWidth={1.2} fill="none" strokeDasharray="3 18" strokeLinecap="round">
                <animate attributeName="stroke-dashoffset" from="0" to="-21" dur="3s" repeatCount="indefinite" />
              </path>
            </motion.g>
            <motion.g style={{ opacity: finishAfterglow }}>
              <path d="M 736 300 L 1130 300" stroke={FLAME} strokeWidth={1.4} fill="none" strokeDasharray="4 20" strokeLinecap="round">
                <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="2.2s" repeatCount="indefinite" />
              </path>
            </motion.g>
          </svg>

          <motion.span aria-hidden className="absolute pointer-events-none rounded-full" style={{ left: trailLeft, top: '50%', width: 22, height: 22, marginLeft: -11, marginTop: -11, background: `radial-gradient(circle, ${FLAME}88 0%, ${FLAME}00 60%)`, filter: 'blur(4px)', opacity: trailOpacity }} />
          <motion.span aria-hidden className="absolute pointer-events-none rounded-full" style={{ left: pulseLeft, top: '50%', width: 12, height: 12, marginLeft: -6, marginTop: -6, background: `radial-gradient(circle, #FFFFFF 0%, ${FLAME} 40%, ${FLAME}00 85%)`, opacity: pulseOpacity }} />

          <FlowNode xPct={7} yPct={50} icon={User} label="Klant" subtitle="Doet aanvraag" progress={pKlant} floatDelay={0} />
          <ProjectNode xPct={22} yPct={50} progress={pProject} blueprintProgress={pProjectBlueprint} />
          <FlowNode xPct={40} yPct={22} icon={ClipboardList} label="Offerte" subtitle="Calculeer en verstuur" progress={pOfferte} labelPosition="above" floatDelay={0.6} />
          <FlowNode xPct={40} yPct={78} icon={ImageIcon} label="Tekening" subtitle="Drukproef en akkoord" progress={pTekening} labelPosition="below" floatDelay={1.0} />
          <PortaalNode xPct={57} yPct={50} progress={pPortaal} akkoordProgress={pAkkoord} />
          <FlowNode xPct={73} yPct={50} icon={Calendar} label="Planning" subtitle="Werkbon en montage" progress={pPlanning} floatDelay={1.4} />
          <FlowNode xPct={86} yPct={50} icon={Receipt} label="Factuur" subtitle="Incasseer eenvoudig" progress={pFactuur} floatDelay={1.8} />
          <FlowNode xPct={96} yPct={50} icon={Smile} label="Gedaan" progress={pGedaan} tone="dark" size={64} floatDelay={2.2} />
        </div>

        <PhaseCaption index={copyIndex} />
      </div>
    </div>
  )
}
