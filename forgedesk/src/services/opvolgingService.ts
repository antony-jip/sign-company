import {
  supabase, isSupabaseConfigured,
} from './supabaseHelpers'
import type { OpvolgSchema, OpvolgStap, OpvolgLogEntry } from '@/types'

const DEFAULT_OPVOLG_STAPPEN: Omit<OpvolgStap, 'id' | 'schema_id' | 'created_at'>[] = [
  { stap_nummer: 1, dagen_na_versturen: 3, actie: 'email_klant', onderwerp: 'Offerte {offerte_nummer} — heeft u nog vragen?', inhoud: 'Beste {contactpersoon},\n\nOnlangs hebben wij u offerte {offerte_nummer} gestuurd ter waarde van {offerte_bedrag}.\n\nHeeft u nog vragen of wilt u iets bespreken? Wij helpen u graag verder.\n\nMet vriendelijke groet,\n{bedrijfsnaam}', alleen_als_niet_bekeken: true, alleen_als_niet_gereageerd: false, actief: true },
  { stap_nummer: 2, dagen_na_versturen: 7, actie: 'email_klant', onderwerp: 'Herinnering: offerte {offerte_nummer}', inhoud: 'Beste {contactpersoon},\n\nGraag herinneren wij u aan onze offerte {offerte_nummer} voor project {project_naam}.\n\nDe offerte is {dagen_open} dagen geleden verstuurd. Wij ontvangen graag uw reactie.\n\nMet vriendelijke groet,\n{bedrijfsnaam}', alleen_als_niet_bekeken: false, alleen_als_niet_gereageerd: true, actief: true },
  { stap_nummer: 3, dagen_na_versturen: 14, actie: 'melding_intern', onderwerp: 'Offerte {offerte_nummer} staat {dagen_open} dagen open', inhoud: 'Offerte {offerte_nummer} voor {klant_naam} ({offerte_bedrag}) staat al {dagen_open} dagen open zonder reactie. Tijd om telefonisch contact op te nemen.', alleen_als_niet_bekeken: false, alleen_als_niet_gereageerd: false, actief: true },
  { stap_nummer: 4, dagen_na_versturen: 21, actie: 'email_en_melding', onderwerp: 'Laatste herinnering: offerte {offerte_nummer}', inhoud: 'Beste {contactpersoon},\n\nDit is onze laatste herinnering voor offerte {offerte_nummer} ({offerte_bedrag}).\n\nDe offerte is nog {dagen_open} dagen geldig. Neem gerust contact met ons op.\n\nMet vriendelijke groet,\n{bedrijfsnaam}', alleen_als_niet_bekeken: false, alleen_als_niet_gereageerd: true, actief: true },
]

export async function getOpvolgSchemas(organisatieId: string): Promise<OpvolgSchema[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('offerte_opvolg_schemas')
    .select('*, stappen:offerte_opvolg_stappen(*)')
    .eq('organisatie_id', organisatieId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map((s: OpvolgSchema & { stappen: OpvolgStap[] }) => ({
    ...s,
    stappen: (s.stappen || []).sort((a: OpvolgStap, b: OpvolgStap) => a.stap_nummer - b.stap_nummer),
  }))
}

export async function getDefaultOpvolgSchema(organisatieId: string): Promise<OpvolgSchema | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  const { data } = await supabase
    .from('offerte_opvolg_schemas')
    .select('*, stappen:offerte_opvolg_stappen(*)')
    .eq('organisatie_id', organisatieId)
    .eq('is_default', true)
    .eq('actief', true)
    .maybeSingle()
  if (!data) return null
  return {
    ...data,
    stappen: (data.stappen || []).sort((a: OpvolgStap, b: OpvolgStap) => a.stap_nummer - b.stap_nummer),
  }
}

export async function createOpvolgSchema(organisatieId: string, naam: string, isDefault = false): Promise<OpvolgSchema> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase niet geconfigureerd')
  const { data, error } = await supabase
    .from('offerte_opvolg_schemas')
    .insert({ organisatie_id: organisatieId, naam, is_default: isDefault })
    .select()
    .single()
  if (error) throw error
  return data as OpvolgSchema
}

export async function updateOpvolgSchema(id: string, updates: Partial<OpvolgSchema>): Promise<OpvolgSchema> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase niet geconfigureerd')
  const { data, error } = await supabase
    .from('offerte_opvolg_schemas')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as OpvolgSchema
}

export async function deleteOpvolgSchema(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return
  const { error } = await supabase.from('offerte_opvolg_schemas').delete().eq('id', id)
  if (error) throw error
}

export async function upsertOpvolgStap(stap: Partial<OpvolgStap> & { schema_id: string }): Promise<OpvolgStap> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase niet geconfigureerd')
  if (stap.id) {
    const { data, error } = await supabase
      .from('offerte_opvolg_stappen')
      .update(stap)
      .eq('id', stap.id)
      .select()
      .single()
    if (error) throw error
    return data as OpvolgStap
  }
  const { data, error } = await supabase
    .from('offerte_opvolg_stappen')
    .insert(stap)
    .select()
    .single()
  if (error) throw error
  return data as OpvolgStap
}

export async function deleteOpvolgStap(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return
  const { error } = await supabase.from('offerte_opvolg_stappen').delete().eq('id', id)
  if (error) throw error
}

export async function ensureDefaultOpvolgSchema(organisatieId: string): Promise<OpvolgSchema> {
  if (!isSupabaseConfigured() || !supabase) {
    return { id: '', organisatie_id: organisatieId, naam: 'Standaard', is_default: true, actief: true, created_at: '', stappen: [] }
  }
  const { data: allSchemas } = await supabase
    .from('offerte_opvolg_schemas')
    .select('*, stappen:offerte_opvolg_stappen(*)')
    .eq('organisatie_id', organisatieId)
    .order('created_at', { ascending: true })

  if (allSchemas && allSchemas.length > 0) {
    const defaultOne = allSchemas.find((s: { is_default: boolean; actief: boolean }) => s.is_default && s.actief) || allSchemas[0]
    return {
      ...defaultOne,
      stappen: ((defaultOne as { stappen?: OpvolgStap[] }).stappen || []).sort((a: OpvolgStap, b: OpvolgStap) => a.stap_nummer - b.stap_nummer),
    }
  }

  const schema = await createOpvolgSchema(organisatieId, 'Standaard', true)
  for (const stap of DEFAULT_OPVOLG_STAPPEN) {
    await upsertOpvolgStap({ ...stap, schema_id: schema.id })
  }
  const full = await getDefaultOpvolgSchema(organisatieId)
  return full || schema
}

export async function getOpvolgLog(offerteId: string): Promise<OpvolgLogEntry[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('offerte_opvolg_log')
    .select('*')
    .eq('offerte_id', offerteId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []) as OpvolgLogEntry[]
}
