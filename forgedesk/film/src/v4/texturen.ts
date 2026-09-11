import { useEffect, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { continueRender, delayRender } from 'remotion'
import * as THREE from 'three'
import { Mail, FileSpreadsheet, MessageCircle, CalendarDays, ClipboardList, Phone } from 'lucide-react'
import { LOGO_VIEWBOX } from '../kern/LogoDoen'
import { fontsKlaar } from '../fonts'
import { thema } from './thema'

// Alle texturen voor de 3D-wereld worden één keer op canvas getekend en als
// THREE.CanvasTexture gebruikt. Geen live DOM in de scène: het logo, de
// tool-kaartjes en de gloed zijn plaatjes, zodat elk frame identiek rendert.

// Dezelfde letterpaden als LogoDoen (d, o, e, n); de punt is een aparte bol.
const LOGO_LETTERS = ["M170.03,198.76v90.76c0,7.28,0,14.65.15,21.97h-21.28c-.44-2.4-.87-6.53-1.01-8.35-3.86,6.29-10.74,10.2-22.68,10.2-20.21,0-33.07-16.23-33.07-41.17s13.67-42.48,36.31-42.48c11.5,0,17.68,4.06,19.45,7.64v-38.58h22.13ZM114.87,271.6c0,15.58,6.07,24.02,16.9,24.02,15.22,0,16.97-12.69,16.97-24.18,0-13.67-1.93-24.01-16.4-24.01-11.62,0-17.48,9.07-17.48,24.17Z", "M256.16,271.37c0,24.19-14.47,41.98-39.8,41.98s-39.26-17.69-39.26-41.55,14.92-42.09,40.3-42.09c23.53,0,38.75,16.6,38.75,41.67ZM199.56,271.52c0,15.39,6.62,24.5,17.28,24.5s16.85-9.12,16.85-24.37c0-16.73-6.14-24.64-17.16-24.64-10.26,0-16.97,7.6-16.97,24.5Z", "M282.01,276.26c.02,10,5.03,19.77,16.05,19.77,9.21,0,11.85-3.7,13.95-8.53h22.15c-2.84,9.78-11.56,25.85-36.68,25.85s-37.75-19.69-37.75-40.66c0-25.07,12.87-42.98,38.54-42.98,27.45,0,36.79,19.86,36.79,39.81,0,2.71,0,4.46-.29,6.74h-52.75ZM312.88,262.66c-.15-9.31-3.87-17.14-14.66-17.14s-14.87,7.31-15.75,17.14h30.41Z", "M342.84,251.69c0-6.79,0-14.23-.15-20.14h21.43c.44,2.06.74,7.61.85,10.18,2.72-5.02,9.19-12.04,23.19-12.04,16.06,0,26.49,10.85,26.49,30.94v50.85h-22.13v-48.39c0-8.99-3-15.5-12.76-15.5s-14.78,5.23-14.78,19.34v44.55h-22.13v-59.8Z"]

export type ToolKaartDef = { id: string; label: string; sub: string; Icon: typeof Mail; kleur: string }
// Zes losse tools: mail, Excel, WhatsApp, agenda, papieren werkbon, telefoon.
export const TOOL_KAARTEN: ToolKaartDef[] = [
  { id: 'mail', label: 'Mail', sub: '1.204 ongelezen', Icon: Mail, kleur: '#3A6B8C' },
  { id: 'excel', label: 'Excel', sub: 'offerte_v3_def2.xlsx', Icon: FileSpreadsheet, kleur: '#2D6B48' },
  { id: 'whatsapp', label: 'WhatsApp', sub: 'tekening voor klant?', Icon: MessageCircle, kleur: '#3A7D52' },
  { id: 'agenda', label: 'Agenda', sub: 'montage, welke dag?', Icon: CalendarDays, kleur: '#9A5A48' },
  { id: 'werkbon', label: 'Werkbon', sub: 'papier, in de bus', Icon: ClipboardList, kleur: '#C44830' },
  { id: 'telefoon', label: 'Telefoon', sub: '3 gemiste oproepen', Icon: Phone, kleur: '#1A535C' },
]

// Kaartje-textuur: 880 x 520 px voor een kaart van 2,2 x 1,3 wereld-eenheden.
export const KAART_PX = { b: 880, h: 520 }

export type Texturen = {
  logo: THREE.CanvasTexture
  logoGloed: THREE.CanvasTexture
  gloed: THREE.CanvasTexture
  schaduw: THREE.CanvasTexture
  kaarten: Record<string, THREE.CanvasTexture>
}

const laadSvg = (svg: string) => new Promise<HTMLImageElement>((ok, fout) => {
  const img = new Image()
  img.onload = () => ok(img)
  img.onerror = () => fout(new Error('svg laadt niet'))
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
})

const canvasTextuur = (c: HTMLCanvasElement) => {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  t.needsUpdate = true
  return t
}

const rondeRect = (ctx: CanvasRenderingContext2D, x: number, y: number, b: number, h: number, r: number) => {
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.lineTo(x + b - r, y); ctx.quadraticCurveTo(x + b, y, x + b, y + r)
  ctx.lineTo(x + b, y + h - r); ctx.quadraticCurveTo(x + b, y + h, x + b - r, y + h)
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath()
}

// Logo: 6x de viewBox, letters in warm wit. De punt blijft leeg (dat is de bol).
const tekenLogo = (blur: number, kleur = thema.kleur.petrol) => {
  const s = 6
  const c = document.createElement('canvas'); c.width = LOGO_VIEWBOX.b * s; c.height = LOGO_VIEWBOX.h * s
  const ctx = c.getContext('2d')!
  ctx.clearRect(0, 0, c.width, c.height)
  if (blur > 0) ctx.filter = `blur(${blur}px)`
  ctx.save(); ctx.scale(s, s); ctx.translate(-LOGO_VIEWBOX.x, -LOGO_VIEWBOX.y)
  ctx.fillStyle = kleur
  for (const d of LOGO_LETTERS) ctx.fill(new Path2D(d))
  ctx.restore()
  return canvasTextuur(c)
}

// Zachte radiale gloed voor de punt (sprite).
const tekenGloed = () => {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(256, 256, 0, 256, 256, 256)
  g.addColorStop(0, `${thema.kleur.flame}FF`); g.addColorStop(0.25, `${thema.kleur.flame}99`); g.addColorStop(0.6, `${thema.kleur.flame}22`); g.addColorStop(1, `${thema.kleur.flame}00`)
  ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 512)
  return canvasTextuur(c)
}

// Zachte slagschaduw onder het paneel: geblurde afgeronde rechthoek in petrol.
const tekenSchaduw = () => {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512
  const ctx = c.getContext('2d')!
  ctx.filter = 'blur(38px)'
  rondeRect(ctx, 120, 120, 784, 272, 40); ctx.fillStyle = `${thema.kleur.petrol}8C`; ctx.fill()
  return canvasTextuur(c)
}

// Tool-kaartje: witte kaart, icoon in tint, naam en subregel.
const tekenKaart = async (k: ToolKaartDef) => {
  const { b, h } = KAART_PX
  const c = document.createElement('canvas'); c.width = b; c.height = h
  const ctx = c.getContext('2d')!
  ctx.clearRect(0, 0, b, h)
  // Glas: halfdoorzichtig wit met een lichte verloop-glans en een witte hairline
  rondeRect(ctx, 0, 0, b, h, 64)
  const glans = ctx.createLinearGradient(0, 0, b, h)
  glans.addColorStop(0, 'rgba(255,255,255,0.86)'); glans.addColorStop(0.5, 'rgba(255,255,255,0.68)'); glans.addColorStop(1, 'rgba(255,255,255,0.78)')
  ctx.fillStyle = glans; ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 4; rondeRect(ctx, 2, 2, b - 4, h - 4, 62); ctx.stroke()
  // Speculaire veeg linksboven
  const veeg = ctx.createLinearGradient(0, 0, b * 0.6, h)
  veeg.addColorStop(0, 'rgba(255,255,255,0.35)'); veeg.addColorStop(0.45, 'rgba(255,255,255,0)')
  rondeRect(ctx, 0, 0, b, h, 64); ctx.fillStyle = veeg; ctx.fill()
  // Icoon-tegel
  const tegel = 200
  rondeRect(ctx, 64, (h - tegel) / 2, tegel, tegel, 48); ctx.fillStyle = `${k.kleur}1F`; ctx.fill()
  const svg = renderToStaticMarkup(createElement(k.Icon, { size: 104, color: k.kleur, strokeWidth: 1.9 }))
  const img = await laadSvg(svg)
  ctx.drawImage(img, 64 + (tegel - 104) / 2, (h - 104) / 2, 104, 104)
  // Tekst
  const x = 64 + tegel + 56
  ctx.fillStyle = thema.kleur.ink
  ctx.font = `700 76px ${thema.fonts.kop}`
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(k.label, x, h / 2 - 12)
  ctx.fillStyle = thema.kleur.tekstSec
  ctx.font = `500 44px ${thema.fonts.body}`
  ctx.fillText(k.sub, x, h / 2 + 52, b - x - 56)
  return canvasTextuur(c)
}

export const maakTexturen = async (): Promise<Texturen> => {
  await fontsKlaar
  const kaarten: Record<string, THREE.CanvasTexture> = {}
  for (const k of TOOL_KAARTEN) kaarten[k.id] = await tekenKaart(k)
  return { logo: tekenLogo(0), logoGloed: tekenLogo(18, thema.kleur.lichtWarm), gloed: tekenGloed(), schaduw: tekenSchaduw(), kaarten }
}

// Hook: houdt de render vast tot alle texturen er zijn.
export const useTexturen = () => {
  const [tex, setTex] = useState<Texturen | null>(null)
  useEffect(() => {
    const h = delayRender('v4 texturen')
    let actief = true
    maakTexturen().then((t) => { if (actief) setTex(t); continueRender(h) }).catch((e) => { console.error(e); continueRender(h) })
    return () => { actief = false }
  }, [])
  return tex
}
