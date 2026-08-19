import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'

/**
 * Studio-proef: zet de bedrijfsnaam van de bezoeker op een van drie panden.
 *
 * Dit is dezelfde techniek als de Studio-module in de app zelf, hier uitgekleed
 * tot Ã©Ã©n handeling. De bezoeker levert alleen een naam aan en kiest uit vaste
 * foto's; er komt bewust geen upload aan te pas, want dat is de kant waar
 * misbruik en kosten hard oplopen.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PANDEN = {
  gevel: { bestand: 'gevel.jpg', plek: 'the blank fascia panel above the shop window' },
  bedrijfspand: { bestand: 'bedrijfspand.jpg', plek: 'the empty wall area beside the roller door' },
  bus: { bestand: 'bus.jpg', plek: 'the blank side panel of the van' },
} as const

type PandId = keyof typeof PANDEN

/** Namen zijn kort en bevatten geen instructies aan het model. */
const NAAM_PATROON = /^[A-Za-zÀ-ÿ0-9 .,&'’-]{2,28}$/

// Een teller per adres in het geheugen van deze instantie. Op een serverless
// omgeving draaien er meerdere naast elkaar, dus dit is een rem en geen slot;
// een gedeelde teller (Redis) is de echte oplossing zodra het druk wordt.
const tellers = new Map<string, { aantal: number; reset: number }>()
const PER_UUR = 5
const UUR = 60 * 60 * 1000

function magNog(adres: string): boolean {
  const nu = Date.now()
  const staat = tellers.get(adres)
  if (!staat || nu > staat.reset) {
    tellers.set(adres, { aantal: 1, reset: nu + UUR })
    return true
  }
  if (staat.aantal >= PER_UUR) return false
  staat.aantal += 1
  return true
}

export async function POST(request: Request) {
  const sleutel = process.env.FAL_AI_API_KEY
  if (!sleutel) {
    return NextResponse.json(
      { fout: 'De proefopstelling staat even uit. Probeer het later nog eens.' },
      { status: 503 },
    )
  }

  let naam = ''
  let pand: PandId = 'gevel'
  try {
    const body = await request.json()
    naam = String(body?.naam ?? '').trim()
    if (body?.pand in PANDEN) pand = body.pand as PandId
  } catch {
    return NextResponse.json({ fout: 'Onleesbare aanvraag.' }, { status: 400 })
  }

  if (!NAAM_PATROON.test(naam)) {
    return NextResponse.json(
      { fout: 'Vul een bedrijfsnaam in van twee tot achtentwintig tekens.' },
      { status: 400 },
    )
  }

  const adres = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'onbekend'
  if (!magNog(adres)) {
    return NextResponse.json(
      { fout: 'Je hebt er vijf achter elkaar gemaakt. Over een uur mag je weer, of je maakt een gratis account en gebruikt Studio zonder limiet.' },
      { status: 429 },
    )
  }

  try {
    const bestand = path.join(process.cwd(), 'public', 'images', 'studio', PANDEN[pand].bestand)
    const foto = await readFile(bestand)
    const dataUri = `data:image/jpeg;base64,${foto.toString('base64')}`

    const antwoord = await fetch('https://fal.run/fal-ai/nano-banana-2/edit', {
      method: 'POST',
      headers: { Authorization: `Key ${sleutel}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt:
          `Add a professional sign to ${PANDEN[pand].plek}, reading exactly "${naam}". ` +
          'Clean modern sans-serif lettering in dark grey, individual built-up letters mounted flat, ' +
          'correctly spelled, evenly spaced, centred and sized to fit with margins. ' +
          'Match the existing daylight, perspective and shadows so it looks photographed, not pasted. ' +
          'Change nothing else in the photo.',
        image_urls: [dataUri],
      }),
    })

    if (!antwoord.ok) {
      return NextResponse.json(
        { fout: 'Het maken is niet gelukt. Probeer het nog een keer.' },
        { status: 502 },
      )
    }

    const data = await antwoord.json()
    const bron = data?.images?.[0]?.url
    if (!bron) {
      return NextResponse.json(
        { fout: 'Er kwam geen beeld terug. Probeer het nog een keer.' },
        { status: 502 },
      )
    }

    // Het beeld gaat als data terug in plaats van als link naar fal.media. Zo
    // blijft de CSP dicht op img-src 'self' data:, hoeft er geen extern domein
    // opengezet te worden, en verlaat de gemaakte gevel onze eigen pagina niet.
    const beeldAntwoord = await fetch(bron)
    if (!beeldAntwoord.ok) {
      return NextResponse.json(
        { fout: 'Het beeld kon niet worden opgehaald. Probeer het nog een keer.' },
        { status: 502 },
      )
    }
    const bytes = Buffer.from(await beeldAntwoord.arrayBuffer())
    const soort = beeldAntwoord.headers.get('content-type') ?? 'image/png'

    return NextResponse.json({ beeld: `data:${soort};base64,${bytes.toString('base64')}` })
  } catch {
    return NextResponse.json(
      { fout: 'Er ging iets mis bij het maken. Probeer het nog een keer.' },
      { status: 500 },
    )
  }
}
