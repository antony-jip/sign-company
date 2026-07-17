import type { Metadata } from 'next'
import LegalLayout from '@/components/pages/LegalLayout'
import { CONTACT_EMAIL } from '@/lib/site'
import { PRICE_PER_MONTH } from '@/data/pricing'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Algemene voorwaarden | doen.',
  description: 'De voorwaarden voor het gebruik van doen.: abonnement, betaling, proefperiode, opzegging, aansprakelijkheid en toepasselijk recht.',
  path: '/voorwaarden',
})

export default function VoorwaardenPage() {
  return (
    <LegalLayout title="Algemene voorwaarden" updated="17 juli 2026">
      <p className="legal-note">
        Let op — dit is een werkbaar startpunt, geen definitief juridisch document. Vul
        [juridische bedrijfsnaam], [KvK-nummer] en de openstaande termijnen in en laat de
        voorwaarden vóór livegang controleren door een jurist.
      </p>

      <p>
        Deze algemene voorwaarden zijn van toepassing op het gebruik van doen., de
        bedrijfssoftware aangeboden door [juridische bedrijfsnaam] (hierna &ldquo;doen.&rdquo;,
        &ldquo;wij&rdquo;), ingeschreven bij de KvK onder [KvK-nummer]. Door een account aan te
        maken of de dienst te gebruiken, ga je akkoord met deze voorwaarden.
      </p>

      <h2>1. De dienst</h2>
      <p>
        doen. is een online (SaaS) toepassing voor signmakers en reclamebedrijven waarmee je
        onder meer offertes, projecten, planning, werkbonnen, een klantportaal en facturatie
        beheert. We spannen ons in de dienst beschikbaar en werkend te houden, maar kunnen
        geen ononderbroken beschikbaarheid garanderen (bijv. bij onderhoud of storingen).
      </p>

      <h2>2. Account</h2>
      <p>
        Je bent verantwoordelijk voor het geheimhouden van je inloggegevens en voor al het
        gebruik dat via jouw account plaatsvindt. Je zorgt dat de gegevens die je opgeeft
        juist en actueel zijn.
      </p>

      <h2>3. Proefperiode</h2>
      <p>
        We bieden een gratis proefperiode van 30 dagen aan, zonder dat een creditcard nodig
        is. Na de proefperiode gaat het betaalde abonnement pas in als je daar zelf voor
        kiest.
      </p>

      <h2>4. Prijs en betaling</h2>
      <p>
        Het abonnement kost €{PRICE_PER_MONTH} per maand (exclusief btw), tot en met 10
        gebruikers. Betaling gebeurt per maand vooraf via de aangeboden betaalmethode. Bij
        meer gebruikers of afwijkende afspraken gelden aanvullende voorwaarden die we vooraf
        met je delen. We kunnen tarieven aanpassen; wijzigingen kondigen we ten minste
        [termijn] van tevoren aan.
      </p>

      <h2>5. Looptijd en opzegging</h2>
      <p>
        Het abonnement is maandelijks opzegbaar. Bij opzegging loopt je toegang door tot het
        einde van de reeds betaalde periode. Reeds betaalde bedragen worden niet
        gerestitueerd, tenzij dwingend recht anders bepaalt.
      </p>

      <h2>6. Jouw gegevens</h2>
      <p>
        De gegevens die je in doen. invoert blijven van jou. Wij verwerken persoonsgegevens
        conform onze <a href="/privacy">privacyverklaring</a> en, waar van toepassing, een
        verwerkersovereenkomst. Bij beëindiging kun je gedurende [termijn] een export van je
        gegevens opvragen.
      </p>

      <h2>7. Toegestaan gebruik</h2>
      <p>
        Je gebruikt doen. niet voor onrechtmatige doeleinden en niet op een manier die de
        dienst of andere gebruikers schaadt. Wij mogen een account opschorten bij misbruik of
        bij het niet nakomen van deze voorwaarden.
      </p>

      <h2>8. Aansprakelijkheid</h2>
      <p>
        doen. is niet aansprakelijk voor indirecte schade of gevolgschade. Onze totale
        aansprakelijkheid is beperkt tot het bedrag dat je in de [termijn, bijv. 12] maanden
        voorafgaand aan de schade voor de dienst hebt betaald. Deze beperking geldt niet bij
        opzet of bewuste roekeloosheid.
      </p>

      <h2>9. Wijzigingen</h2>
      <p>
        We kunnen deze voorwaarden aanpassen. Belangrijke wijzigingen melden we vooraf. De
        actuele versie staat altijd op deze pagina.
      </p>

      <h2>10. Toepasselijk recht</h2>
      <p>
        Op deze voorwaarden is Nederlands recht van toepassing. Geschillen leggen we voor aan
        de bevoegde rechter in [arrondissement]. Vragen? Mail{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalLayout>
  )
}
