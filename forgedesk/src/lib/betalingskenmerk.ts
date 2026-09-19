// Belgische gestructureerde mededeling (OGM/VCS): +++XXX/XXXX/XXXXX+++.
// Tien cijfers uit het factuurnummer, gevolgd door twee controlecijfers
// (rest bij deling door 97; 0 wordt 97). Belgische banken herkennen dit
// formaat en boeken de betaling automatisch op de factuur.

export function gestructureerdeMededeling(factuurNummer: string): string | null {
  const cijfers = (factuurNummer || '').replace(/\D/g, '')
  if (!cijfers) return null
  const basis = cijfers.slice(-10).padStart(10, '0')
  const rest = Number(BigInt(basis) % 97n)
  const controle = String(rest === 0 ? 97 : rest).padStart(2, '0')
  const volledig = basis + controle
  return `+++${volledig.slice(0, 3)}/${volledig.slice(3, 7)}/${volledig.slice(7, 12)}+++`
}

/** Zonder opmaak (12 cijfers), zoals in UBL cbc:PaymentID. */
export function gestructureerdeMededelingKaal(factuurNummer: string): string | null {
  const opgemaakt = gestructureerdeMededeling(factuurNummer)
  return opgemaakt ? opgemaakt.replace(/\D/g, '') : null
}
