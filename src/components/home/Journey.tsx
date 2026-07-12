'use client'

import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import {
  User,
  Hammer,
  FileText,
  Image as ImageIcon,
  MonitorCheck,
  CalendarClock,
  Receipt,
  Smile,
  type LucideIcon,
} from 'lucide-react'

/* Vaste ontwerpcanvas (px), geen responsive schaling: op mobiel scrollt
   de rij horizontaal, op desktop past hij binnen container-site. */
const W = 1070
const H = 300
const LINE = 'rgba(26,83,92,0.16)'

type Node = { id: string; icon: LucideIcon; label: string; sub: string; x: number; y: number; final?: boolean }

const NODES: Node[] = [
  { id: 'klant', icon: User, label: 'Klant', sub: 'doet aanvraag', x: 55, y: 140 },
  { id: 'project', icon: Hammer, label: 'Project', sub: 'alles op één plek', x: 235, y: 140 },
  { id: 'offerte', icon: FileText, label: 'Offerte', sub: 'calculeer en verstuur', x: 430, y: 60 },
  { id: 'tekening', icon: ImageIcon, label: 'Tekening', sub: 'drukproef en akkoord', x: 430, y: 220 },
  { id: 'portaal', icon: MonitorCheck, label: 'Portaal', sub: 'klant keurt goed', x: 625, y: 140 },
  { id: 'planning', icon: CalendarClock, label: 'Planning', sub: 'werkbon en montage', x: 790, y: 140 },
  { id: 'factuur', icon: Receipt, label: 'Factuur', sub: 'incasseer eenvoudig', x: 925, y: 140 },
  { id: 'gedaan', icon: Smile, label: 'Gedaan', sub: '', x: 1010, y: 140, final: true },
]

const byId = (id: string) => NODES.find((n) => n.id === id)!

/* Rechte lijn tussen twee node-middens; de opaque cirkels erbovenop
   knippen de lijn visueel af bij de rand, dus exacte straal-trim
   is niet nodig. */
const SOLID: [string, string][] = [
  ['klant', 'project'],
  ['project', 'offerte'],
  ['project', 'tekening'],
  ['offerte', 'portaal'],
  ['tekening', 'portaal'],
]
const DOTTED: [string, string][] = [
  ['portaal', 'planning'],
  ['planning', 'factuur'],
]

/* Eén rij, de hele reis in één oogopslag. Ondersteunt de quote hieronder
   met een beeld in plaats van nog meer tekst. Offerte en tekening lopen
   parallel en komen samen bij het portaal, zoals in de app. */
export default function Journey() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const reduce = useReducedMotion() ?? false
  const show = reduce || inView

  return (
    <section ref={ref} className="bg-white">
      <div className="container-site pt-16 pb-10 md:pt-24 md:pb-14">
        <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
          <div className="relative" style={{ width: W, height: H }}>
            <svg
              aria-hidden
              width={W}
              height={H}
              viewBox={`0 0 ${W} ${H}`}
              className="absolute inset-0"
            >
              {SOLID.map(([a, b]) => {
                const from = byId(a)
                const to = byId(b)
                return (
                  <line
                    key={`${a}-${b}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={LINE}
                    strokeWidth={1.5}
                  />
                )
              })}
              {DOTTED.map(([a, b]) => {
                const from = byId(a)
                const to = byId(b)
                return (
                  <line
                    key={`${a}-${b}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={LINE}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeDasharray="1 9"
                  />
                )
              })}
              {/* Laatste hop: flame, met pijlpunt richting Gedaan */}
              <line
                x1={byId('factuur').x}
                y1={byId('factuur').y}
                x2={byId('gedaan').x - 4}
                y2={byId('gedaan').y}
                stroke="#F15025"
                strokeWidth={2}
              />
              <path
                d={`M ${byId('gedaan').x - 12} ${byId('gedaan').y - 6} L ${byId('gedaan').x - 2} ${byId('gedaan').y} L ${byId('gedaan').x - 12} ${byId('gedaan').y + 6} Z`}
                fill="#F15025"
              />
            </svg>

            {NODES.map((node, i) => {
              const Icon = node.icon
              return (
                // Buitenste div: statische centrering. Framer-motion beheert de
                // transform-property zelf voor de y-animatie, dus centreren via
                // transform moet op een laag die framer niet aanraakt.
                <div
                  key={node.id}
                  className="absolute"
                  style={{ left: node.x, top: node.y, width: 104, transform: 'translate(-50%, -50%)' }}
                >
                  <motion.div
                    initial={reduce ? false : { opacity: 0, y: 10 }}
                    animate={show ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: reduce ? 0 : 0.06 * i, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col items-center text-center"
                  >
                    <div
                      className={`flex items-center justify-center rounded-full shrink-0 ${
                        node.final ? 'w-14 h-14 bg-petrol-deep' : 'w-12 h-12 bg-white border border-petrol/20'
                      }`}
                      style={
                        node.final
                          ? { boxShadow: '0 0 0 6px rgba(241,80,37,0.08), 0 12px 28px -10px rgba(13,52,60,0.4)' }
                          : undefined
                      }
                    >
                      <Icon className={node.final ? 'w-6 h-6 text-white' : 'w-5 h-5 text-petrol'} strokeWidth={1.8} />
                    </div>
                    <p className="mt-3 text-[14px] font-semibold text-petrol leading-tight whitespace-nowrap">
                      {node.label}
                      <span className="text-flame">.</span>
                    </p>
                    {node.sub && (
                      <p className="mt-0.5 text-[11px] text-muted leading-tight">{node.sub}</p>
                    )}
                  </motion.div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
