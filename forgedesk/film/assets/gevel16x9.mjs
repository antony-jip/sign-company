// Landschapsgevel voor het slot van v4 (16:9). Eén still via flux-pro/v1.1-ultra.
import { fal } from '@fal-ai/client'
import fs from 'node:fs'
import path from 'node:path'
const hier = path.dirname(new URL(import.meta.url).pathname)
fal.config({ credentials: process.env.FAL_AI_API_KEY ?? process.env.FAL_KEY })
const prompt = 'Wide 16:9 evening photograph of a modern interior design showroom facade in a Dutch town, blue hour, warm light glowing from inside the large showroom windows, a wide empty white lightbox sign panel mounted above the glass entrance with no text on it, clean plaster and dark timber facade, wet pavement reflecting light, photorealistic, architectural photography, no people, no text'
const seed = 20260911
const { data } = await fal.subscribe('fal-ai/flux-pro/v1.1-ultra', { input: { prompt, aspect_ratio: '16:9', seed, output_format: 'jpeg', safety_tolerance: '2' }, logs: false })
const url = data.images[0].url
const buf = Buffer.from(await (await fetch(url)).arrayBuffer())
const uit = path.join(hier, '../public/sfeer/gevel-avond-16x9.jpg')
fs.writeFileSync(uit, buf)
console.log('gevel ok', uit, buf.length, 'seed', seed)
