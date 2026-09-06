import type { MedewerkerContract } from '@/types'

/** Volgorde ma..zo, zodat getDay() (0 = zo) te vertalen is. */
const VELDEN: (keyof Pick<MedewerkerContract, 'uren_ma' | 'uren_di' | 'uren_wo' | 'uren_do' | 'uren_vr' | 'uren_za' | 'uren_zo'>)[] =
  ['uren_ma', 'uren_di', 'uren_wo', 'uren_do', 'uren_vr', 'uren_za', 'uren_zo']

/** Het contract dat op een datum geldt: laatste geldig_van <= datum, zonder verlopen geldig_tot. */
export function contractOpDatum(contracten: MedewerkerContract[], medewerkerId: string, datumIso: string): MedewerkerContract | null {
  const dag = datumIso.slice(0, 10)
  const kandidaten = contracten
    .filter((c) => c.medewerker_id === medewerkerId && c.geldig_van.slice(0, 10) <= dag && (!c.geldig_tot || c.geldig_tot.slice(0, 10) >= dag))
    .sort((a, b) => (a.geldig_van < b.geldig_van ? 1 : -1))
  return kandidaten[0] ?? null
}

/** Contracturen voor één dag; 0 als er geen contract is. */
export function contractUrenOpDag(contracten: MedewerkerContract[], medewerkerId: string, datumIso: string): number {
  const c = contractOpDatum(contracten, medewerkerId, datumIso)
  if (!c) return 0
  const weekdag = (new Date(datumIso.slice(0, 10) + 'T00:00:00').getDay() + 6) % 7
  return Number(c[VELDEN[weekdag]] ?? 0)
}

/** Som van de contracturen ma..zo van één contract. */
export function contractUrenPerWeek(c: MedewerkerContract | null | undefined): number {
  if (!c) return 0
  return VELDEN.reduce((som, v) => som + Number(c[v] ?? 0), 0)
}

/** Maandag (ISO-datum) van de week waarin een datum valt. */
export function maandagVan(datumIso: string): string {
  const d = new Date(datumIso.slice(0, 10) + 'T00:00:00')
  const verschil = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - verschil)
  return d.toISOString().slice(0, 10)
}

export function datumPlusDagen(datumIso: string, dagen: number): string {
  const d = new Date(datumIso.slice(0, 10) + 'T00:00:00')
  d.setDate(d.getDate() + dagen)
  return d.toISOString().slice(0, 10)
}
