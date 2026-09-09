/**
 * FILMTEST: drie shots uit "een dag" als echte video, om te weten of het
 * generatieve pad leeft voordat er 22 shots besteld worden.
 *
 * Waarom deze drie: 1A, 6A en 10A leunen alle drie volledig op licht en sfeer
 * en niet op handeling. Haalt een model die niet, dan haalt het de rest ook
 * niet en is de vraag beantwoord voor onder de twee dollar.
 *
 * PATROON GELEEND van kunstdoekje scripts/lib/falvideo.mjs, met twee bewuste
 * afwijkingen:
 *
 * 1. Daar staat NEGATIEF_KAMER camerabeweging en handheld shake af, omdat de
 *    wand stil moet staan om het doek terug te kunnen plakken. Deze film vraagt
 *    lichte handheld, dus dat negatief zou hier precies het verkeerde weghalen.
 *    Zie NEGATIEF_BEELD en NEGATIEF_VIDEO hieronder.
 * 2. Geen @fal-ai/client. forgedesk/CLAUDE.md staat geen nieuwe npm packages toe
 *    zonder toestemming, en de REST-wachtrij van fal doet hetzelfde met de
 *    fetch die al in Node zit.
 *
 * Draaien:  FAL_KEY=... node filmtest.mjs --ja
 * Zonder --ja rekent hij alleen de kosten uit en bestelt niets.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HIER = dirname(fileURLToPath(import.meta.url))
const UIT = join(HIER, 'out')

const BEELD = { id: 'fal-ai/flux-pro/v1.1-ultra', prijs: 0.06 }
const VIDEO = { id: 'fal-ai/kling-video/v3/pro/image-to-video', perSeconde: 0.112 }
const DUUR = 5

/**
 * Wat een model bij deze film standaard fout doet.
 *
 * De eerste vier komen uit het brief zelf (geen kantoortuin, geen
 * stockfoto-glimlach, geen high five, oranje alleen op UI en werkkleding). De
 * laatste twee houden het beeld een opname in plaats van een reclame: zodra er
 * HDR en lens flare in zit, leest het als een stockvideo en is de rust weg.
 */
const NEGATIEF_BEELD =
  'stock photo smile, smiling at camera, corporate office, open plan office, ' +
  'business people, high five, handshake, orange props, orange objects, ' +
  'orange furniture, text, watermark, logo, floating 3d ui panel, fake user ' +
  'interface, screen mockup, oversaturated, HDR, glossy advertisement, lens flare'

/** Handheld mag, gestuurde camerabeweging niet. Dat is het hele verschil met kunstdoekje. */
const NEGATIEF_VIDEO =
  'camera pan, camera zoom, dolly, crane, whip pan, orbiting camera, ' +
  'morphing objects, warping walls, melting geometry, people appearing, ' +
  'text, watermark, fast motion, timelapse, slow motion ramp'

const SHOTS = [
  {
    naam: '1A-wekker',
    scene: 'Scene 1, 00:00 tot 02:14, 2,6s',
    bewijst: 'het uur waarop zijn dag begint',
    beeld:
      'Extreme close-up macro photograph of a small digital alarm clock display ' +
      'on a wooden nightstand in a dark bedroom, cold grey pre-dawn light seeping ' +
      'through closed curtains, an out-of-focus male hand entering from the left ' +
      'edge of frame reaching toward a phone, 85mm macro lens at f1.8, very ' +
      'shallow depth of field, cinematic film still, natural available light only, ' +
      'muted desaturated palette, deep petrol blue shadows, cool grey highlights, ' +
      '35mm film grain, anamorphic, documentary realism',
    video:
      'almost no motion, the out-of-focus hand drifts slowly toward the phone, ' +
      'very subtle handheld camera breathing, the room stays still, calm and quiet',
  },
  {
    naam: '6A-werkplaats',
    scene: 'Scene 6, 34:00 tot 35:05, 1,2s',
    bewijst: 'de werkplaats is echt, geen set',
    beeld:
      'Wide establishing shot inside a real Dutch sign-making workshop, a large ' +
      'format printer running in the background, sheets of aluminium composite ' +
      'panel stacked against a deep petrol blue painted wall, a CNC router on the ' +
      'left, industrial overhead lights mixed with cold daylight from an open ' +
      'roller door, fine dust suspended in the light beams, worn concrete floor, ' +
      '24mm lens, deep petrol and warm amber palette, cinematic documentary film ' +
      'still, natural light, 35mm film grain, no people in frame',
    video:
      'the printer carriage moves slowly across in the background, dust drifts ' +
      'gently through the shafts of light, very subtle handheld camera breathing, ' +
      'the camera stays in place',
  },
  {
    naam: '10A-avondtafel',
    scene: 'Scene 10, 64:00 tot 66:10, 2,4s',
    bewijst: 'de dag sluit zichzelf af terwijl hij aan tafel zit',
    beeld:
      'Evening interior, a smartphone lying face up on a worn wooden dining ' +
      'table, warm low lamplight from the left, deep soft shadows, a dark petrol ' +
      'blue kitchen wall behind, a half empty glass out of focus in the ' +
      'foreground, 50mm lens at f1.4, very shallow depth of field, quiet Dutch ' +
      'domestic interior at night, cinematic film still, natural light only, ' +
      '35mm film grain, no people in frame',
    video:
      'almost completely still, the phone screen lights up softly on its own, ' +
      'the warm lamp flickers almost imperceptibly, very subtle handheld camera ' +
      'breathing',
  },
]

const sleutel = process.env.FAL_KEY
const doen = process.argv.includes('--ja')

const kostenBeeld = SHOTS.length * BEELD.prijs
const kostenVideo = SHOTS.length * VIDEO.perSeconde * DUUR
console.log(`\nfilmtest "een dag" — ${SHOTS.length} shots`)
console.log(`  beeld  ${BEELD.id}  ${SHOTS.length} x $${BEELD.prijs.toFixed(2)} = $${kostenBeeld.toFixed(2)} (bij benadering)`)
console.log(`  video  ${VIDEO.id}  ${SHOTS.length} x ${DUUR}s x $${VIDEO.perSeconde} = $${kostenVideo.toFixed(2)}`)
console.log(`  totaal ongeveer $${(kostenBeeld + kostenVideo).toFixed(2)}\n`)

if (!doen) {
  console.log('Alleen gerekend. Voeg --ja toe om echt te bestellen.\n')
  process.exit(0)
}
if (!sleutel) {
  console.error('FAL_KEY ontbreekt. Draai als: FAL_KEY=... node filmtest.mjs --ja\n')
  process.exit(1)
}

/**
 * Een fal-model via de REST-wachtrij, met polling.
 *
 * fal antwoordt met een request_id en een status-URL; die pollen we tot IN_QUEUE
 * en IN_PROGRESS voorbij zijn. Video duurt hier al gauw een paar minuten, dus de
 * limiet staat ruim.
 */
async function bestel(modelId, invoer, label) {
  const kop = { Authorization: `Key ${sleutel}`, 'Content-Type': 'application/json' }
  const start = await fetch(`https://queue.fal.run/${modelId}`, {
    method: 'POST',
    headers: kop,
    body: JSON.stringify(invoer),
  })
  if (!start.ok) throw new Error(`${label}: wachtrij weigert (${start.status}) ${await start.text()}`)
  const { status_url, response_url } = await start.json()

  for (let poging = 0; poging < 240; poging++) {
    await new Promise((r) => setTimeout(r, 3000))
    const st = await fetch(status_url, { headers: kop })
    if (!st.ok) throw new Error(`${label}: status faalt (${st.status})`)
    const { status } = await st.json()
    if (status === 'COMPLETED') {
      const res = await fetch(response_url, { headers: kop })
      if (!res.ok) throw new Error(`${label}: resultaat faalt (${res.status})`)
      return res.json()
    }
    if (status !== 'IN_QUEUE' && status !== 'IN_PROGRESS') {
      throw new Error(`${label}: onverwachte status ${status}`)
    }
  }
  throw new Error(`${label}: te lang in de wachtrij`)
}

const bewaar = async (url, pad) => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`downloaden faalt (${r.status})`)
  writeFileSync(pad, Buffer.from(await r.arrayBuffer()))
}

mkdirSync(UIT, { recursive: true })
let uitgegeven = 0
const mislukt = []

for (const shot of SHOTS) {
  console.log(`\n${shot.naam}  ${shot.scene}`)
  console.log(`  bewijst: ${shot.bewijst}`)
  try {
    process.stdout.write('  startbeeld... ')
    const b = await bestel(
      BEELD.id,
      {
        prompt: shot.beeld,
        negative_prompt: NEGATIEF_BEELD,
        aspect_ratio: '16:9',
        num_images: 1,
        output_format: 'jpeg',
        enable_safety_checker: true,
      },
      `${shot.naam} beeld`,
    )
    const beeldUrl = b?.images?.[0]?.url
    if (!beeldUrl) throw new Error('geen beeld terug')
    await bewaar(beeldUrl, join(UIT, `${shot.naam}.jpg`))
    uitgegeven += BEELD.prijs
    console.log('klaar')

    process.stdout.write(`  clip ${DUUR}s... `)
    const v = await bestel(
      VIDEO.id,
      {
        prompt: shot.video,
        start_image_url: beeldUrl,
        duration: String(DUUR),
        generate_audio: false,
        negative_prompt: NEGATIEF_VIDEO,
      },
      `${shot.naam} video`,
    )
    const videoUrl = v?.video?.url
    if (!videoUrl) throw new Error('geen video terug')
    await bewaar(videoUrl, join(UIT, `${shot.naam}.mp4`))
    uitgegeven += VIDEO.perSeconde * DUUR
    console.log('klaar')
  } catch (e) {
    console.log(`MISLUKT: ${e.message}`)
    mislukt.push(shot.naam)
  }
}

console.log(`\nklaar. ongeveer $${uitgegeven.toFixed(2)} uitgegeven, bestanden in ${UIT}`)
if (mislukt.length) console.log(`mislukt: ${mislukt.join(', ')}`)
console.log()
