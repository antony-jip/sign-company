import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
const MONTHLY_LIMIT = 5.0

async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

async function checkUsageLimit(userId: string): Promise<boolean> {
  const maand = getCurrentMonth()
  const { data } = await supabase
    .from('ai_usage')
    .select('geschatte_kosten')
    .eq('user_id', userId)
    .eq('maand', maand)
    .single()
  return !data || (data.geschatte_kosten ?? 0) < MONTHLY_LIMIT
}

async function updateUsage(userId: string, inputTokens: number, outputTokens: number): Promise<void> {
  const maand = getCurrentMonth()
  const kosten = (inputTokens / 1_000_000 * 3) + (outputTokens / 1_000_000 * 15)

  const { data: existing } = await supabase
    .from('ai_usage')
    .select('id, aantal_calls, input_tokens, output_tokens, geschatte_kosten')
    .eq('user_id', userId)
    .eq('maand', maand)
    .single()

  if (existing) {
    await supabase
      .from('ai_usage')
      .update({
        aantal_calls: (existing.aantal_calls || 0) + 1,
        input_tokens: (existing.input_tokens || 0) + inputTokens,
        output_tokens: (existing.output_tokens || 0) + outputTokens,
        geschatte_kosten: Number(((existing.geschatte_kosten || 0) + kosten).toFixed(4)),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('ai_usage')
      .insert({
        user_id: userId,
        maand,
        aantal_calls: 1,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        geschatte_kosten: Number(kosten.toFixed(4)),
      })
  }
}

async function getUsage(userId: string): Promise<{ geschatte_kosten: number }> {
  const maand = getCurrentMonth()
  const { data } = await supabase
    .from('ai_usage')
    .select('geschatte_kosten')
    .eq('user_id', userId)
    .eq('maand', maand)
    .single()
  return { geschatte_kosten: data?.geschatte_kosten ?? 0 }
}

// ============ CONTEXT RETRIEVAL ============

interface ContextBlock {
  type: string
  [key: string]: unknown
}

async function getRelevantContext(userId: string, question: string): Promise<ContextBlock[]> {
  const q = question.toLowerCase()
  const context: ContextBlock[] = []

  // Zoek specifieke klantnaam in de vraag
  const { data: alleKlanten } = await supabase
    .from('klanten')
    .select('id, bedrijfsnaam')
    .eq('user_id', userId)

  const gevondenKlant = alleKlanten?.find(k =>
    q.includes(k.bedrijfsnaam.toLowerCase())
  )

  if (gevondenKlant) {
    const [projecten, offertes, facturen] = await Promise.all([
      supabase
        .from('projecten')
        .select('naam, status, budget, start_datum, eind_datum')
        .eq('klant_id', gevondenKlant.id),
      supabase
        .from('offertes')
        .select('nummer, titel, totaal, status, geldig_tot')
        .eq('klant_id', gevondenKlant.id),
      supabase
        .from('facturen')
        .select('nummer, titel, totaal, status, factuurdatum')
        .eq('klant_id', gevondenKlant.id),
    ])

    context.push({
      type: 'klant_detail',
      klant: gevondenKlant.bedrijfsnaam,
      projecten: projecten.data,
      offertes: offertes.data,
      facturen: facturen.data,
    })
  }

  // Klanten — als de vraag over klanten gaat
  if (q.includes('klant') || q.includes('contact') || q.includes('wie')) {
    const { data: klanten } = await supabase
      .from('klanten')
      .select('bedrijfsnaam, contactpersoon, email, telefoon, stad')
      .eq('user_id', userId)
      .limit(20)
    if (klanten?.length) context.push({ type: 'klanten', data: klanten })
  }

  // Facturen — als het over geld/omzet/facturen gaat
  if (q.includes('omzet') || q.includes('factuur') || q.includes('betaald') || q.includes('openstaand') || q.includes('geld') || q.includes('inkomsten')) {
    const { data: facturen } = await supabase
      .from('facturen')
      .select('nummer, klant_naam, totaal, status, factuurdatum')
      .eq('user_id', userId)
      .order('factuurdatum', { ascending: false })
      .limit(30)
    if (facturen?.length) context.push({ type: 'facturen', data: facturen })
  }

  // Offertes
  if (q.includes('offerte') || q.includes('pipeline') || q.includes('marge') || q.includes('open')) {
    const { data: offertes } = await supabase
      .from('offertes')
      .select('nummer, klant_naam, totaal, status, geldig_tot')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
    if (offertes?.length) context.push({ type: 'offertes', data: offertes })
  }

  // Projecten
  if (q.includes('project') || q.includes('planning') || q.includes('deadline') || q.includes('werk')) {
    const { data: projecten } = await supabase
      .from('projecten')
      .select('naam, klant_naam, status, eind_datum, budget')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    if (projecten?.length) context.push({ type: 'projecten', data: projecten })
  }

  // Als niks specifieks gevonden: haal recente activiteit
  if (context.length === 0) {
    const [recenteFacturen, recenteOffertes] = await Promise.all([
      supabase
        .from('facturen')
        .select('nummer, klant_naam, totaal, status')
        .eq('user_id', userId)
        .order('factuurdatum', { ascending: false })
        .limit(10),
      supabase
        .from('offertes')
        .select('nummer, klant_naam, totaal, status')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10),
    ])
    context.push({
      type: 'recent',
      facturen: recenteFacturen.data,
      offertes: recenteOffertes.data,
    })
  }

  // Laad ALTIJD alle geïmporteerde CSV data als context
  const { data: allCsvData } = await supabase
    .from('ai_imported_data')
    .select('data, bestandsnaam')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (allCsvData?.length) {
    // Groepeer per bestandsnaam voor overzichtelijkheid
    const grouped: Record<string, unknown[]> = {}
    for (const row of allCsvData) {
      const key = row.bestandsnaam || 'onbekend'
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(row.data)
    }
    context.push({ type: 'geimporteerde_csv_data', bestanden: grouped })
  }

  // Zoek ook specifiek op zoekwoorden voor extra relevantie
  const searchWords = question.split(' ').filter(w => w.length > 3).join(' & ')
  if (searchWords) {
    const { data: csvResults } = await supabase
      .from('ai_imported_data')
      .select('data, bestandsnaam')
      .eq('user_id', userId)
      .textSearch('zoek_tekst', searchWords, { type: 'plain' })
      .limit(15)

    if (csvResults?.length) {
      context.push({ type: 'csv_zoekresultaten', data: csvResults.map(r => r.data) })
    }
  }

  return context
}

// ============ HANDLER ============

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)

    if (!ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'AI niet geconfigureerd', configured: false })
    }

    const { action, question, history } = req.body as {
      action: 'chat' | 'get-history' | 'clear-history' | 'import-csv' | 'get-imports' | 'delete-import'
      question?: string
      history?: Array<{ role: string; content: string }>
      // import-csv fields
      bestandsnaam?: string
      rows?: Array<Record<string, unknown>>
      // delete-import
      importId?: string
    }

    // === GET CHAT HISTORY ===
    if (action === 'get-history') {
      const { data } = await supabase
        .from('ai_chat_history')
        .select('role, content, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(50)
      return res.status(200).json({ messages: data || [] })
    }

    // === CLEAR CHAT HISTORY ===
    if (action === 'clear-history') {
      await supabase
        .from('ai_chat_history')
        .delete()
        .eq('user_id', userId)
      return res.status(200).json({ ok: true })
    }

    // === IMPORT CSV DATA ===
    if (action === 'import-csv') {
      const { bestandsnaam, rows } = req.body as { bestandsnaam?: string; rows?: Array<Record<string, unknown>> }
      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ error: 'Geen data om te importeren' })
      }

      const records = rows.map(row => ({
        user_id: userId,
        bestandsnaam: bestandsnaam || 'onbekend.csv',
        bron: 'csv',
        data: row,
        zoek_tekst: Object.values(row).filter(Boolean).join(' '),
      }))

      const { error } = await supabase
        .from('ai_imported_data')
        .insert(records)

      if (error) {
        console.error('Import fout:', error)
        return res.status(500).json({ error: 'Importeren mislukt' })
      }

      return res.status(200).json({ ok: true, count: records.length })
    }

    // === GET IMPORTS LIST ===
    if (action === 'get-imports') {
      const { data } = await supabase
        .from('ai_imported_data')
        .select('id, bestandsnaam, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      // Group by bestandsnaam
      const grouped: Record<string, { bestandsnaam: string; count: number; created_at: string; ids: string[] }> = {}
      for (const row of data || []) {
        const key = row.bestandsnaam || 'onbekend'
        if (!grouped[key]) {
          grouped[key] = { bestandsnaam: key, count: 0, created_at: row.created_at, ids: [] }
        }
        grouped[key].count++
        grouped[key].ids.push(row.id)
      }

      return res.status(200).json({ imports: Object.values(grouped) })
    }

    // === DELETE IMPORT ===
    if (action === 'delete-import') {
      const { bestandsnaam: delName } = req.body as { bestandsnaam?: string }
      if (!delName) return res.status(400).json({ error: 'Bestandsnaam is verplicht' })

      await supabase
        .from('ai_imported_data')
        .delete()
        .eq('user_id', userId)
        .eq('bestandsnaam', delName)

      return res.status(200).json({ ok: true })
    }

    // === CHAT ===
    if (action !== 'chat' || !question) {
      return res.status(400).json({ error: 'Action "chat" en question zijn verplicht' })
    }

    // Check usage limit
    const withinLimit = await checkUsageLimit(userId)
    if (!withinLimit) {
      return res.status(429).json({
        error: 'Daan limiet bereikt',
        message: 'Je hebt het maximum van \u20AC5 aan Daan-gebruik bereikt deze maand.',
      })
    }

    // Get bedrijfscontext from settings
    const { data: settingsData } = await supabase
      .from('app_settings')
      .select('forgie_bedrijfscontext')
      .eq('user_id', userId)
      .single()

    const bedrijfscontext = settingsData?.forgie_bedrijfscontext || ''

    // Get relevant data context
    const dataContext = await getRelevantContext(userId, question)

    // Build system prompt
    const systemPrompt = `Je bent Daan, de AI-assistent van Doen. Je bent het bedrijfsgeheugen van de gebruiker. Je bent direct, behulpzaam en een beetje eigenwijs — net als de vakmensen die je helpt.

${bedrijfscontext ? `Over het bedrijf: ${bedrijfscontext}` : ''}

Je hebt toegang tot de volgende bedrijfsdata:

${JSON.stringify(dataContext, null, 2)}

REGELS:
- Antwoord kort en bondig in het Nederlands
- Gebruik concrete getallen, namen en datums uit de data
- Als je het antwoord niet weet op basis van de beschikbare data, zeg dat eerlijk
- Kijk ALTIJD ook in de geïmporteerde CSV data (type: geimporteerde_csv_data) — dit bevat historische klant-, project- en facturatiegegevens
- Als data uit een CSV import komt, vermeld dat het historische/geïmporteerde data betreft
- Geef bedragen altijd in euro's met twee decimalen
- Bij opsommingen: maximaal 10 items, daarna "en nog X meer"
- Gebruik **dikgedrukt** voor belangrijke getallen en namen`

    // Build messages with conversation history
    const messages: Array<{ role: string; content: string }> = []
    if (history && Array.isArray(history)) {
      // Include last 4 messages for context
      const recentHistory = history.slice(-4)
      for (const msg of recentHistory) {
        messages.push({ role: msg.role === 'forgie' ? 'assistant' : msg.role, content: msg.content })
      }
    }
    messages.push({ role: 'user', content: question })

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: systemPrompt,
        messages,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as Record<string, unknown>
      console.error('Anthropic API fout:', response.status, errorData)
      if (response.status === 429) {
        return res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
      }
      return res.status(response.status).json({
        error: (errorData?.error as Record<string, string>)?.message || 'Anthropic API fout',
      })
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>
      usage: { input_tokens: number; output_tokens: number }
    }
    const resultText = data.content?.[0]?.text || ''

    // Update usage tracking
    try {
      await updateUsage(userId, data.usage.input_tokens, data.usage.output_tokens)
    } catch {
      // Usage tracking is niet-kritiek
    }

    // Save chat messages to history
    try {
      await supabase.from('ai_chat_history').insert([
        { user_id: userId, role: 'user', content: question },
        { user_id: userId, role: 'forgie', content: resultText },
      ])
    } catch {
      // Niet-kritiek
    }

    const currentUsage = await getUsage(userId).catch(() => ({ geschatte_kosten: 0 }))

    return res.status(200).json({
      answer: resultText,
      usage: currentUsage.geschatte_kosten,
      limiet: MONTHLY_LIMIT,
    })
  } catch (error: unknown) {
    console.error('AI Chat API fout:', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : 'AI verzoek mislukt' })
  }
}
