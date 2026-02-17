const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''
const OPENAI_BASE_URL = 'https://api.openai.com/v1'
const DEFAULT_MODEL = 'gpt-4o-mini'

// ============ CONFIGURATION CHECK ============

export function isAIConfigured(): boolean {
  return !!(OPENAI_API_KEY && OPENAI_API_KEY !== 'your-openai-api-key-here')
}

// ============ TYPES ============

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// ============ CORE API FUNCTIONS ============

async function callOpenAI(
  messages: ChatMessage[],
  model: string = DEFAULT_MODEL,
  temperature: number = 0.7,
  maxTokens: number = 2048
): Promise<string> {
  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `OpenAI API fout: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

// ============ CHAT COMPLETION ============

export async function chatCompletion(
  messages: ChatMessage[],
  systemPrompt?: string
): Promise<string> {
  if (!isAIConfigured()) {
    return 'AI is momenteel niet geconfigureerd. Voeg je OpenAI API-sleutel toe in de instellingen om AI-functionaliteit te gebruiken. Je kunt de VITE_OPENAI_API_KEY instellen in je .env bestand.'
  }

  const allMessages: ChatMessage[] = []

  if (systemPrompt) {
    allMessages.push({ role: 'system', content: systemPrompt })
  } else {
    allMessages.push({
      role: 'system',
      content: 'Je bent Workmate AI, een behulpzame zakelijke assistent voor een Nederlands bedrijf. Je communiceert in het Nederlands en helpt met projectbeheer, offertes, klantcommunicatie en algemene zakelijke taken. Wees professioneel maar vriendelijk.',
    })
  }

  allMessages.push(...messages)

  return callOpenAI(allMessages)
}

// ============ STREAMING CHAT COMPLETION ============

export async function streamChatCompletion(
  messages: ChatMessage[],
  systemPrompt?: string,
  onChunk?: (chunk: string) => void
): Promise<string> {
  if (!isAIConfigured()) {
    const fallback = 'AI is momenteel niet geconfigureerd. Voeg je OpenAI API-sleutel toe in de instellingen om AI-functionaliteit te gebruiken.'
    if (onChunk) onChunk(fallback)
    return fallback
  }

  const allMessages: ChatMessage[] = []

  if (systemPrompt) {
    allMessages.push({ role: 'system', content: systemPrompt })
  } else {
    allMessages.push({
      role: 'system',
      content: 'Je bent Workmate AI, een behulpzame zakelijke assistent voor een Nederlands bedrijf. Je communiceert in het Nederlands en helpt met projectbeheer, offertes, klantcommunicatie en algemene zakelijke taken. Wees professioneel maar vriendelijk.',
    })
  }

  allMessages.push(...messages)

  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: allMessages,
      temperature: 0.7,
      max_tokens: 2048,
      stream: true,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `OpenAI API fout: ${response.status}`)
  }

  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  let fullContent = ''

  if (!reader) throw new Error('Kan de stream niet lezen')

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split('\n').filter((line) => line.startsWith('data: '))

    for (const line of lines) {
      const data = line.slice(6).trim()
      if (data === '[DONE]') break

      try {
        const parsed = JSON.parse(data)
        const content = parsed.choices[0]?.delta?.content || ''
        if (content) {
          fullContent += content
          if (onChunk) onChunk(content)
        }
      } catch {
        // Skip malformed JSON chunks
      }
    }
  }

  return fullContent
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
      algemeen: '[AI is niet geconfigureerd. Voeg je OpenAI API-sleutel toe om teksten te genereren.]',
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

  return callOpenAI([
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

*AI-analyse is niet beschikbaar. Configureer je OpenAI API-sleutel in de instellingen voor gedetailleerde projectanalyses, risicobeoordelingen en aanbevelingen.*

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

  return callOpenAI([
    {
      role: 'system',
      content: 'Je bent een ervaren projectmanager die gedetailleerde projectanalyses maakt in het Nederlands. Je bent analytisch, praktisch en geeft concrete aanbevelingen.',
    },
    { role: 'user', content: prompt },
  ], DEFAULT_MODEL, 0.5, 3000)
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

  return callOpenAI([
    {
      role: 'system',
      content: 'Je schrijft professionele zakelijke emails in het Nederlands. Je bent beknopt maar volledig.',
    },
    { role: 'user', content: prompt },
  ], DEFAULT_MODEL, 0.7, 1500)
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

  return callOpenAI([
    {
      role: 'system',
      content: 'Je bent een ervaren offertespecialist die overtuigende en professionele offerteteksten schrijft in het Nederlands.',
    },
    { role: 'user', content: prompt },
  ], DEFAULT_MODEL, 0.6, 1500)
}
