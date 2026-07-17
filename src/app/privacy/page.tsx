import type { Metadata } from 'next'
import LegalLayout from '@/components/pages/LegalLayout'
import { CONTACT_EMAIL } from '@/lib/site'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Privacyverklaring | doen.',
  description: 'Hoe doen. omgaat met je persoonsgegevens: welke gegevens we verwerken, waarvoor, hoe lang en welke rechten je hebt onder de AVG.',
  path: '/privacy',
})

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacyverklaring" updated="17 juli 2026">
      <p className="legal-note">
        Let op — nog invullen vóór livegang: [juridische bedrijfsnaam], [KvK-nummer],
        [BTW-nummer], [vestigingsadres] en de definitieve lijst met verwerkers. Laat
        deze verklaring vóór publicatie juridisch controleren.
      </p>

      <p>
        Deze privacyverklaring legt uit hoe doen. (hierna &ldquo;wij&rdquo;, &ldquo;ons&rdquo;) omgaat met
        persoonsgegevens die we verwerken via deze website (doen.team) en de web-app.
        Wij hechten aan zorgvuldige omgang met je gegevens en houden ons aan de Algemene
        Verordening Gegevensbescherming (AVG).
      </p>

      <h2>Wie is verantwoordelijk</h2>
      <p>
        Verwerkingsverantwoordelijke is [juridische bedrijfsnaam], gevestigd te
        [vestigingsadres], ingeschreven bij de Kamer van Koophandel onder [KvK-nummer],
        BTW-nummer [BTW-nummer]. Voor vragen over je privacy kun je contact opnemen via{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>Welke gegevens we verwerken</h2>
      <ul>
        <li><strong>Contactformulier:</strong> naam, e-mailadres en de inhoud van je bericht.</li>
        <li><strong>Account &amp; gebruik van de app:</strong> naam, e-mailadres, bedrijfsgegevens en de gegevens die je zelf in de app invoert (klanten, offertes, projecten, facturen).</li>
        <li><strong>Technische gegevens:</strong> gegevens die nodig zijn om de site veilig en werkend te houden, zoals je IP-adres en browsertype (via serverlogs van onze hostingpartij).</li>
      </ul>

      <h2>Waarvoor en op welke grondslag</h2>
      <ul>
        <li><strong>Beantwoorden van je bericht</strong> — grondslag: gerechtvaardigd belang / jouw verzoek.</li>
        <li><strong>Leveren van de dienst</strong> (account, app-functionaliteit, facturatie) — grondslag: uitvoering van de overeenkomst.</li>
        <li><strong>Beveiliging en misbruikpreventie</strong> — grondslag: gerechtvaardigd belang.</li>
        <li><strong>Wettelijke verplichtingen</strong> (bijv. fiscale bewaarplicht) — grondslag: wettelijke plicht.</li>
      </ul>

      <h2>Bewaartermijnen</h2>
      <p>
        We bewaren je gegevens niet langer dan nodig. Berichten via het contactformulier
        bewaren we tot maximaal [termijn, bijv. 12 maanden] na afhandeling. Accountgegevens
        bewaren we zolang je een account hebt; na beëindiging verwijderen of anonimiseren we
        ze binnen [termijn], behalve waar een wettelijke bewaarplicht (bijv. facturen: 7 jaar)
        geldt.
      </p>

      <h2>Delen met derden (verwerkers)</h2>
      <p>
        Wij verkopen je gegevens niet. Voor het leveren van onze dienst schakelen we
        verwerkers in, met wie we een verwerkersovereenkomst hebben gesloten:
      </p>
      <ul>
        <li><strong>Resend</strong> — verzending van e-mail (o.a. contactformulier).</li>
        <li><strong>[Hostingpartij]</strong> — hosting van de website en app.</li>
        <li><strong>[Databank-/opslagpartij]</strong> — opslag van app-gegevens.</li>
        <li><strong>Mollie</strong> — verwerking van betalingen (indien van toepassing).</li>
      </ul>
      <p>
        Wanneer een verwerker gegevens buiten de EER verwerkt, zorgen we voor passende
        waarborgen (zoals EU-modelcontractbepalingen).
      </p>

      <h2>Cookies</h2>
      <p>
        Deze website plaatst op dit moment uitsluitend functionele/noodzakelijke cookies en
        gebruikt geen tracking- of advertentiecookies. Lees meer in ons{' '}
        <a href="/cookies">cookiebeleid</a>.
      </p>

      <h2>Jouw rechten</h2>
      <p>Onder de AVG heb je het recht om:</p>
      <ul>
        <li>je gegevens in te zien, te corrigeren of te verwijderen;</li>
        <li>de verwerking te beperken of er bezwaar tegen te maken;</li>
        <li>je gegevens over te laten dragen (dataportabiliteit);</li>
        <li>een gegeven toestemming in te trekken.</li>
      </ul>
      <p>
        Stuur je verzoek naar <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Je hebt
        daarnaast het recht een klacht in te dienen bij de Autoriteit Persoonsgegevens.
      </p>

      <h2>Beveiliging</h2>
      <p>
        We nemen passende technische en organisatorische maatregelen om je gegevens te
        beschermen tegen verlies of onrechtmatige verwerking, waaronder versleutelde
        verbindingen (TLS) en toegangsbeperking.
      </p>

      <h2>Wijzigingen</h2>
      <p>
        We kunnen deze verklaring van tijd tot tijd aanpassen. De meest actuele versie staat
        altijd op deze pagina, met de datum van laatste wijziging bovenaan.
      </p>
    </LegalLayout>
  )
}
