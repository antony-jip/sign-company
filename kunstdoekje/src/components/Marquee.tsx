const ITEMS = [
  'Eén frame',
  'Eindeloos wisselen',
  '1000+ kunstwerken',
  'Gewisseld in 30 seconden',
  'Fluweel of decostof',
  'Geprint in Nederland',
]

/** Doorlopende merkband — ink met gouden separators, licht gekanteld. */
export default function Marquee() {
  const strip = (
    <span className="flex shrink-0 items-center">
      {ITEMS.map((t) => (
        <span key={t} className="flex items-center">
          <span className="px-7 font-serif text-base font-extrabold uppercase tracking-[0.08em] text-canvas md:text-lg">{t}</span>
          <span className="font-accent text-xl italic text-accent">+</span>
        </span>
      ))}
    </span>
  )

  return (
    <div className="relative -mx-2 -rotate-1 overflow-hidden border-y-2 border-ink bg-ink py-4">
      <div className="kd-marquee-track flex w-max">
        {strip}
        {strip}
      </div>
    </div>
  )
}
