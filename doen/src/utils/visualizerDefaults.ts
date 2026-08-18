import type { VisualizerInstellingen, CreditsPakket } from '../types/visualizer'
import { round2 } from './budgetUtils'

export const DEFAULT_VISUALIZER_INSTELLINGEN: VisualizerInstellingen = {
  fal_api_key_geconfigureerd: false,
  usd_eur_wisselkoers: 0.92,
  opslag_percentage: 75,
  standaard_doorberekenen: true,
  doorberekening_omschrijving: 'AI Signing Visualisatie — mockup op maat',
  doorberekening_btw_percentage: 21,
  standaard_resolutie: '2K',
  watermark_actief: false,

  systeem_prompt_prefix: `You are a professional architectural visualization tool for a sign company.
Your task is to realistically place signage on buildings. Always:
- Keep the original building structure completely unchanged
- Match the lighting conditions of the original photo
- Make the signage look photorealistic and professionally installed
- Preserve perspective and scale accurately
- The result must look like a professional architectural visualization or pre-production mockup`,

  prompt_led_verlicht: `Place the logo/signage from the reference image onto the building facade as professional LED backlit channel letter signage. The letters and logo should emit a realistic warm glow in {{KLEUR}} color, with subtle light spillage onto the surrounding surface. Evening or dusk lighting. The LED modules should be visible from this distance.

Photorealistic architectural visualization quality, suitable for a client presentation.`,

  prompt_neon: `Place the logo/signage from the reference image onto the building as classic bent neon tube signage. The glass neon tubes should glow in {{KLEUR}} color with authentic neon flicker-free steady light. Night scene, the neon should cast a {{KLEUR}} glow on nearby surfaces. Photorealistic, high-end commercial photography quality.`,

  prompt_dag_onverlicht: `Place the logo/signage from the reference image onto the building facade as professional flat cut-out panel signage. Aluminum housing with a painted {{KLEUR}} finish. Daytime photography, natural daylight. Clean corporate architectural look.

Photorealistic, suitable for a client approval presentation.`,

  prompt_dag_nacht: `Create a realistic composite showing the logo/signage from the reference image placed on the building. Show a seamless left-right split: left half daytime with the signage unlit (aluminum panel, {{KLEUR}} painted), right half nighttime with full LED backlit {{KLEUR}} glow illumination. Professional architectural visualization, photorealistic.`,
}

export function berekenDoorberekendBedrag(
  api_kosten_usd: number,
  instellingen: VisualizerInstellingen
): number {
  const kosten_eur = round2(api_kosten_usd * instellingen.usd_eur_wisselkoers)
  const met_opslag = round2(kosten_eur * (1 + instellingen.opslag_percentage / 100))
  return met_opslag
}

export function bouwPrompt(
  signing_type: string,
  kleur: string,
  instellingen: VisualizerInstellingen,
  aangepaste_toevoeging?: string,
  breedte_cm?: number,
  hoogte_cm?: number,
): string {
  const templates: Record<string, string> = {
    led_verlicht: instellingen.prompt_led_verlicht,
    neon: instellingen.prompt_neon,
    dag_onverlicht: instellingen.prompt_dag_onverlicht,
    dag_nacht: instellingen.prompt_dag_nacht,
  }

  const template = templates[signing_type] ?? templates['led_verlicht']
  let prompt = template.replace(/\{\{KLEUR\}\}/g, kleur)

  if (breedte_cm && hoogte_cm) {
    prompt += `\n\nDimensions: The signage should be approximately ${breedte_cm}cm wide and ${hoogte_cm}cm tall, properly scaled relative to the building facade shown in the photo.`
  } else if (breedte_cm) {
    prompt += `\n\nDimensions: The signage should be approximately ${breedte_cm}cm wide, properly scaled relative to the building facade.`
  }

  if (aangepaste_toevoeging?.trim()) {
    prompt += `\n\nAdditional instructions: ${aangepaste_toevoeging.trim()}`
  }

  return `${instellingen.systeem_prompt_prefix}\n\n${prompt}`
}

export const KOSTEN_PER_RESOLUTIE_USD: Record<string, number> = {
  '1K': 0.08,
  '2K': 0.12,
  '4K': 0.16,
}

export const SIGNING_TYPE_LABELS: Record<string, string> = {
  led_verlicht: 'LED Verlicht',
  neon: 'Neon',
  dag_onverlicht: 'Dag (onverlicht)',
  dag_nacht: 'Dag/Nacht',
}

export const SIGNING_TYPE_TOOLTIPS: Record<string, string> = {
  led_verlicht: 'Meest gebruikte type. Letters of logo verlicht van achteren, warm glow effect. Ideaal voor avond/nacht presentatie aan klant.',
  neon: 'Klassieke neon buizen look. Sfeervoller, minder corporate. Goed voor horeca, retail, creatieve bedrijven.',
  dag_onverlicht: 'Aluminium plaatmateriaal of freesletters overdag. Geen verlichting. Gebruik dit voor dagsituatie zonder licht.',
  dag_nacht: 'Laat beide situaties zien in één beeld. Krachtig voor klantpresentaties — direct effect zichtbaar.',
}

export const KLEUR_PRESETS = [
  { label: 'Wit', waarde: 'wit', hex: '#FFFFFF' },
  { label: 'Warmwit', waarde: 'warmwit', hex: '#FFE4B5' },
  { label: 'Rood', waarde: 'rood', hex: '#FF0000' },
  { label: 'Blauw', waarde: 'blauw', hex: '#0066FF' },
  { label: 'Groen', waarde: 'groen', hex: '#00CC00' },
  { label: 'Goud', waarde: 'goud', hex: '#FFD700' },
] as const

export const CREDITS_PAKKETTEN: CreditsPakket[] = [
  {
    id: 'starter',
    naam: 'Starter',
    credits: 10,
    prijs_eur: 9.90,
    prijs_per_credit_eur: 0.99,
    populair: false,
    beschrijving: 'Probeer de visualizer uit',
  },
  {
    id: 'professional',
    naam: 'Professional',
    credits: 50,
    prijs_eur: 39.50,
    prijs_per_credit_eur: 0.79,
    populair: true,
    beschrijving: 'Meest gekozen — ideaal voor actieve gebruikers',
  },
  {
    id: 'enterprise',
    naam: 'Enterprise',
    credits: 200,
    prijs_eur: 119.00,
    prijs_per_credit_eur: 0.595,
    populair: false,
    beschrijving: 'Hoogste korting — voor intensief gebruik',
  },
]
