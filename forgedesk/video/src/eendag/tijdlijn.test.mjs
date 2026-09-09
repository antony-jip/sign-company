// Bewaakt dat de 50 shots aansluiten zonder gat of overlap en op 1800 frames
// uitkomen. De montage leunt hierop; een gat van een frame is op de tijdlijn
// onzichtbaar en in de render een zwart flits.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const bron = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'tijdlijn.ts'), 'utf8')
const shots = [...bron.matchAll(/id: "([^"]+)", scene: (\d+), van: (\d+), tot: (\d+), soort: "([^"]+)"/g)]
  .map(([, id, scene, van, tot, soort]) => ({ id, scene: +scene, van: +van, tot: +tot, soort }))

let fout = 0
const meld = (m) => { console.error('FOUT: ' + m); fout++ }

if (shots.length !== 50) meld(`50 shots verwacht, ${shots.length} gevonden`)
if (shots[0].van !== 0) meld(`begint op ${shots[0].van} in plaats van 0`)
if (shots.at(-1).tot !== 1800) meld(`eindigt op ${shots.at(-1).tot} in plaats van 1800`)

shots.forEach((s, i) => {
  if (s.tot <= s.van) meld(`${s.id} heeft duur ${s.tot - s.van}`)
  if (i > 0 && s.van !== shots[i - 1].tot) meld(`${shots[i - 1].id} eindigt op ${shots[i - 1].tot}, ${s.id} begint op ${s.van}`)
})

// Ritme uit het brief: scenes 4 tot 9 snel, scenes 1 tot 3 en 10 tot 11 traag.
const snel = shots.filter((s) => s.scene >= 4 && s.scene <= 9 && s.scene !== 5)
const traag = shots.filter((s) => [1, 2, 3, 10, 11].includes(s.scene))
const sec = (s) => (s.tot - s.van) / 24
const langsteSnel = Math.max(...snel.map(sec))
if (langsteSnel > 1.6001) meld(`snelle cut van ${langsteSnel.toFixed(2)}s, boven de afgesproken 1,6`)
if (Math.min(...traag.map(sec)) < 1.0) meld('trage cut onder 1,0s')

const perSoort = shots.reduce((a, s) => ({ ...a, [s.soort]: (a[s.soort] ?? 0) + 1 }), {})
console.log(`${shots.length} shots, ${shots.at(-1).tot} frames`)
console.log(`  beeld ${perSoort.beeld}, scherm ${perSoort.scherm}, eind ${perSoort.eind}`)
console.log(`  snelle cuts ${Math.min(...snel.map(sec)).toFixed(1)} tot ${langsteSnel.toFixed(1)}s`)
console.log(fout ? `\n${fout} fout(en)` : '\nsluit aan')
process.exit(fout ? 1 : 0)
