// Schaalt een still op via FAL (Clarity Upscaler), voor beelden die groot in beeld komen.
// Draai: node --env-file=<env> assets/upscale.mjs gevel-avond [factor]
import { fal } from '@fal-ai/client'
import fs from 'node:fs'
import path from 'node:path'
const hier = path.dirname(new URL(import.meta.url).pathname)
const doel = path.join(hier, '..', 'public', 'sfeer')
fal.config({ credentials: process.env.FAL_AI_API_KEY || process.env.FAL_KEY })
const [id, factor = '2'] = process.argv.slice(2)
const bron = path.join(doel, `${id}.jpg`)
const uit = path.join(doel, `${id}-scherp.jpg`)
const image_url = await fal.storage.upload(new Blob([fs.readFileSync(bron)], { type: 'image/jpeg' }))
console.log(`upscale ${id} x${factor} ...`)
const { data } = await fal.subscribe('fal-ai/clarity-upscaler', { input: { image_url, upscale_factor: Number(factor), creativity: 0.2, resemblance: 0.8 }, logs: false })
const url = data?.image?.url
if (!url) throw new Error(JSON.stringify(data).slice(0, 300))
const r = await fetch(url); fs.writeFileSync(uit, Buffer.from(await r.arrayBuffer()))
console.log('klaar:', uit)
