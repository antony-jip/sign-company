import supabase, { isSupabaseConfigured } from './supabaseClient'

const DEFAULT_MODEL = 'claude-sonnet-4-6'

// ============ CONFIGURATION CHECK ============

export function isAIConfigured(): boolean {
  // AI is now server-side only. We just need Supabase auth to work.
  return isSupabaseConfigured()
}

// ============ TYPES ============

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// ============ AUTH HELPER ============

async function getAuthToken(): Promise<string> {
  if (!supabase) throw new Error('Supabase niet geconfigureerd')
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Niet ingelogd. Log opnieuw in om AI te gebruiken.')
  }
  return session.access_token
}

// ============ CORE API FUNCTION (via server-side proxy) ============

async function callAI(
  messages: ChatMessage[],
  model: string = DEFAULT_MODEL,
  maxTokens: number = 2048
): Promise<string> {
  const token = await getAuthToken()

  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ messages, model, max_tokens: maxTokens }),
  })

  if (!response.ok) {
    const error: { error?: string } = await response.json().catch(() => ({}))
    throw new Error(error?.error || `AI API fout: ${response.status}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

// ============ CHAT COMPLETION ============

export async function chatCompletion(
  messages: ChatMessage[],
  systemPrompt?: string
): Promise<string> {
  if (!isAIConfigured()) {
    return 'AI is momenteel niet beschikbaar. Zorg dat je bent ingelogd en dat de Anthropic API key is geconfigureerd op de server.'
  }

  const allMessages: ChatMessage[] = []

  if (systemPrompt) {
    allMessages.push({ role: 'system', content: systemPrompt })
  } else {
    allMessages.push({
      role: 'system',
      content: 'Je bent Sign Company AI, een behulpzame zakelijke assistent voor een Nederlands bedrijf. Je communiceert in het Nederlands en helpt met projectbeheer, offertes, klantcommunicatie en algemene zakelijke taken. Wees professioneel maar vriendelijk.',
    })
  }

  allMessages.push(...messages)

  return callAI(allMessages)
}

// ============ STREAMING CHAT COMPLETION ============

export async function streamChatCompletion(
  messages: ChatMessage[],
  systemPrompt?: string,
  onChunk?: (chunk: string) => void
): Promise<string> {
  if (!isAIConfigured()) {
    const fallback = 'AI is momenteel niet beschikbaar. Zorg dat je bent ingelogd.'
    if (onChunk) onChunk(fallback)
    return fallback
  }

  // For now, streaming goes through the same non-streaming endpoint
  // and delivers the full response at once via onChunk.
  // True SSE streaming can be added to /api/ai later.
  const allMessages: ChatMessage[] = []

  if (systemPrompt) {
    allMessages.push({ role: 'system', content: systemPrompt })
  } else {
    allMessages.push({
      role: 'system',
      content: 'Je bent Sign Company AI, een behulpzame zakelijke assistent voor een Nederlands bedrijf. Je communiceert in het Nederlands en helpt met projectbeheer, offertes, klantcommunicatie en algemene zakelijke taken. Wees professioneel maar vriendelijk.',
    })
  }

  allMessages.push(...messages)

  const result = await callAI(allMessages)
  if (onChunk) onChunk(result)
  return result
}

// ============ TEXT GENERATION ============

export async function generateText(
  prompt: string,
  context?: string,
  type?: 'email' | 'offerte' | 'rapport' | 'notitie' | 'algemeen'
): Promise<string> {
  if (!isAIConfigured()) {
    const placeholders: Record<string, string> = {
      email: 'Beste [naam],\n\nHierbij stuur ik u [onderwerp]. Mocht u vragen hebben, neem dan gerust contact met ons op.\n\nMet vriendelijke groet,\n[Uw naam]',
      offerte: 'Geachte [naam],\n\nHierbij ontvangt u onze offerte voor [project]. Wij bieden u het volgende aan:\n\n- [Item 1]: [prijs]\n- [Item 2]: [prijs]\n\nDeze offerte is geldig tot [datum].\n\nMet vriendelijke groet,\n[Uw naam]',
      rapport: '# Rapport: [Titel]\n\n## Samenvatting\n[Korte samenvatting van het rapport]\n\n## Bevindingen\n[Gedetailleerde bevindingen]\n\n## Conclusie\n[Conclusie en aanbevelingen]',
      notitie: '## Notitie\n\n**Datum:** [datum]\n**Betreft:** [onderwerp]\n\n[Inhoud van de notitie]',
      algemeen: '[AI is niet beschikbaar. Log in en zorg dat de server correct is geconfigureerd.]',
    }
    return placeholders[type || 'algemeen'] || placeholders.algemeen
  }

  const systemPrompt = `Je bent een professionele tekstschrijver voor een Nederlands bedrijf.
Je schrijft altijd in het Nederlands, professioneel en zakelijk.
${type === 'email' ? 'Je schrijft zakelijke emails die professioneel en vriendelijk zijn.' : ''}
${type === 'offerte' ? 'Je schrijft overtuigende offerteteksten die professioneel en helder zijn.' : ''}
${type === 'rapport' ? 'Je schrijft duidelijke en gestructureerde rapporten.' : ''}
${type === 'notitie' ? 'Je schrijft beknopte en duidelijke notities.' : ''}`

  const userMessage = context
    ? `Context: ${context}\n\nOpdracht: ${prompt}`
    : prompt

  return callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ])
}

// ============ PROJECT ANALYSIS ============

export async function analyzeProject(projectData: {
  naam: string
  beschrijving: string
  status: string
  budget: number
  besteed: number
  voortgang: number
  taken?: { titel: string; status: string; prioriteit: string }[]
}): Promise<string> {
  if (!isAIConfigured()) {
    return `## Projectanalyse: ${projectData.naam}

**Status:** ${projectData.status}
**Budget:** \u20AC${projectData.budget.toLocaleString('nl-NL')} (besteed: \u20AC${projectData.besteed.toLocaleString('nl-NL')})
**Voortgang:** ${projectData.voortgang}%

---

*AI-analyse is niet beschikbaar. Log in om gedetailleerde projectanalyses te ontvangen.*

### Handmatige checklist:
- [ ] Budget bewaking controleren
- [ ] Deadlines nalopen
- [ ] Teamcapaciteit beoordelen
- [ ] Risico\u2019s identificeren
- [ ] Klantcommunicatie plannen`
  }

  const prompt = `Analyseer het volgende project en geef een gedetailleerde analyse met aanbevelingen:

Project: ${projectData.naam}
Beschrijving: ${projectData.beschrijving}
Status: ${projectData.status}
Budget: \u20AC${projectData.budget} (besteed: \u20AC${projectData.besteed})
Voortgang: ${projectData.voortgang}%
${projectData.taken ? `\nTaken:\n${projectData.taken.map((t) => `- ${t.titel} (${t.status}, prioriteit: ${t.prioriteit})`).join('\n')}` : ''}

Geef een analyse met:
1. Overzicht van de huidige projectstatus
2. Budget analyse en voorspelling
3. Risico's en aandachtspunten
4. Concrete aanbevelingen
5. Prioriteiten voor de komende periode`

  return callAI([
    {
      role: 'system',
      content: 'Je bent een ervaren projectmanager die gedetailleerde projectanalyses maakt in het Nederlands. Je bent analytisch, praktisch en geeft concrete aanbevelingen.',
    },
    { role: 'user', content: prompt },
  ], DEFAULT_MODEL, 3000)
}

// ============ EMAIL DRAFT GENERATION ============

export async function generateEmailDraft(
  context: {
    klantNaam?: string
    onderwerp?: string
    doel?: string
    extraInfo?: string
  },
  tone: 'formeel' | 'informeel' | 'vriendelijk' | 'zakelijk' = 'zakelijk'
): Promise<string> {
  if (!isAIConfigured()) {
    return `Beste ${context.klantNaam || '[naam]'},

Betreft: ${context.onderwerp || '[onderwerp]'}

${context.doel || '[Beschrijf hier het doel van de email]'}

${context.extraInfo || ''}

Met vriendelijke groet,
[Uw naam]
[Bedrijfsnaam]`
  }

  const toneDescriptions: Record<string, string> = {
    formeel: 'zeer formeel en beleefd, gebruik "u" en formele aanspreekvormen',
    informeel: 'informeel en persoonlijk, gebruik "je" en een ontspannen toon',
    vriendelijk: 'warm en vriendelijk maar professioneel',
    zakelijk: 'zakelijk en to-the-point maar beleefd',
  }

  const prompt = `Schrijf een ${tone} email met de volgende gegevens:
${context.klantNaam ? `Aan: ${context.klantNaam}` : ''}
${context.onderwerp ? `Onderwerp: ${context.onderwerp}` : ''}
${context.doel ? `Doel: ${context.doel}` : ''}
${context.extraInfo ? `Extra informatie: ${context.extraInfo}` : ''}

Toon: ${toneDescriptions[tone]}

Schrijf alleen de email tekst, geen onderwerpregel.`

  return callAI([
    {
      role: 'system',
      content: 'Je schrijft professionele zakelijke emails in het Nederlands. Je bent beknopt maar volledig.',
    },
    { role: 'user', content: prompt },
  ], DEFAULT_MODEL, 1500)
}

// ============ QUOTE TEXT SUGGESTIONS ============

export async function suggestQuoteText(quoteData: {
  klantNaam?: string
  projectNaam?: string
  items?: { beschrijving: string; totaal: number }[]
  totaal?: number
}): Promise<string> {
  if (!isAIConfigured()) {
    return `Geachte ${quoteData.klantNaam || '[klantnaam]'},

Hierbij ontvangt u onze offerte${quoteData.projectNaam ? ` voor ${quoteData.projectNaam}` : ''}.

Wij hebben de werkzaamheden en materialen zorgvuldig voor u begroot. ${quoteData.totaal ? `Het totaalbedrag komt uit op \u20AC${quoteData.totaal.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}.` : ''}

Deze offerte is 30 dagen geldig. Bij akkoord ontvangen wij graag een ondertekend exemplaar retour.

Mocht u vragen hebben of de offerte willen bespreken, neem dan gerust contact met ons op.

Met vriendelijke groet,
[Uw naam]`
  }

  const prompt = `Schrijf een professionele offerte-begeleidingstekst met de volgende gegevens:
Klant: ${quoteData.klantNaam || 'Onbekend'}
Project: ${quoteData.projectNaam || 'Geen projectnaam'}
${quoteData.items ? `Items:\n${quoteData.items.map((i) => `- ${i.beschrijving}: \u20AC${i.totaal}`).join('\n')}` : ''}
${quoteData.totaal ? `Totaal: \u20AC${quoteData.totaal}` : ''}

Schrijf een overtuigende maar professionele begeleidingstekst voor deze offerte. Inclusief:
- Aanhef
- Korte introductie
- Verwijzing naar de werkzaamheden
- Geldigheid (30 dagen)
- Uitnodiging tot contact
- Afsluiting`

  return callAI([
    {
      role: 'system',
      content: 'Je bent een ervaren offertespecialist die overtuigende en professionele offerteteksten schrijft in het Nederlands.',
    },
    { role: 'user', content: prompt },
  ], DEFAULT_MODEL, 1500)
}
