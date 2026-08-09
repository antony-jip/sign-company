import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// Zet het bedrag van een lopend abonnement gelijk aan de staffel van de
// organisatie (migratie 172). Nodig omdat een Mollie-subscription anders elke
// maand het oude bedrag blijft incasseren nadat een organisatie op een andere
// trede is gezet; opzeggen en opnieuw activeren zou het mandaat en de
// betaalhistorie breken.
//
// Deze route wijzigt niets aan de staffel zelf. Die zet je in de database, en
// dit haalt Mollie daar naartoe. Zo is er één bron en kan een verkeerde
// aanroep hooguit synchroniseren wat er al staat.

const MOLLIE_API_KEY = process.env.MOLLIE_API_KEY_LIVE || process.env.MOLLIE_API_KEY_TEST || ''
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Deze route bepaalt wat een klant betaalt. Een klant-admin mag dat niet zelf
// in gang zetten, ook niet richting het bedrag dat al in de database staat: hij
// zou een prijswijziging naar voren kunnen halen of juist nooit doorvoeren.
// Zelfde poort als api/nieuwsbrief-test en api/nieuwsbrief-contacten-sync.
const OWNER_USER_ID = process.env.OWNER_USER_ID || 'ce6843e3-5cd9-4043-9461-55071bc91eb7'

const STANDAARD_BEDRAG_EXCL = 129
const BTW_PERCENTAGE = 21

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function verifyUser(req: VercelRequest): Promise<{ id: string }> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return { id: user.id }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    if (!MOLLIE_API_KEY) {
      return res.status(500).json({ error: 'MOLLIE_API_KEY niet geconfigureerd' })
    }

    const user = await verifyUser(req)

    const { organisatie_id } = req.body as { organisatie_id: string }
    if (!organisatie_id) {
      return res.status(400).json({ error: 'organisatie_id is verplicht' })
    }

    if (user.id !== OWNER_USER_ID) {
      return res.status(403).json({ error: 'Geen toegang' })
    }

    const { data: org, error: orgError } = await supabaseAdmin
      .from('organisaties')
      .select('mollie_customer_id, mollie_subscription_id, abonnement_bedrag_excl')
      .eq('id', organisatie_id)
      .maybeSingle()

    if (orgError || !org) {
      return res.status(404).json({ error: 'Organisatie niet gevonden' })
    }

    const subscriptionId = org.mollie_subscription_id
    if (!org.mollie_customer_id || !subscriptionId || subscriptionId.startsWith('pending_')) {
      return res.status(409).json({ error: 'Er loopt geen abonnement dat bijgewerkt kan worden' })
    }

    const bedragExcl = Number(org.abonnement_bedrag_excl ?? STANDAARD_BEDRAG_EXCL)
    // Een 0 of een negatief bedrag in de kolom is een typefout, geen wens.
    // Liever hier weigeren dan Mollie een incasso van 0,00 sturen.
    if (!Number.isFinite(bedragExcl) || bedragExcl <= 0) {
      return res.status(400).json({ error: `Ongeldig abonnementsbedrag in de database: ${org.abonnement_bedrag_excl}` })
    }
    const bedragIncl = (bedragExcl * (1 + BTW_PERCENTAGE / 100)).toFixed(2)

    const subscriptionUrl =
      `https://api.mollie.com/v2/customers/${org.mollie_customer_id}/subscriptions/${subscriptionId}`
    const mollieHeaders = {
      'Authorization': `Bearer ${MOLLIE_API_KEY}`,
      'Content-Type': 'application/json',
    }

    // Eerst lezen: staat het bedrag er al op, dan is dit een no-op en hoeven we
    // Mollie niet aan te raken. Een geannuleerd abonnement kun je niet wijzigen.
    const huidigResponse = await fetch(subscriptionUrl, {
      headers: { 'Authorization': `Bearer ${MOLLIE_API_KEY}` },
    })
    if (!huidigResponse.ok) {
      const body = await huidigResponse.text()
      console.error('Mollie subscription ophalen mislukt:', huidigResponse.status, body)
      return res.status(502).json({ error: 'Abonnement bij Mollie niet op te halen' })
    }
    const huidig = await huidigResponse.json() as {
      status?: string
      amount?: { value?: string }
    }
    if (['canceled', 'completed', 'suspended'].includes(huidig.status || '')) {
      return res.status(409).json({ error: `Abonnement staat op ${huidig.status} en is niet te wijzigen` })
    }
    if (huidig.amount?.value === bedragIncl) {
      return res.status(200).json({ gewijzigd: false, bedrag_incl: bedragIncl, bedrag_excl: bedragExcl })
    }

    const patchResponse = await fetch(subscriptionUrl, {
      method: 'PATCH',
      headers: mollieHeaders,
      body: JSON.stringify({ amount: { currency: 'EUR', value: bedragIncl } }),
    })

    if (!patchResponse.ok) {
      const body = await patchResponse.text()
      console.error('Mollie subscription bijwerken mislukt:', patchResponse.status, body)
      return res.status(502).json({ error: 'Abonnement bij Mollie bijwerken mislukt' })
    }

    // Een wijziging in wat een klant betaalt hoort een spoor te hebben, net als
    // een rolwijziging in api/manage-team-member.
    await supabaseAdmin.from('audit_log').insert({
      organisatie_id,
      actor_user_id: user.id,
      action: 'abonnement_bedrag_gewijzigd',
      resource_type: 'organisatie',
      resource_id: organisatie_id,
      metadata: {
        vorig_bedrag_incl: huidig.amount?.value ?? null,
        nieuw_bedrag_incl: bedragIncl,
        bedrag_excl: bedragExcl,
        mollie_subscription_id: subscriptionId,
      },
    }).then(({ error }) => {
      if (error) console.warn('update-subscription-bedrag: audit-regel mislukt', error)
    })

    return res.status(200).json({
      gewijzigd: true,
      vorig_bedrag_incl: huidig.amount?.value ?? null,
      bedrag_incl: bedragIncl,
      bedrag_excl: bedragExcl,
    })
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Onbekende fout'
    const status = bericht === 'Niet geautoriseerd' || bericht === 'Ongeldige sessie' ? 401 : 500
    console.error('update-subscription-bedrag:', err)
    return res.status(status).json({ error: bericht })
  }
}
