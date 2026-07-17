import type { Metadata } from 'next'
import LegalLayout from '@/components/pages/LegalLayout'
import { CONTACT_EMAIL } from '@/lib/site'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Cookiebeleid | doen.',
  description: 'Welke cookies doen.team gebruikt en waarom. Op dit moment uitsluitend functionele cookies, geen tracking.',
  path: '/cookies',
})

export default function CookiesPage() {
  return (
    <LegalLayout title="Cookiebeleid" updated="17 juli 2026">
      <p className="legal-note">
        Let op — werk dit bij zodra je analytics of andere third-party scripts toevoegt.
        Op dat moment is een cookie-consent-banner met voorafgaande toestemming wettelijk
        verplicht. Laat vóór publicatie juridisch controleren.
      </p>

      <p>
        Een cookie is een klein tekstbestand dat bij een bezoek aan een website op je
        apparaat wordt opgeslagen. Hieronder lees je welke cookies doen.team gebruikt.
      </p>

      <h2>Welke cookies we gebruiken</h2>
      <p>
        Op dit moment gebruikt deze website <strong>uitsluitend functionele en strikt
        noodzakelijke cookies</strong>. Deze zijn nodig om de site goed te laten werken en om
        je voorkeuren te onthouden. Voor deze cookies is geen toestemming vereist.
      </p>
      <p>
        We plaatsen <strong>geen</strong> tracking-, analytics- of advertentiecookies en delen
        geen gegevens met advertentienetwerken. De lettertypen worden lokaal geserveerd, dus
        er worden geen cookies van externe fontleveranciers geplaatst.
      </p>

      <h2>Als dat verandert</h2>
      <p>
        Zodra we bijvoorbeeld statistieken (analytics) gaan bijhouden, vragen we daar vooraf
        je toestemming voor via een cookiebanner en werken we dit overzicht bij met de naam
        van de dienst, het doel en de bewaartermijn.
      </p>

      <h2>Cookies beheren</h2>
      <p>
        Je kunt cookies altijd zelf verwijderen of blokkeren via de instellingen van je
        browser. Het uitschakelen van functionele cookies kan de werking van de site
        beïnvloeden.
      </p>

      <h2>Vragen</h2>
      <p>
        Vragen over dit cookiebeleid? Mail ons via{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Zie ook onze{' '}
        <a href="/privacy">privacyverklaring</a>.
      </p>
    </LegalLayout>
  )
}
