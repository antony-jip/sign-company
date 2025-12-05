import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { Services } from '@/components/Services';
import { USPs } from '@/components/USPs';
import { Portfolio } from '@/components/Portfolio';
import { FAQ } from '@/components/FAQ';
import { CTA } from '@/components/CTA';
import { Footer } from '@/components/Footer';
import { companyInfo } from '@/lib/company-info';

const homeServices = [
  {
    title: 'Gevelreclame',
    description:
      'Doosletters, freesletters en lichtreclame. Maak uw bedrijf zichtbaar met professionele gevelreclame.',
    icon: 'sign',
    link: '/gevelreclame-enkhuizen/',
  },
  {
    title: 'Autobelettering',
    description:
      'Van subtiele logo\'s tot full wraps. Uw voertuigen als rijdend visitekaartje.',
    icon: 'car',
    link: '/autobelettering-enkhuizen/',
  },
  {
    title: 'Bootstickers',
    description:
      'Bootbelettering voor het IJsselmeer. Bootnamen, registratienummers en decoratieve striping.',
    icon: 'boat',
    link: '/bootstickers-enkhuizen/',
  },
  {
    title: 'Interieur Signing',
    description:
      'Wanddecoratie, akoestische panelen en kantoor branding. Sfeer én functie.',
    icon: 'interior',
    link: '/interieur-signing-noord-holland/',
  },
  {
    title: 'Bewegwijzering',
    description:
      'Duidelijke routering binnen en buiten. Wayfinding systemen voor elk gebouw.',
    icon: 'wayfinding',
    link: '/bewegwijzering-west-friesland/',
  },
  {
    title: 'Carwrapping',
    description:
      'Volledige kleurwijziging of reclame wrap. Premium folies met garantie.',
    icon: 'wrap',
    link: '/carwrapping-lelystad/',
  },
];

const homeUSPs = [
  {
    title: '42 Jaar Ervaring',
    description:
      'Sinds 1983 specialist in signing en reclame. Vakmanschap uit West-Friesland.',
  },
  {
    title: 'Premium Materialen',
    description:
      'Wij werken uitsluitend met 3M en Avery folies voor maximale duurzaamheid.',
  },
  {
    title: 'Eigen Productie',
    description:
      'Van ontwerp tot montage, alles in eigen beheer voor de beste kwaliteit.',
  },
  {
    title: 'Lokaal & Persoonlijk',
    description:
      'Korte lijntjes, snelle service en persoonlijk advies voor elk project.',
  },
];

const homePortfolio = [
  {
    title: 'WestCord Hotels',
    description:
      'Complete signing en interieur branding voor hotelketen.',
    image: '/images/portfolio/westcord.jpg',
    location: 'Noord-Holland',
    category: 'Totaalproject',
  },
  {
    title: 'Westfriesgasthuis',
    description:
      'Bewegwijzering en gevelreclame voor regionaal ziekenhuis.',
    image: '/images/portfolio/westfriesgasthuis.jpg',
    location: 'Hoorn',
    category: 'Zorg',
  },
  {
    title: 'Transportbedrijf Noord-Holland',
    description:
      'Vloot van 20+ vrachtwagens uniform beleterd.',
    image: '/images/portfolio/transport.jpg',
    location: 'West-Friesland',
    category: 'Wagenpark',
  },
];

const homeFAQs = [
  {
    question: 'Wat voor soort signing kunnen jullie maken?',
    answer:
      'Wij maken alle vormen van signing: gevelreclame (doosletters, freesletters, lichtreclame), autobelettering (van logo\'s tot full wraps), bootstickers, interieur signing (wanddecoratie, textielframes, akoestische panelen), bewegwijzering en evenement materialen.',
  },
  {
    question: 'In welke regio\'s zijn jullie actief?',
    answer:
      'Sign Company is gevestigd in Enkhuizen en bedient heel Noord-Holland, West-Friesland, de Kop van Noord-Holland, Flevoland en de Waddeneilanden. Van Texel tot Almere, we komen graag naar u toe.',
  },
  {
    question: 'Hoelang bestaat Sign Company?',
    answer:
      'Sign Company is opgericht in 1983 en bestaat inmiddels meer dan 40 jaar. Als familiebedrijf hebben we in die tijd duizenden projecten gerealiseerd.',
  },
  {
    question: 'Welke materialen gebruiken jullie?',
    answer:
      'Wij werken uitsluitend met premium materialen van gerenommeerde fabrikanten zoals 3M en Avery. Voor autobelettering bieden we 5-7 jaar garantie op materiaal en applicatie.',
  },
  {
    question: 'Kunnen jullie ook grote projecten aan?',
    answer:
      'Zeker! Wij hebben ervaring met complete bedrijfspanden, wagenparken en grote bewegwijzeringsprojecten. Van ontwerp tot montage, alles in eigen beheer.',
  },
  {
    question: 'Hoe vraag ik een offerte aan?',
    answer:
      'U kunt ons bereiken via telefoon, e-mail of het contactformulier op deze website. Wij maken graag een vrijblijvende offerte na een adviesgesprek, eventueel op locatie.',
  },
];

export default function HomePage() {
  return (
    <>
      <Header transparent />
      <main id="main-content">
        <Hero
          h1="Van Idee naar Icoon"
          intro={`${companyInfo.name} is uw specialist voor gevelreclame, autobelettering en signing in Noord-Holland en Flevoland. Al meer dan 40 jaar transformeren wij bedrijven met hoogwaardige visuele communicatie.`}
          ctaText="Vraag gratis advies aan"
          ctaLink="#contact"
        />

        <Services
          title="Onze Diensten"
          subtitle="Complete signing oplossingen voor elk bedrijf"
          services={homeServices}
        />

        <USPs
          title="Waarom Sign Company?"
          subtitle="Al meer dan 40 jaar uw betrouwbare partner"
          usps={homeUSPs}
        />

        <Portfolio
          title="Recente Projecten"
          subtitle="Bekijk wat we voor anderen hebben gerealiseerd"
          items={homePortfolio}
        />

        <section className="py-16 lg:py-24 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-gray-900 mb-4">
                Ons Werkgebied
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Gevestigd in Enkhuizen, actief in heel Noord-Holland en Flevoland
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                { name: 'Enkhuizen', link: '/gevelreclame-enkhuizen/' },
                { name: 'Hoorn', link: '/gevelreclame-hoorn/' },
                { name: 'Medemblik', link: '/gevelreclame-medemblik/' },
                { name: 'Schagen', link: '/gevelreclame-schagen/' },
                { name: 'Den Helder', link: '/signing-den-helder/' },
                { name: 'Texel', link: '/signing-texel/' },
                { name: 'Alkmaar', link: '/gevelreclame-alkmaar/' },
                { name: 'Lelystad', link: '/signing-lelystad/' },
                { name: 'Almere', link: '/signing-almere/' },
                { name: 'West-Friesland', link: '/signing-west-friesland/' },
                { name: 'IJsselmeer', link: '/bootbelettering-ijsselmeer/' },
                { name: 'Noord-Holland', link: '/interieur-signing-noord-holland/' },
              ].map((location) => (
                <a
                  key={location.name}
                  href={location.link}
                  className="bg-white rounded-lg p-4 text-center shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <span className="text-gray-900 font-medium">{location.name}</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <FAQ
          title="Veelgestelde Vragen"
          faqs={homeFAQs}
        />

        <CTA
          title="Klaar om uw merk te versterken?"
          subtitle="Vraag vandaag nog gratis advies aan"
        />
      </main>
      <Footer />
    </>
  );
}
