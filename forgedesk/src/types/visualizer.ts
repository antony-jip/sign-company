export type SigningType = 'led_verlicht' | 'neon' | 'dag_onverlicht' | 'dag_nacht'

export type VisualizerStatus = 'wachten' | 'genereren' | 'klaar' | 'fout'

export interface SigningVisualisatie {
  id: string
  user_id: string

  // Koppelingen (allemaal optioneel — visualizer is ook standalone bruikbaar)
  offerte_id?: string
  project_id?: string
  klant_id?: string

  // Input
  gebouw_foto_url: string
  logo_url?: string
  prompt_gebruikt: string
  aangepaste_prompt?: string

  // Afmetingen
  breedte_cm?: number
  hoogte_cm?: number
  kleur_instelling: string
  signing_type: SigningType
  resolutie: '1K' | '2K' | '4K'

  // Output
  resultaat_url: string
  status: VisualizerStatus

  // Kosten tracking
  api_kosten_eur: number
  wisselkoers_gebruikt: number
  doorberekend_aan_klant: boolean
  offerte_regel_id?: string

  // Meta
  fal_request_id?: string
  generatie_tijd_ms?: number
  notitie?: string

  created_at: string
  updated_at?: string
}

export interface VisualizerInstellingen {
  fal_api_key_geconfigureerd: boolean

  usd_eur_wisselkoers: number
  opslag_percentage: number

  standaard_doorberekenen: boolean
  doorberekening_omschrijving: string
  doorberekening_btw_percentage: number

  standaard_resolutie: '1K' | '2K' | '4K'

  prompt_led_verlicht: string
  prompt_neon: string
  prompt_dag_onverlicht: string
  prompt_dag_nacht: string

  systeem_prompt_prefix: string

  watermark_actief: boolean
}

export interface VisualizerApiLog {
  id: string
  user_id: string
  visualisatie_id: string
  timestamp: string
  actie: 'generatie_gestart' | 'generatie_klaar' | 'generatie_fout' | 'verwijderd'
  api_kosten_usd?: number
  fout_melding?: string
  created_at: string
}

export interface VisualizerStats {
  totaal_gegenereerd: number
  totaal_kosten_eur: number
  totaal_doorberekend_eur: number
  gegenereerd_deze_maand: number
  kosten_deze_maand_eur: number
  gemiddelde_generatietijd_ms: number
}

// Credits systeem
export interface VisualizerCredits {
  user_id: string
  saldo: number
  totaal_gekocht: number
  totaal_gebruikt: number
  laatst_bijgewerkt: string
}

export interface CreditTransactie {
  id: string
  user_id: string
  type: 'aankoop' | 'gebruik' | 'handmatig_toegevoegd' | 'correctie'
  aantal: number
  saldo_na: number
  beschrijving: string
  visualisatie_id?: string
  created_at: string
}

export interface CreditsPakket {
  id: string
  naam: string
  credits: number
  prijs_eur: number
  prijs_per_credit_eur: number
  populair: boolean
  beschrijving: string
}
