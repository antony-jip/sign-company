import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const config = { maxDuration: 60 }

const OWNER_USER_ID = 'ce6843e3-5cd9-4043-9461-55071bc91eb7'
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
const MAX_AFBEELDINGEN = 6

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
)

async function verifyOwner(req: VercelRequest): Promise<boolean> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return false
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return false
  return user.id === OWNER_USER_ID
}

// Daan-bedrijfscontext (inline; Vercel bundelt geen api/_helpers/ imports).
async function loadDaanContext(client: SupabaseClient, userId: string): Promise<{ bedrijfscontext: string; schrijfstijl: string }> {
  let bedrijfscontext = ''
  let schrijfstijl = ''
  const { data: profile } = await client.from('profiles').select('organisatie_id').eq('id', userId).maybeSingle()
  const orgId = (profile?.organisatie_id as string | null) ?? null
  if (orgId) {
    const { data } = await client
      .from('app_settings')
      .select('forgie_bedrijfscontext, ai_tone_of_voice')
      .eq('organisatie_id', orgId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    bedrijfscontext = (data?.forgie_bedrijfscontext as string | null) || ''
    schrijfstijl = (data?.ai_tone_of_voice as string | null) || ''
  }
  return { bedrijfscontext, schrijfstijl }
}

const isHttpUrl = (u: string) => /^https?:\/\/\S+$/i.test(u.trim())

function buildSystemPrompt(bedrijfscontext: string, schrijfstijl: string): string {
  let p = `Je bent Daan, de assistent van signbedrijf Sign Company. Je schrijft een e-mailnieuwsbrief en levert die als kant-en-klare HTML.

STRICTE OUTPUT-REGELS:
- Antwoord UITSLUITEND met HTML, geen uitleg, geen markdown, geen \`\`\`-blokken.
- Lever ALLEEN de inhoud die binnen de mailbody komt: GEEN <html>, <head>, <body> of buitenste container (die wordt automatisch toegevoegd).
- Gebruik e-mail-veilige HTML: <table>-layout waar nodig, ALLE styling inline (style="..."), geen <style>-blok, geen externe CSS, geen JavaScript.
- Breedte maximaal 536px; afbeeldingen responsive met style="max-width:100%;height:auto;display:block;border-radius:8px;".
- Huisstijl-kleuren: tekst #1A1A1A, secundair #57574F, accent/knoppen #F15025 (flame), links/koppen mogen #1A535C (petrol). Achtergrond van de kaart is wit.
- Knoppen "bulletproof": een <table> met achtergrondkleur en een <a> met inline padding, geen CSS-only knoppen.
- Nederlands. Gebruik GEEN em-dashes (—); gebruik puntkomma's, komma's of een middelpunt (·).
- Sluit af met een nette ondertekening namens Sign Company.`
  if (bedrijfscontext) p += `\n\nOver het bedrijf:\n${bedrijfscontext}`
  if (schrijfstijl) p += `\n\nSchrijfstijl / tone of voice om aan te houden:\n${schrijfstijl}`
  return p
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'AI is niet geconfigureerd' })

  try {
    if (!(await verifyOwner(req))) return res.status(403).json({ error: 'Geen toegang' })

    const { brief, afbeeldingen } = (req.body ?? {}) as { brief?: string; afbeeldingen?: string[] }
    if (!brief?.trim()) return res.status(400).json({ error: 'Geef een korte briefing op' })

    const urls = Array.isArray(afbeeldingen)
      ? afbeeldingen.map(u => String(u).trim()).filter(isHttpUrl).slice(0, MAX_AFBEELDINGEN)
      : []

    const { bedrijfscontext, schrijfstijl } = await loadDaanContext(supabase, OWNER_USER_ID)
    const systemPrompt = buildSystemPrompt(bedrijfscontext, schrijfstijl)

    let tekst = `Maak een e-mailnieuwsbrief op basis van deze briefing:\n\n${brief.trim()}`
    if (urls.length > 0) {
      tekst += `\n\nGebruik deze afbeeldingen in de nieuwsbrief (embed ze als <img> met precies deze URL's, op een logische plek):\n${urls.map(u => `- ${u}`).join('\n')}`
    }

    const content: Array<Record<string, unknown>> = [{ type: 'text', text: tekst }]
    for (const url of urls) content.push({ type: 'image', source: { type: 'url', url } })

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content }],
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as Record<string, unknown>
      console.error('[nieuwsbrief-ai] Anthropic fout:', response.status, err)
      if (response.status === 429) return res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
      return res.status(502).json({ error: (err?.error as Record<string, string>)?.message || 'AI-generatie mislukt' })
    }

    const data = await response.json() as { content: Array<{ type: string; text?: string }> }
    let html = data.content?.filter(b => b.type === 'text').map(b => b.text || '').join('').trim() || ''
    // Vangnet: strip eventuele markdown-codefences.
    html = html.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/i, '').trim()
    if (!html) return res.status(502).json({ error: 'Daan gaf geen bruikbare HTML terug' })

    return res.status(200).json({ html })
  } catch (err) {
    console.error('[nieuwsbrief-ai] fout:', err)
    return res.status(500).json({ error: (err as Error).message || 'AI-generatie mislukt' })
  }
}
