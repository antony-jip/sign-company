// Genereert muziek en geluidseffecten via FAL naar public/audio/.
// Draai: node --env-file=<env met FAL_AI_API_KEY> assets/audio.mjs [ids]
import { fal } from '@fal-ai/client'
import fs from 'node:fs'
import path from 'node:path'

const hier = path.dirname(new URL(import.meta.url).pathname)
const conf = JSON.parse(fs.readFileSync(path.join(hier, 'audio.json'), 'utf8'))
const doel = path.join(hier, '..', 'public', 'audio')
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

for (const m of conf.muziek.filter(wil)) {
  const pad = path.join(doel, m.bestand)
  if (fs.existsSync(pad) && alleen.length === 0) { console.log(`bestaat: ${m.bestand}`); continue }
  try {
    console.log(`muziek ${m.id} ...`)
    const { data } = await fal.subscribe(conf.model_muziek, { input: { prompt: m.prompt, is_instrumental: true, audio_setting: { format: 'mp3', sample_rate: 44100, bitrate: 256000 } }, logs: false })
    await download(data.audio.url, pad); console.log(`klaar: ${m.bestand}`)
  } catch (e) { console.error(`FOUT ${m.id}:`, e?.message || e) }
}
for (const s of conf.sfx.filter(wil)) {
  const pad = path.join(doel, s.bestand)
  if (fs.existsSync(pad) && alleen.length === 0) { console.log(`bestaat: ${s.bestand}`); continue }
  try {
    console.log(`sfx ${s.id} ...`)
    const { data } = await fal.subscribe(conf.model_sfx, { input: { text: s.prompt, duration_seconds: s.duur, prompt_influence: 0.5, output_format: 'mp3_44100_128' }, logs: false })
    await download(data.audio.url, pad); console.log(`klaar: ${s.bestand}`)
  } catch (e) { console.error(`FOUT ${s.id}:`, e?.message || e) }
}
