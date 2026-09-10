import type { ReactNode } from 'react'
import { merk, grond } from '../brand'
import { veer, vlak } from '../tijd'

// Ontwerpmaat van het scherm in css-px. Alles binnenin rendert op telefoonmaat
// en wordt met zoom naar de filmbreedte gebracht, zodat app-componenten hun
// mobiele maatvoering houden.
export const SCHERM_B = 390
export const SCHERM_H = 844

type Props = {
  t: number
  inMs?: number
  // Filmbreedte die de telefoon inneemt (px van 1080).
  breedte?: number
  // Welk punt van het scherm (telefoon-px, y) op filmhoogte `doelY` moet staan.
  // De telefoon mag boven en onder buiten beeld lopen: de camera zit op de kaart.
  focusY?: number
  doelY?: number
  children: ReactNode
  // Buiten-frame overlays in filmcoördinaten (tik-ringen bijvoorbeeld).
  overlay?: ReactNode
  kantel?: number
}

export const zoomVoor = (breedte: number) => breedte / SCHERM_B

export const TelefoonFrame: React.FC<Props> = ({ t, inMs = 0, breedte = 900, focusY = 422, doelY = 820, children, overlay, kantel = 0 }) => {
  const rand = 14
  const zoom = zoomVoor(breedte)
  const buitenB = breedte + rand * 2 * zoom
  const buitenH = SCHERM_H * zoom + rand * 2 * zoom
  const p = veer(t, inMs, { demping: 20, duurMs: 900 })
  const op = vlak(t, inMs, inMs + 300)
  return (
    <div
      style={{
        position: 'absolute', left: (1080 - buitenB) / 2, top: doelY - (rand + focusY) * zoom,
        width: buitenB, height: buitenH, opacity: op,
        transform: `translateY(${(1 - p) * 120}px) rotateY(${kantel}deg)`,
      }}
    >
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 64 * zoom, backgroundColor: grond.diep,
        boxShadow: '0 60px 120px -40px rgba(0,0,0,0.55), 0 0 0 2px rgba(255,255,255,0.06) inset',
      }} />
      <div style={{
        position: 'absolute', left: rand * zoom, top: rand * zoom, width: breedte, height: SCHERM_H * zoom,
        borderRadius: 50 * zoom, overflow: 'hidden', backgroundColor: merk.pagina,
      }}>
        <div style={{ zoom, width: SCHERM_B, height: SCHERM_H, position: 'relative', overflow: 'hidden' }}>
          {children}
        </div>
        {/* Dynamic island */}
        <div style={{ position: 'absolute', top: 14 * zoom, left: '50%', transform: 'translateX(-50%)', width: 120 * zoom, height: 34 * zoom, borderRadius: 999, backgroundColor: grond.diep }} />
      </div>
      {overlay}
    </div>
  )
}

// Statusbalk bovenin het scherm, in telefoon-px.
export const StatusBalk: React.FC<{ donker?: boolean }> = ({ donker = false }) => (
  <div style={{ height: 54, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 28px 8px', fontSize: 15, fontWeight: 600, color: donker ? '#fff' : merk.ink }}>
    <span>9:41</span>
    <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
      <span style={{ width: 17, height: 11, borderRadius: 2, border: `1.5px solid ${donker ? '#fff' : merk.ink}`, position: 'relative' }}>
        <span style={{ position: 'absolute', inset: 2, backgroundColor: donker ? '#fff' : merk.ink, borderRadius: 1 }} />
      </span>
    </span>
  </div>
)
