'use client'

import { useState, useRef } from 'react'
import {
  motion,
  useInView,
  useMotionValue,
  useTransform,
  useSpring,
  useMotionTemplate,
} from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

// Volgorde: Row 1 = chronologische projectflow (klant → uitvoering),
// Row 2 = ondersteunende modules (finish + tools eromheen)
const modules = [
  // Row 1 — de projectflow
  { label: 'Projecten', sub: 'Alles in één cockpit', href: '/features/projecten', color: '#1A535C', image: '/images/modules/projecten-transparent.webp' },
  { label: 'Offertes', sub: 'Professioneel in minuten', href: '/features/offertes', color: '#F15025', image: '/images/modules/offertes-transparent.webp' },
  { label: 'Klantportaal', sub: 'Deel, bespreek, accordeer', href: '/features/portaal', color: '#6A5A8A', image: '/images/modules/klantportaal-transparent.webp' },
  { label: 'Planning', sub: 'Sleep je week in elkaar', href: '/features/planning', color: '#9A5A48', image: '/images/modules/planning-transparent.png' },
  { label: 'Werkbonnen', sub: 'Digitaal op locatie', href: '/features/werkbonnen', color: '#1A535C', image: '/images/modules/werkbonnen-transparent.png' },
  // Row 2 — eromheen en erna
  { label: 'Facturen', sub: 'Verkoop en inkoop, geregeld', href: '/features/facturen', color: '#2D6B48', image: '/images/modules/facturen.jpg' },
  { label: 'Email', sub: 'Jouw mailbox, slim gekoppeld', href: '/features/email', color: '#3A6B8C', image: '/images/modules/email.webp' },
  { label: 'Taken', sub: 'Alles naast de montage', href: '/features/taken', color: '#F15025', image: '/images/modules/taken.webp' },
  { label: 'Visualizer', sub: 'AI toont het eindresultaat', href: '/features/visualizer', color: '#9A5A48', image: '/images/modules/visualizer.jpg' },
  { label: 'AI-assistent', sub: 'Je slimste collega', href: '/features/ai', color: '#1A535C', image: '/images/modules/ai-assistant.jpg' },
]

export default function ModulesCarousel() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <section className="py-20 md:py-28 bg-white" ref={ref}>
      <div className="container-site">
        <motion.div
          className="flex items-end justify-between mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="font-heading text-[28px] md:text-[36px] font-bold text-petrol tracking-[-1.5px] leading-[1.1]">
            Ontdek de modules<span className="text-flame">.</span>
          </h2>
          <Link
            href="/features"
            className="hidden md:flex items-center gap-1.5 text-[13px] font-semibold text-petrol hover:text-flame transition-colors"
          >
            Bekijk alles <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>

        {/* Row 1 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-x-6 md:gap-x-8 gap-y-4">
          {modules.slice(0, 5).map((mod, i) => (
            <ModuleCard
              key={mod.label}
              mod={mod}
              i={i}
              isInView={isInView}
              hoveredIndex={hoveredIndex}
              setHoveredIndex={setHoveredIndex}
            />
          ))}
        </div>

        {/* Divider */}
        <div
          className="my-10 md:my-12 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, #1A535C10, #F1502515, #1A535C10, transparent)',
          }}
        />

        {/* Row 2 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-x-6 md:gap-x-8 gap-y-4">
          {modules.slice(5).map((mod, i) => (
            <ModuleCard
              key={mod.label}
              mod={mod}
              i={i + 5}
              isInView={isInView}
              hoveredIndex={hoveredIndex}
              setHoveredIndex={setHoveredIndex}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function ModuleCard({
  mod,
  i,
  isInView,
  hoveredIndex,
  setHoveredIndex,
}: {
  mod: typeof modules[0]
  i: number
  isInView: boolean
  hoveredIndex: number | null
  setHoveredIndex: (idx: number | null) => void
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(50)
  const mouseY = useMotionValue(50)

  const rotateX = useSpring(useTransform(mouseY, [0, 100], [3, -3]), {
    stiffness: 200,
    damping: 18,
  })
  const rotateY = useSpring(useTransform(mouseX, [0, 100], [-3, 3]), {
    stiffness: 200,
    damping: 18,
  })
  const spotlightBg = useMotionTemplate`radial-gradient(circle at ${mouseX}% ${mouseY}%, ${mod.color}22 0%, ${mod.color}00 55%)`

  function handleMouseMove(e: React.MouseEvent) {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    mouseX.set(((e.clientX - rect.left) / rect.width) * 100)
    mouseY.set(((e.clientY - rect.top) / rect.height) * 100)
  }

  function handleMouseLeave() {
    setHoveredIndex(null)
    mouseX.set(50)
    mouseY.set(50)
  }

  const isHovered = hoveredIndex === i
  const isDimmed = hoveredIndex !== null && hoveredIndex !== i

  // Idle float params — staggered per card so they never sync
  const floatDuration = 5 + (i % 3) * 0.7
  const floatDelay = i * 0.35

  return (
    <div
      style={{
        opacity: isDimmed ? 0.55 : 1,
        transition: 'opacity 0.3s ease',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.92 }}
        animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{
          duration: 0.7,
          delay: i * 0.06,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        <Link href={mod.href} className="block">
          <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={handleMouseLeave}
            className="relative"
            style={{
              rotateX,
              rotateY,
              transformPerspective: 1200,
              transformStyle: 'preserve-3d',
            }}
            animate={{ y: isHovered ? -6 : 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Number badge — subtle mono */}
            <div className="absolute top-0 left-0 z-20 pointer-events-none">
              <span
                className="font-mono text-[10px] md:text-[11px] font-bold tracking-[0.18em]"
                style={{
                  color: isHovered ? mod.color : '#C8C8C0',
                  transition: 'color 0.3s ease',
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
            </div>

            {/* Spotlight glow — radial gradient in module's accent color */}
            <motion.div
              className="absolute inset-x-0 top-0 aspect-square rounded-2xl pointer-events-none"
              style={{
                background: spotlightBg,
                opacity: isHovered ? 1 : 0,
                transition: 'opacity 0.3s ease',
              }}
            />

            {/* Illustration — continuous idle float + hover scale */}
            <motion.div
              className="relative aspect-square flex items-center justify-center p-6 md:p-8 mb-4"
              animate={{ y: [0, -3, 0] }}
              transition={{
                duration: floatDuration,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: floatDelay,
              }}
            >
              <motion.div
                animate={{ scale: isHovered ? 1.08 : 1 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="w-full h-full"
              >
                <Image
                  src={mod.image}
                  alt={mod.label}
                  width={1000}
                  height={1000}
                  className="w-full h-full object-contain"
                />
              </motion.div>
            </motion.div>

            {/* Label */}
            <div className="px-1 relative">
              <h3
                className="text-[17px] md:text-[19px] font-bold tracking-tight"
                style={{ color: '#1A1A1A' }}
              >
                {mod.label}
                <span style={{ color: mod.color }}>.</span>
              </h3>
              <p
                className="text-[13px] md:text-[14px] mt-0.5"
                style={{ color: '#9B9B95' }}
              >
                {mod.sub}
              </p>
              {/* Underline — grows on hover */}
              <div
                className="h-[2px] mt-3 rounded-full"
                style={{
                  backgroundColor: mod.color,
                  width: isHovered ? 44 : 0,
                  transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            </div>
          </motion.div>
        </Link>
      </motion.div>
    </div>
  )
}
