'use client'

/**
 * Sticky vertical edge label — rotated mono text pinned to the left margin.
 * Tablet / CYBR_BRUTALISM style. Hidden on mobile (no room).
 */
export default function VerticalEdgeLabel() {
  return (
    <div
      aria-hidden
      className="hidden xl:flex fixed left-0 top-0 bottom-0 w-8 z-30 items-center justify-center pointer-events-none select-none"
    >
      <div
        className="font-mono text-[10px] font-bold tracking-[0.35em] uppercase whitespace-nowrap"
        style={{
          color: 'rgba(26,83,92,0.55)',
          transform: 'rotate(-90deg)',
          transformOrigin: 'center',
        }}
      >
        doen. · Vol. 01 · Editie 2026 · Voor signmakers
      </div>
    </div>
  )
}
