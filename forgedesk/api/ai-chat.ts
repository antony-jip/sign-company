import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
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

    const { action, question, history, context: pageContext } = req.body as {
      action: 'chat' | 'get-history' | 'clear-history' | 'import-csv' | 'get-imports' | 'delete-import'
      question?: string
      history?: Array<{ role: string; content: string }>
      context?: { huidige_pagina?: string; huidige_module?: string; entity_id?: string }
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
        error: 'Forgie limiet bereikt',
        message: 'Je hebt het maximum van \u20AC5 aan Forgie-gebruik bereikt deze maand.',
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

    // Build page context info
    const paginaContext = pageContext
      ? `\nGEBRUIKER CONTEXT:\n- Huidige pagina: ${pageContext.huidige_pagina || 'onbekend'}\n- Module: ${pageContext.huidige_module || 'dashboard'}\n- Entity ID: ${pageContext.entity_id || 'geen'}`
      : ''

    // Resolve page context entity if on a specific item page
    let entityContext = ''
    if (pageContext?.entity_id && pageContext.huidige_module) {
      try {
        if (pageContext.huidige_module === 'klanten') {
          const { data: klant } = await supabase
            .from('klanten')
            .select('id, bedrijfsnaam, contactpersoon')
            .eq('id', pageContext.entity_id)
            .single()
          if (klant) entityContext = `\nDe gebruiker bekijkt klant: ${klant.bedrijfsnaam} (id: ${klant.id}, contactpersoon: ${klant.contactpersoon})`
        } else if (pageContext.huidige_module === 'projecten') {
          const { data: project } = await supabase
            .from('projecten')
            .select('id, naam, klant_id, klant_naam, status')
            .eq('id', pageContext.entity_id)
            .single()
          if (project) entityContext = `\nDe gebruiker bekijkt project: ${project.naam} (id: ${project.id}, klant: ${project.klant_naam || ''}, klant_id: ${project.klant_id}, status: ${project.status})`
        } else if (pageContext.huidige_module === 'offertes') {
          const { data: offerte } = await supabase
            .from('offertes')
            .select('id, titel, klant_id, klant_naam, project_id, status')
            .eq('id', pageContext.entity_id)
            .single()
          if (offerte) entityContext = `\nDe gebruiker bekijkt offerte: ${offerte.titel} (id: ${offerte.id}, klant: ${offerte.klant_naam || ''}, klant_id: ${offerte.klant_id}, project_id: ${offerte.project_id || 'geen'})`
        }
      } catch {
        // Entity lookup failed, continue without
      }
    }

    const today = new Date().toISOString().split('T')[0]

    // Build system prompt
    const systemPrompt = `Je bent Forgie, de slimme AI assistent van FORGEdesk. Je helpt gebruikers met hun bedrijfsvoering.

${bedrijfscontext ? `Over het bedrijf: ${bedrijfscontext}` : ''}
${paginaContext}${entityContext}

Vandaag is: ${today}

Je hebt toegang tot de volgende bedrijfsdata:
${JSON.stringify(dataContext, null, 2)}

CONTEXT REGELS:
- Als de gebruiker op een klantpagina zit en "maak een project" zegt → gebruik die klant automatisch (GEEN zoek_klant nodig)
- Als de gebruiker op een projectpagina zit en "maak een offerte" zegt → gebruik dat project + klant automatisch
- Op dashboard of geen context → vraag alleen door als het echt onduidelijk is

ACTIE REGELS:
1. Gebruik meegestuurde context als klant_id/project_id al bekend is
2. Zoek met zoek_klant of zoek_project als een naam genoemd wordt die niet in de context zit
3. Klant niet gevonden → toon fuzzy matches: "Bedoel je [X]?" Bij 0 matches: stel voor om klant aan te maken
4. Project niet gevonden → idem
5. Vul slim in op basis van context + gebruikersinput
6. Gebruik ALTIJD stel_*_voor tools — maak NOOIT iets direct aan

MEERDERE ACTIES:
- "Maak een project én offerte" → twee stel_*_voor tools
- "Nieuwe klant + project" → stel_klant_voor + stel_project_voor
- Logische volgorde: klant → project → offerte/taak

SLIM INVULLEN:
- Projectnaam: leid af uit beschrijving ("gevelreclame voor 2MV" → "Gevelreclame")
- Status: default "nieuw"
- Prioriteit: default "normaal", "urgent"/"belangrijk" → "hoog"
- Deadline: "morgen" → bereken datum, "volgende week vrijdag" → bereken

FOLLOW-UP:
Na project → "Offerte of taak erbij?"
Na klant → "Project aanmaken?"
Na offerte → "Naar de offerte om regels toe te voegen?"
Na taak → "Nog een taak?"

DATA REGELS:
- Antwoord kort en bondig in het Nederlands
- Gebruik concrete getallen, namen en datums uit de data
- Als je het antwoord niet weet, zeg dat eerlijk
- Kijk ALTIJD ook in geïmporteerde CSV data
- Geef bedragen in euro's met twee decimalen
- Bij opsommingen: maximaal 10 items, daarna "en nog X meer"
- Gebruik **dikgedrukt** voor belangrijke getallen en namen`

    // Tool definitions
    const tools = [
      {
        name: 'zoek_klant',
        description: 'Zoek een klant op naam, bedrijfsnaam of deel van de naam. Gebruik fuzzy matching. Geeft een lijst van matches terug.',
        input_schema: {
          type: 'object' as const,
          properties: {
            zoekterm: { type: 'string' as const, description: 'Naam of bedrijfsnaam (of deel ervan)' },
          },
          required: ['zoekterm'],
        },
      },
      {
        name: 'zoek_project',
        description: 'Zoek een project op naam of beschrijving. Optioneel gefilterd op klant.',
        input_schema: {
          type: 'object' as const,
          properties: {
            zoekterm: { type: 'string' as const, description: 'Projectnaam of beschrijving (of deel ervan)' },
            klant_id: { type: 'string' as const, description: 'Filter op klant UUID (optioneel)' },
          },
          required: ['zoekterm'],
        },
      },
      {
        name: 'stel_project_voor',
        description: 'Stel een nieuw project voor om aan te maken. De gebruiker krijgt een bevestigingskaart te zien.',
        input_schema: {
          type: 'object' as const,
          properties: {
            naam: { type: 'string' as const, description: 'Projectnaam' },
            klant_id: { type: 'string' as const, description: 'UUID van de klant' },
            klant_naam: { type: 'string' as const, description: 'Klantnaam voor weergave' },
            beschrijving: { type: 'string' as const, description: 'Korte beschrijving' },
            status: { type: 'string' as const, enum: ['nieuw', 'actief', 'afgerond'], description: 'Default: nieuw' },
          },
          required: ['naam', 'klant_id', 'klant_naam'],
        },
      },
      {
        name: 'stel_offerte_voor',
        description: 'Stel een nieuwe offerte voor. De gebruiker krijgt een bevestigingskaart.',
        input_schema: {
          type: 'object' as const,
          properties: {
            onderwerp: { type: 'string' as const, description: 'Offerte onderwerp' },
            klant_id: { type: 'string' as const, description: 'UUID van de klant' },
            klant_naam: { type: 'string' as const, description: 'Klantnaam voor weergave' },
            project_id: { type: 'string' as const, description: 'UUID van het project (optioneel)' },
            project_naam: { type: 'string' as const, description: 'Projectnaam voor weergave (optioneel)' },
          },
          required: ['onderwerp', 'klant_id', 'klant_naam'],
        },
      },
      {
        name: 'stel_taak_voor',
        description: 'Stel een nieuwe taak voor.',
        input_schema: {
          type: 'object' as const,
          properties: {
            titel: { type: 'string' as const, description: 'Taak titel' },
            beschrijving: { type: 'string' as const, description: 'Taak beschrijving' },
            project_id: { type: 'string' as const, description: 'UUID van het project (optioneel)' },
            project_naam: { type: 'string' as const, description: 'Projectnaam voor weergave (optioneel)' },
            prioriteit: { type: 'string' as const, enum: ['laag', 'normaal', 'hoog', 'urgent'], description: 'Default: normaal' },
            deadline: { type: 'string' as const, description: 'ISO datum string (optioneel)' },
          },
          required: ['titel'],
        },
      },
      {
        name: 'stel_klant_voor',
        description: 'Stel een nieuwe klant voor om aan te maken wanneer de klant niet gevonden wordt.',
        input_schema: {
          type: 'object' as const,
          properties: {
            bedrijfsnaam: { type: 'string' as const, description: 'Bedrijfsnaam' },
            contactpersoon: { type: 'string' as const, description: 'Naam contactpersoon (optioneel)' },
            email: { type: 'string' as const, description: 'Email (optioneel)' },
            telefoon: { type: 'string' as const, description: 'Telefoon (optioneel)' },
          },
          required: ['bedrijfsnaam'],
        },
      },
    ]

    // Build messages with conversation history
    const messages: Array<{ role: string; content: unknown }> = []
    if (history && Array.isArray(history)) {
      const recentHistory = history.slice(-4)
      for (const msg of recentHistory) {
        messages.push({ role: msg.role === 'forgie' ? 'assistant' : msg.role, content: msg.content })
      }
    }
    messages.push({ role: 'user', content: question })

    // Tool-use loop
    const acties: Array<{
      type: string
      actie: string
      data: Record<string, unknown>
      navigeer_naar?: string
      wacht_op?: string
    }> = []
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let resultText = ''
    const MAX_ITERATIONS = 5

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
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
          tools,
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
        content: Array<{ type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }>
        usage: { input_tokens: number; output_tokens: number }
        stop_reason: string
      }

      totalInputTokens += data.usage.input_tokens
      totalOutputTokens += data.usage.output_tokens

      // Extract text blocks
      for (const block of data.content) {
        if (block.type === 'text' && block.text) {
          resultText += block.text
        }
      }

      // If no tool use, we're done
      if (data.stop_reason !== 'tool_use') break

      // Process tool calls
      const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> = []

      for (const block of data.content) {
        if (block.type !== 'tool_use' || !block.name || !block.id) continue

        const toolInput = block.input || {}

        if (block.name === 'zoek_klant') {
          const zoekterm = String(toolInput.zoekterm || '')
          const sanitized = zoekterm.replace(/[\\%_]/g, c => `\\${c}`)
          const { data: klanten } = await supabase
            .from('klanten')
            .select('id, bedrijfsnaam, contactpersoon, email, telefoon')
            .eq('user_id', userId)
            .or(`bedrijfsnaam.ilike.%${sanitized}%,contactpersoon.ilike.%${sanitized}%`)
            .limit(5)

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(klanten || []),
          })
        } else if (block.name === 'zoek_project') {
          const zoekterm = String(toolInput.zoekterm || '')
          const sanitized = zoekterm.replace(/[\\%_]/g, c => `\\${c}`)
          let query = supabase
            .from('projecten')
            .select('id, naam, beschrijving, status, klant_id, klant_naam')
            .eq('user_id', userId)
            .ilike('naam', `%${sanitized}%`)
            .limit(5)

          if (toolInput.klant_id) {
            query = query.eq('klant_id', String(toolInput.klant_id))
          }

          const { data: projecten } = await query
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(projecten || []),
          })
        } else if (block.name.startsWith('stel_')) {
          // Proposal tools — collect as acties, don't execute
          const typeMap: Record<string, string> = {
            stel_project_voor: 'project',
            stel_offerte_voor: 'offerte',
            stel_taak_voor: 'taak',
            stel_klant_voor: 'klant',
          }
          const actieType = typeMap[block.name] || 'onbekend'

          const navMap: Record<string, string> = {
            project: '/projecten/{id}',
            offerte: '/offertes/{id}',
            taak: '/taken',
            klant: '/klanten/{id}',
          }

          // Determine dependencies
          let wachtOp: string | undefined
          if (actieType === 'project' && acties.some(a => a.type === 'klant')) {
            wachtOp = 'klant'
          } else if ((actieType === 'offerte' || actieType === 'taak') && acties.some(a => a.type === 'project')) {
            wachtOp = 'project'
          }

          acties.push({
            type: actieType,
            actie: 'aanmaken',
            data: toolInput,
            navigeer_naar: navMap[actieType],
            wacht_op: wachtOp,
          })

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify({ success: true, message: 'Voorstel wordt aan de gebruiker getoond' }),
          })
        } else {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify({ error: 'Onbekende tool' }),
          })
        }
      }

      // Add assistant message + tool results to conversation for next iteration
      messages.push({ role: 'assistant', content: data.content })
      messages.push({ role: 'user', content: toolResults })
    }

    // Update usage tracking
    try {
      await updateUsage(userId, totalInputTokens, totalOutputTokens)
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
      acties: acties.length > 0 ? acties : undefined,
      usage: currentUsage.geschatte_kosten,
      limiet: MONTHLY_LIMIT,
    })
  } catch (error: unknown) {
    console.error('AI Chat API fout:', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : 'AI verzoek mislukt' })
  }
}
