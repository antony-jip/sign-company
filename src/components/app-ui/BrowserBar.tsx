import { BG, LINE, MUTED } from './tokens'

/* De browserbalk boven elke app-nabouw op de site. Eén bron, zodat de
   klikbare showcase op de homepage en de mail-naar-project-nabouw op
   /demo-plannen niet uit elkaar lopen. */
export default function BrowserBar({ pad }: { pad: string }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 shrink-0"
      style={{ backgroundColor: '#F0EEE8', borderBottom: `1px solid ${LINE}` }}
    >
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#E5A4A4' }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#E5CFA4' }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#A4D9B8' }} />
      </div>
      <div
        className="flex-1 mx-3 px-3 py-1 rounded-full font-mono text-[10px] md:text-[11px] tracking-wide hidden sm:block"
        style={{ backgroundColor: BG, color: MUTED, border: `1px solid ${LINE}` }}
      >
        app.doen.team / {pad}
      </div>
    </div>
  )
}
