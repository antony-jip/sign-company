// Genereert de sfeerbeelden via FAL en schrijft ze naar public/sfeer/.
// Draai: npm run sfeer  (leest FAL_AI_API_KEY uit ../.env.local)
// Argumenten: ids om alleen die te (her)genereren, bv. `npm run sfeer -- werkplaats`.
import { fal } from '@fal-ai/client'
import fs from 'node:fs'
import path from 'node:path'

const hier = path.dirname(new URL(import.meta.url).pathname)
const manifest = JSON.parse(fs.readFileSync(path.join(hier, 'manifest.json'), 'utf8'))
const doel = path.join(hier, '..', 'public', 'sfeer')
fs.mkdirSync(doel, { recursive: true })

const sleutel = process.env.FAL_AI_API_KEY || process.env.FAL_KEY
if (!sleutel) { console.error('FAL_AI_API_KEY ontbreekt'); process.exit(1) }
fal.config({ credentials: sleutel })

const alleen = process.argv.slice(2)
const wil = (b) => alleen.length === 0 || alleen.includes(b.id)

async function download(url, bestand) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`download ${url}: ${r.status}`)
  fs.writeFileSync(bestand, Buffer.from(await r.arrayBuffer()))
}

async function still(b) {
  const pad = path.join(doel, b.bestand)
  if (fs.existsSync(pad) && alleen.length === 0) { console.log(`bestaat: ${b.bestand}`); return }
  console.log(`still ${b.id} ...`)
  const { data } = await fal.subscribe(manifest.model_still, {
    input: {
      prompt: `${b.prompt}. ${manifest.stijl}`,
      aspect_ratio: '9:16',
      seed: b.seed,
      output_format: 'jpeg',
      safety_tolerance: '2',
      enable_safety_checker: true,
    },
    logs: false,
  })
  const url = data?.images?.[0]?.url
  if (!url) throw new Error(`geen beeld voor ${b.id}: ${JSON.stringify(data).slice(0, 300)}`)
  await download(url, pad)
  console.log(`klaar: ${b.bestand} (seed ${data.seed ?? b.seed})`)
}

async function clip(b) {
  const pad = path.join(doel, b.bestand)
  if (fs.existsSync(pad) && alleen.length === 0) { console.log(`bestaat: ${b.bestand}`); return }
  const bron = manifest.beelden.find((x) => x.id === b.bron)
  const bronPad = path.join(doel, bron.bestand)
  if (!fs.existsSync(bronPad)) throw new Error(`bron ${bron.bestand} ontbreekt voor clip ${b.id}`)
  console.log(`clip ${b.id} (uit ${bron.bestand}) ...`)
  const image_url = await fal.storage.upload(new Blob([fs.readFileSync(bronPad)], { type: 'image/jpeg' }))
  const { data } = await fal.subscribe(manifest.model_clip, {
    input: { prompt: b.prompt, image_url, duration: b.duur, aspect_ratio: '9:16', cfg_scale: 0.5 },
    logs: false,
  })
  const url = data?.video?.url
  if (!url) throw new Error(`geen clip voor ${b.id}: ${JSON.stringify(data).slice(0, 300)}`)
  await download(url, pad)
  console.log(`klaar: ${b.bestand}`)
}

for (const b of manifest.beelden.filter(wil)) {
  try {
    if (b.type === 'still') await still(b)
    else await clip(b)
  } catch (e) {
    console.error(`FOUT ${b.id}:`, e?.message || e)
  }
}
