import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// De map Concepten bevat twee soorten: concepten die in doen. geschreven zijn
// (met het hele document in de kolom `concept`) en concepten die van de
// mailserver komen, begonnen in Outlook of op de telefoon. Die tweede soort gaf
// "Concept kon niet worden geopend" en was daarmee onbruikbaar. Deze test legt
// vast dat de terugval blijft bestaan.

const BRON = readFileSync(
  fileURLToPath(new URL('../../src/services/conceptService.ts', import.meta.url)),
  'utf8',
)

describe('een concept van de mailserver blijft te openen', () => {
  it('valt terug op de gewone kolommen als er geen concept-JSON is', () => {
    expect(BRON).toContain('uitMailrij')
    expect(BRON).toMatch(/alsDocument\(rij\)\s*\n?\s*if \(eigen\) return eigen|alsDocument\(rij\) \?\? uitMailrij/)
  })

  it('haalt de inhoud uit email_bodies als de kolommen leeg zijn', () => {
    // Migratie 244 verhuisde de bodies; zonder deze stap opent zo'n concept leeg.
    expect(BRON).toContain('getEmailBody')
  })

  it('overleeft een database zonder migratie 245', () => {
    // account_id bestaat dan niet, en een onbekende kolom laat de hele select
    // falen in plaats van alleen dat veld.
    expect(BRON).toContain('isKolomFout')
    expect(BRON).toMatch(/account_id`\)\s*\n\s*if \(isKolomFout/)
  })

  it('zet de handtekening uit voor een concept van de server', () => {
    // De handtekening staat al in de tekst die van de server komt; aan laten
    // zou hem een tweede keer onder het bericht zetten.
    expect(BRON).toMatch(/handtekening: false/)
  })
})
