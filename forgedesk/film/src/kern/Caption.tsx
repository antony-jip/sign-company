import type { ReactNode } from 'react'
import { fonts } from '../fonts'
import { merk } from '../brand'
import { veer, vlak } from '../tijd'

type Props = {
  t: number
  van: number
  children: ReactNode
  // Onderin (standaard) of bovenin, als de UI onder de vouw belangrijker is.
  positie?: 'onder' | 'boven'
  donker?: boolean
}

// Eén regel per scene, groot, leesbaar zonder geluid. Komt op met een veer.
export const Caption: React.FC<Props> = ({ t, van, children, positie = 'onder', donker = true }) => {
  const p = veer(t, van, { demping: 18, duurMs: 700 })
  const op = vlak(t, van, van + 250)
  return (
    <div
      style={{
        position: 'absolute', left: 72, right: 72, zIndex: 30,
        ...(positie === 'onder' ? { bottom: 300 } : { top: 300 }),
        opacity: op,
        transform: `translateY(${(1 - p) * 40}px)`,
        fontFamily: fonts.kop, fontWeight: 700, fontSize: 92, lineHeight: 1.02, letterSpacing: '-0.035em',
        color: donker ? merk.wit : merk.ink,
        textShadow: donker ? '0 4px 40px rgba(0,0,0,0.35)' : undefined,
        textWrap: 'balance' as never,
      }}
    >
      {children}
    </div>
  )
}
