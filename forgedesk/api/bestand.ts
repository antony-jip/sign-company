import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// Levert een ondertekende link naar een bestand in de private bucket, maar
// alleen als het bestand aantoonbaar bij de organisatie van de aanvrager hoort.
//
// WAAROM DIT BESTAAT. De bestanden stonden in een publieke bucket, waar een
// link genoeg was om erbij te komen. Ze staan nu in documenten-prive, die geen
// RLS-policy voor authenticated heeft: alleen de service role komt erbij, en
// dat is deze route.
//
// De voor de hand liggende afscherming, een RLS-policy op het pad, kan hier
// niet. Migratie 184 legt uit waarom: de uuid in het pad is soms een gebruiker,
// soms een organisatie, en soms een werkbon. Er valt geen eigenaar uit af te
// leiden. Wat een bestand wél aan een organisatie bindt, staat in de rij die
// ernaar verwijst, en die rijen dragen allemaal organisatie_id.
//
// Dus: zoek het pad op in de tabellen die ernaar kunnen verwijzen, en teken
// alleen als een van die rijen bij jouw organisatie hoort.

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
)

const BUCKET = 'documenten-prive'
const GELDIGHEID_SECONDEN = 60 * 60 * 24

// Elke plek waar een storage-pad in de database kan staan. Staat een pad in
// geen van deze kolommen, dan is er niets dat het aan een organisatie koppelt
// en geven we niets terug.
const VERWIJZINGEN: Array<{ tabel: string; kolommen: string[] }> = [
  { tabel: 'documenten', kolommen: ['storage_path'] },
  { tabel: 'portaal_bestanden', kolommen: ['url', 'thumbnail_url'] },
  { tabel: 'portaal_items', kolommen: ['foto_url'] },
  { tabel: 'werkbon_afbeeldingen', kolommen: ['url'] },
  { tabel: 'offerte_items', kolommen: ['foto_url', 'bijlage_url'] },
  { tabel: 'signing_visualisaties', kolommen: ['gebouw_foto_url', 'resultaat_url', 'logo_url'] },
]

async function verifieerGebruiker(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

async function hoortBijOrganisatie(pad: string, organisatieId: string): Promise<boolean> {
  for (const { tabel, kolommen } of VERWIJZINGEN) {
    for (const kolom of kolommen) {
      const { data, error } = await supabaseAdmin
        .from(tabel)
        .select('id')
        .eq(kolom, pad)
        .eq('organisatie_id', organisatieId)
        .limit(1)
      // Een ontbrekende tabel of kolom mag geen toegang opleveren, maar ook
      // niet de hele controle laten klappen: de volgende kan nog matchen.
      if (error) continue
      if (data && data.length > 0) return true
    }
  }
  return false
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ fout: 'Methode niet toegestaan' })
  }

  let gebruikerId: string
  try {
    gebruikerId = await verifieerGebruiker(req)
  } catch (err) {
    return res.status(401).json({ fout: err instanceof Error ? err.message : 'Niet geautoriseerd' })
  }

  const pad = typeof req.body?.pad === 'string' ? req.body.pad.trim() : ''
  if (!pad) return res.status(400).json({ fout: 'Geen pad opgegeven' })
  // Een volledige URL is geen pad. Wie er een meestuurt, verwacht iets anders
  // dan deze route doet, en stilzwijgend iets ondertekenen zou dat verbergen.
  if (/^https?:\/\//i.test(pad) || pad.startsWith('data:')) {
    return res.status(400).json({ fout: 'Verwacht een storage-pad, geen URL' })
  }
  if (pad.includes('..')) return res.status(400).json({ fout: 'Ongeldig pad' })

  const { data: profiel } = await supabaseAdmin
    .from('profiles')
    .select('organisatie_id')
    .eq('id', gebruikerId)
    .maybeSingle()

  const organisatieId = profiel?.organisatie_id
  if (!organisatieId) return res.status(403).json({ fout: 'Geen organisatie' })

  if (!(await hoortBijOrganisatie(pad, organisatieId))) {
    // Bewust hetzelfde antwoord als "bestaat niet": of een pad bestaat is zelf
    // informatie die buiten de organisatie niets te zoeken heeft.
    return res.status(404).json({ fout: 'Bestand niet gevonden' })
  }

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(pad, GELDIGHEID_SECONDEN)

  if (error || !data) return res.status(404).json({ fout: 'Bestand niet gevonden' })

  return res.status(200).json({ url: data.signedUrl, geldigTot: Date.now() + GELDIGHEID_SECONDEN * 1000 })
}
