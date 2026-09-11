import type { ReactNode } from 'react'
import { Audio } from '@remotion/media'
import { Img, Sequence, staticFile } from 'remotion'
import { SCHERM_B, SCHERM_H } from '../kern/TelefoonFrame'
import { msNaarFrames, veer, vlak } from '../tijd'
import { thema } from './thema'

// Melding (toast) rechtsboven met een label wie hem ziet ("je collega", "je klant").
export const Melding4: React.FC<{ t: number; op: number; uit: number; titel: string; tekst: string; label: string }> = ({ t, op, uit, titel, tekst, label }) => {
  if (t < op || t > uit + 300) return null
  const inP = veer(t, op, { demping: 16, duurMs: 600 })
  const zicht = Math.min(vlak(t, op, op + 200), 1 - vlak(t, uit, uit + 300, thema.ease.exit))
  if (zicht <= 0) return null
  return (
    <div style={{ position: 'absolute', right: 72, top: 64, zIndex: 68, pointerEvents: 'none', opacity: zicht, transform: `translateY(${(1 - inP) * -16}px) scale(${0.96 + inP * 0.04})`, transformOrigin: 'top right' }}>
      <div style={{ marginBottom: 12, textAlign: 'right', fontFamily: thema.fonts.kop, fontWeight: 700, fontSize: 30, letterSpacing: '-0.015em', color: thema.kleur.petrol, opacity: 0.7 }}>{label}<span style={{ color: thema.kleur.flame }}>.</span></div>
      <div style={{ width: 620, padding: '22px 26px', borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.86)', backdropFilter: 'blur(22px) saturate(1.3)', WebkitBackdropFilter: 'blur(22px) saturate(1.3)', boxShadow: '0 30px 70px -30px rgba(26,83,92,0.4), 0 0 0 1px rgba(255,255,255,0.9) inset', display: 'flex', gap: 18, alignItems: 'flex-start' }}>
        <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: thema.kleur.flame, marginTop: 8, flexShrink: 0 }} />
        <div>
          <div style={{ fontFamily: thema.fonts.kop, fontWeight: 700, fontSize: 30, letterSpacing: '-0.02em', color: thema.kleur.ink, lineHeight: 1.15 }}>{titel}</div>
          <div style={{ marginTop: 6, fontFamily: thema.fonts.body, fontWeight: 500, fontSize: 22, color: thema.kleur.tekstSec, lineHeight: 1.3 }}>{tekst}</div>
        </div>
      </div>
    </div>
  )
}

// Telefoonframe voor de klant en de monteur: petrol behuizing, ronde hoeken,
// hairline toplicht. De inhoud is 390 x 844 (TelefoonFrame-maat).
export const TELEFOON4 = { rand: 14, b: SCHERM_B + 28, h: SCHERM_H + 28, radius: 54 }
export const Telefoon4: React.FC<{ children: ReactNode }> = ({ children }) => (
  <div style={{ position: 'relative', width: TELEFOON4.b, height: TELEFOON4.h }}>
    <div style={{ position: 'absolute', inset: 0, borderRadius: TELEFOON4.radius, backgroundColor: thema.kleur.petrol, boxShadow: '0 60px 120px -40px rgba(26,83,92,0.55), 0 0 0 1px rgba(255,255,255,0.35), inset 0 1px 0 rgba(255,255,255,0.35)' }} />
    <div style={{ position: 'absolute', top: 0, left: TELEFOON4.radius, right: TELEFOON4.radius, height: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 100%)' }} />
    <div style={{ position: 'absolute', left: TELEFOON4.rand, top: TELEFOON4.rand, width: SCHERM_B, height: SCHERM_H, borderRadius: TELEFOON4.radius - TELEFOON4.rand, overflow: 'hidden', backgroundColor: thema.kleur.creme }}>
      {children}
      <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', width: 110, height: 30, borderRadius: 999, backgroundColor: thema.kleur.petrol, zIndex: 6 }} />
    </div>
  </div>
)

// Gevel van Van der Berg in het slot: landschapsfoto (sfeer/gevel-avond-16x9.jpg,
// flux-pro/v1.1-ultra, seed 20260911). De lichtbak zit op 27-75 procent breed en
// 14-33 procent hoog. Uit: donkere plaat met vage letters. Aan: wit, petrol
// letters, warme gloed. De punt landt op data-doel="bord-punt" als de punt
// van "van der berg."
const BAK = { l: 0.27, r: 0.754, t: 0.139, b: 0.326 }
export const Gevel4: React.FC<{ t: number; zicht: number; aanOp: number; width: number; height: number }> = ({ t, zicht, aanOp, width, height }) => {
  if (zicht <= 0) return null
  const aan = vlak(t, aanOp, aanOp + 500, thema.ease.uit)
  const bakL = width * BAK.l, bakT = height * BAK.t, bakB = width * (BAK.r - BAK.l), bakH = height * (BAK.b - BAK.t)
  const fontSize = bakH * 0.58
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: zicht, overflow: 'hidden' }}>
      <Img src={staticFile('sfeer/gevel-avond-16x9.jpg')} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      {/* Plaat: uit is hij donker, aan wordt hij wit met gloed */}
      <div style={{ position: 'absolute', left: bakL, top: bakT, width: bakB, height: bakH, backgroundColor: '#2B3A44', opacity: 1 - aan, borderRadius: 4 }} />
      <div style={{ position: 'absolute', left: bakL - 30, top: bakT - 30, width: bakB + 60, height: bakH + 60, borderRadius: 30, background: 'radial-gradient(ellipse at center, rgba(255,244,226,0.55) 0%, rgba(255,244,226,0) 70%)', opacity: aan, filter: 'blur(24px)' }} />
      <div style={{ position: 'absolute', left: bakL, top: bakT, width: bakB, height: bakH, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: thema.fonts.kop, fontWeight: 700, fontSize, letterSpacing: '-0.03em', color: thema.kleur.petrol, opacity: 0.18 + aan * 0.82 }}>
        <span style={{ position: 'relative', paddingRight: fontSize * 0.36 }}>
          van der berg
          <span data-doel="bord-punt" style={{ position: 'absolute', right: fontSize * 0.02, bottom: fontSize * 0.1, width: 1, height: 1 }} />
        </span>
      </div>
      {/* Warm licht op de gevel eronder als het bord aan is */}
      <div style={{ position: 'absolute', left: bakL - 80, top: bakT + bakH, width: bakB + 160, height: bakH * 1.3, background: 'linear-gradient(180deg, rgba(255,240,215,0.28) 0%, rgba(255,240,215,0) 100%)', opacity: aan }} />
    </div>
  )
}

// Geluid v4: elke landing van de punt hetzelfde tikje, elk statuswoord een
// diepere tik, inslag op de inslag. Muziek bouwt op tot het bord aangaat en
// valt daar weg.
export type Klank4 = { ms: number; bestand: 'klik' | 'landing' | 'inslag' | 'zwiep' | 'ding'; volume?: number }
export const Geluid4: React.FC<{ klanken: Klank4[]; muziekUitOp: number; totMs: number }> = ({ klanken, muziekUitOp, totMs }) => (
  <>
    <Sequence from={0} durationInFrames={msNaarFrames(totMs)} name="muziek">
      <Audio src={staticFile('audio/muziek-c.mp3')} volume={(f) => {
        const ms = (f / 30) * 1000
        const inP = Math.min(1, ms / 1000)
        const uitP = 1 - vlak(ms, muziekUitOp - 250, muziekUitOp + 150, thema.ease.exit)
        return 0.32 * inP * uitP
      }} />
    </Sequence>
    {klanken.map((k, i) => (
      <Sequence key={i} from={Math.max(0, msNaarFrames(k.ms) - 2)} durationInFrames={msNaarFrames(2500)} name={`sfx-${k.bestand}`}>
        <Audio src={staticFile(`audio/${k.bestand}.mp3`)} volume={k.volume ?? 0.6} />
      </Sequence>
    ))}
  </>
)

// Koppelingen (H6): de factuur gaat vanzelf naar de boekhouding, betaling via
// Mollie. Glaskaart met chips, gestaggerd, 70 ms per chip.
const KOPPELINGEN = ['Exact Online', 'Moneybird', 'e-Boekhouden', 'Mollie']
export const Koppelingen: React.FC<{ t: number; op: number; uit: number }> = ({ t, op, uit }) => {
  if (t < op || t > uit + 300) return null
  const inP = veer(t, op, { demping: 18, duurMs: 600 })
  const zicht = Math.min(vlak(t, op, op + 220), 1 - vlak(t, uit, uit + 300, thema.ease.exit))
  if (zicht <= 0) return null
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 72, zIndex: 66, pointerEvents: 'none', display: 'flex', justifyContent: 'center', opacity: zicht, transform: `translateY(${(1 - inP) * 24}px)` }}>
      <div style={{ padding: '26px 40px', borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(22px) saturate(1.3)', WebkitBackdropFilter: 'blur(22px) saturate(1.3)', boxShadow: '0 30px 70px -30px rgba(26,83,92,0.35), 0 0 0 1px rgba(255,255,255,0.9) inset', textAlign: 'center' }}>
        <div style={{ fontFamily: thema.fonts.kop, fontWeight: 700, fontSize: 56, lineHeight: 1.05, letterSpacing: '-0.035em', color: thema.kleur.petrol }}>gaat vanzelf naar je boekhouding<span style={{ color: thema.kleur.flame }}>.</span></div>
        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center', gap: 14 }}>
          {KOPPELINGEN.map((naam, i) => {
            const p = veer(t, op + 250 + i * 70, { demping: 16, duurMs: 500 })
            return (
              <div key={naam} style={{ opacity: Math.min(1, p * 1.3), transform: `translateY(${(1 - p) * 10}px) scale(${0.96 + p * 0.04})`, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px 10px 14px', borderRadius: 999, backgroundColor: thema.kleur.wit, boxShadow: '0 10px 30px -12px rgba(26,83,92,0.35), 0 0 0 1px rgba(26,83,92,0.10)', fontFamily: thema.fonts.kop, fontWeight: 700, fontSize: 26, letterSpacing: '-0.015em', color: thema.kleur.ink, whiteSpace: 'nowrap' }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: naam === 'Mollie' ? thema.kleur.flame : thema.kleur.petrol }} />{naam}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
