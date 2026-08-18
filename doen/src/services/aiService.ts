import supabase, { isSupabaseConfigured } from './supabaseClient'

const DEFAULT_MODEL = 'claude-sonnet-5'

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

// ============ TEXT GENERATION ============

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

// ============ QUOTE TEXT SUGGESTIONS ============
