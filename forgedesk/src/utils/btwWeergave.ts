/**
 * Binnen de app is het bedrag ex btw het bedrag waar je op stuurt: btw is geld
 * dat door de zaak heen loopt, geen omzet en geen marge. Alle interne schermen
 * — pipeline, facturen, financieel, rapportages, dashboard — tonen daarom ex
 * btw als hoofdbedrag.
 *
 * Wat de klant ziet blijft incl btw: de offerte-PDF, de publieke offertepagina,
 * het portaal, de betaalpagina en de factuur zelf. Dat is wat er betaald wordt
 * en wat er wettelijk op een factuur hoort.
 */

/** Alles met een bedragopbouw: offertes, facturen, inkoopfacturen, bonnen. */
interface BedragDocument {
  subtotaal?: number | null
  btw_bedrag?: number | null
  totaal?: number | null
}

/**
 * Het bedrag ex btw. Oudere rijen (en importen) hebben soms geen subtotaal;
 * dan rekenen we terug vanaf het totaal, en pas als laatste redmiddel tonen we
 * het totaal zelf — een leeg vak is erger dan een bedrag dat de btw nog bevat.
 */
export function exBtw(doc: BedragDocument | null | undefined): number {
  if (!doc) return 0
  if (typeof doc.subtotaal === 'number' && doc.subtotaal !== 0) return doc.subtotaal
  const totaal = doc.totaal ?? 0
  const btw = doc.btw_bedrag ?? 0
  if (totaal && btw) return totaal - btw
  return doc.subtotaal ?? totaal
}

/** Het aandeel van een document dat geen btw is; 1 als er geen btw op zit. */
function exVerhouding(doc: BedragDocument | null | undefined): number {
  const totaal = doc?.totaal ?? 0
  if (!totaal) return 1
  const ex = exBtw(doc)
  if (!ex) return 1
  return ex / totaal
}

/**
 * Wat er van een factuur betaald is, ex btw. Een betaling komt binnen incl
 * btw, dus die wordt naar rato teruggerekend — anders klopt een deelbetaling
 * niet tegen het openstaande bedrag.
 */
export function betaaldExBtw(factuur: (BedragDocument & { betaald_bedrag?: number | null }) | null | undefined): number {
  const betaald = factuur?.betaald_bedrag ?? 0
  if (!betaald) return 0
  return betaald * exVerhouding(factuur)
}

/** Wat er nog open staat, ex btw. */
export function openstaandExBtw(factuur: (BedragDocument & { betaald_bedrag?: number | null }) | null | undefined): number {
  return exBtw(factuur) - betaaldExBtw(factuur)
}
