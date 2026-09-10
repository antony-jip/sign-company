// Tekst die zichzelf tikt: n tekens zichtbaar op basis van t.
export const typ = (tekst: string, t: number, van: number, msPerTeken = 28) => {
  const n = Math.max(0, Math.floor((t - van) / msPerTeken))
  return tekst.slice(0, n)
}

// Getal dat optelt naar zijn eindwaarde.
export const tel = (naar: number, t: number, van: number, duurMs = 700) => {
  const p = Math.min(1, Math.max(0, (t - van) / duurMs))
  const e = 1 - Math.pow(1 - p, 3)
  return naar * e
}

export const euro = (n: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
