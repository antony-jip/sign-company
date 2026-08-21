#!/usr/bin/env node
// Bouwt public/fotobank-signcompany.json: alle live foto's van signcompany.nl
// (uit de lokale werkkopie van signcompany-next) met titel, categorie en
// afmetingen, voor de fotokiezer in de nieuwsbrief-bouwer.
//
//   node scripts/fotobank-signcompany.mjs [pad-naar-signcompany-next-repo]
//
// Standaardpad: ~/signcompany-next-werk/repo. Responsive varianten (-800w),
// logo's/iconen en plaatjes smaller dan 480px worden overgeslagen.
import { readFileSync, writeFileSync, readdirSync, statSync, openSync, readSync, closeSync } from 'node:fs'
import { join, relative, extname, basename, dirname } from 'node:path'
import { homedir } from 'node:os'

const REPO = process.argv[2] || join(homedir(), 'signcompany-next-werk', 'repo')
const UIT = new URL('../public/fotobank-signcompany.json', import.meta.url).pathname
const BASIS_URL = 'https://signcompany.nl'
const MIN_BREEDTE = 480
const EXT = new Set(['.webp', '.jpg', '.jpeg', '.png'])

function* loop(dir) {
  for (const naam of readdirSync(dir)) {
    const p = join(dir, naam)
    const st = statSync(p)
    if (st.isDirectory()) yield* loop(p)
    else if (EXT.has(extname(naam).toLowerCase())) yield p
  }
}

function leesKop(p, n = 64 * 1024) {
  const fd = openSync(p, 'r')
  const buf = Buffer.alloc(n)
  const len = readSync(fd, buf, 0, n, 0)
  closeSync(fd)
  return buf.subarray(0, len)
}

// Minimale header-parsers; geen npm-dependency nodig.
function afmetingen(p) {
  const b = leesKop(p)
  try {
    if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
      const chunk = b.toString('ascii', 12, 16)
      if (chunk === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) }
      if (chunk === 'VP8L') { const bits = b.readUInt32LE(21); return { w: 1 + (bits & 0x3fff), h: 1 + ((bits >> 14) & 0x3fff) } }
      if (chunk === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff }
    }
    if (b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG') return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }
    if (b[0] === 0xff && b[1] === 0xd8) {
      let i = 2
      while (i < b.length - 9) {
        if (b[i] !== 0xff) { i++; continue }
        const m = b[i + 1]
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) }
        i += 2 + b.readUInt16BE(i + 2)
      }
    }
  } catch { /* onbekend formaat */ }
  return null
}

function humaniseer(s) {
  return s.replace(/\.[a-z]+$/i, '').replace(/[-_]+/g, ' ').replace(/\s+\d+w?$/, '').replace(/\s+/g, ' ').trim()
    .replace(/^./, c => c.toUpperCase())
}

const index = JSON.parse(readFileSync(join(REPO, 'fotos', 'wp-media-index.json'), 'utf8')).items
const titelPerBestand = new Map(index.map(i => [i.bestand, i]))

const items = []
const gezien = new Set()
for (const map of ['fotos', 'assets']) {
  for (const p of loop(join(REPO, map))) {
    const rel = relative(REPO, p).split('\\').join('/')
    const naam = basename(rel)
    if (/logo|favicon|pictogram|(^|[-_/])icon/i.test(rel)) continue
    if (/-\d{3,4}w?\.(webp|jpe?g|png)$/i.test(naam) && !/^(assets\/20\d\d)/.test(rel)) continue
    const dim = afmetingen(p)
    const wp = map === 'assets' ? titelPerBestand.get(rel.replace(/^assets\//, '')) : null
    const w = dim?.w ?? wp?.breedte ?? 0
    const h = dim?.h ?? wp?.hoogte ?? 0
    if (w && w < MIN_BREEDTE) continue

    const delen = rel.split('/')
    let categorie = 'archief'
    let groep = ''
    if (delen[0] === 'fotos' && delen[1] === 'projecten') { categorie = 'project'; groep = humaniseer(delen[2] || '') }
    else if (delen[0] === 'fotos' && delen[1] === 'oplossingen') { categorie = 'oplossing'; groep = humaniseer(delen[2] || '') }
    else if (delen[0] === 'fotos' && /^producten/.test(delen[1] || '')) { categorie = 'product'; groep = humaniseer(delen[2] || delen[1]) }
    else if (delen[0] === 'fotos') { categorie = 'site'; groep = 'Homepage' }
    else { groep = delen[1] || '' }

    // Varianten van hetzelfde beeld (bv. -800w naast origineel) één keer tonen.
    const sleutel = rel.replace(/-\d{3,4}w?(\.[a-z]+)$/i, '$1')
    if (gezien.has(sleutel)) continue
    gezien.add(sleutel)

    items.push({
      url: `${BASIS_URL}/${rel}`,
      titel: wp?.titel || humaniseer(naam),
      categorie,
      groep,
      w, h,
      datum: wp?.datum || (delen[0] === 'assets' ? `${delen[1]}-${delen[2]}` : ''),
    })
  }
}

items.sort((a, b) => (b.datum || '').localeCompare(a.datum || '') || a.titel.localeCompare(b.titel))
writeFileSync(UIT, JSON.stringify({ gebouwd: new Date().toISOString().slice(0, 10), bron: BASIS_URL, aantal: items.length, items }))
const perCat = items.reduce((m, i) => (m[i.categorie] = (m[i.categorie] || 0) + 1, m), {})
console.log(`fotobank: ${items.length} foto's →`, perCat, `\n${relative(process.cwd(), UIT)}`)
