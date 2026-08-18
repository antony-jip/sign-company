import type { Feestdag } from '@/types'

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

// Pasen berekening (Anonymous Gregorian algorithm)
function berekenPasen(jaar: number): Date {
  const a = jaar % 19
  const b = Math.floor(jaar / 100)
  const c = jaar % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const maand = Math.floor((h + l - 7 * m + 114) / 31)
  const dag = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(jaar, maand - 1, dag)
}

export function getNederlandseFeestdagen(jaar: number): Feestdag[] {
  // Vaste feestdagen
  const vast: Feestdag[] = [
    { datum: `${jaar}-01-01`, naam: 'Nieuwjaarsdag', type: 'officieel' },
    { datum: `${jaar}-04-27`, naam: 'Koningsdag', type: 'officieel' },
    { datum: `${jaar}-05-05`, naam: 'Bevrijdingsdag', type: 'officieel' },
    { datum: `${jaar}-12-25`, naam: 'Eerste Kerstdag', type: 'officieel' },
    { datum: `${jaar}-12-26`, naam: 'Tweede Kerstdag', type: 'officieel' },
  ]

  // Koningsdag uitzondering: als 27 april op zondag valt, wordt het 26 april
  const koningsdag = vast.find(f => f.naam === 'Koningsdag')!
  const kd = new Date(koningsdag.datum + 'T00:00:00')
  if (kd.getDay() === 0) {
    koningsdag.datum = formatDate(addDays(kd, -1))
  }

  // Bewegende feestdagen (afhankelijk van Pasen)
  const pasen = berekenPasen(jaar)
  const bewegend: Feestdag[] = [
    { datum: formatDate(addDays(pasen, -2)), naam: 'Goede Vrijdag', type: 'officieel' },
    { datum: formatDate(pasen), naam: 'Eerste Paasdag', type: 'officieel' },
    { datum: formatDate(addDays(pasen, 1)), naam: 'Tweede Paasdag', type: 'officieel' },
    { datum: formatDate(addDays(pasen, 39)), naam: 'Hemelvaartsdag', type: 'officieel' },
    { datum: formatDate(addDays(pasen, 49)), naam: 'Eerste Pinksterdag', type: 'officieel' },
    { datum: formatDate(addDays(pasen, 50)), naam: 'Tweede Pinksterdag', type: 'officieel' },
  ]

  return [...vast, ...bewegend].sort((a, b) => a.datum.localeCompare(b.datum))
}

export function isFeestdag(datum: string, feestdagen: Feestdag[]): Feestdag | undefined {
  return feestdagen.find(f => f.datum === datum)
}
