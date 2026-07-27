import type { Metadata } from 'next'
import { ArrowDown, ArrowRight } from 'lucide-react'
import { paginaMeta } from '@/lib/metadata'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CTASection from '@/components/home/CTASection'

export const metadata: Metadata = paginaMeta({
  title: 'Geheugen: Daan onthoudt je klanten | doen.',
  description:
    'Het PO-nummer van de aannemer, de hoogwerker bij dat ene pand, montage alleen op maandag. Daan onthoudt het en heel doen. handelt ernaar. Elke week een beetje slimmer.',
  pad: '/features/geheugen',
})

/* ─────────────────────────────────────────────────────────────────
   Wat het onthoudt en wat er daardoor verandert. Eén regel per rij,
   hairline-lijst volgens het canon, geen kaart-grid.
   ───────────────────────────────────────────────────────────────── */

const voorbeelden = [
  {
    regel: 'Bouwbedrijf De Vries betaalt niet zonder PO-nummer op de factuur',
    gevolg: 'De factuur gaat pas de deur uit als het PO-nummer erop staat. Scheelt je elke keer twee weken wachten en een belletje.',
  },
  {
    regel: 'Bij het Wilgenhof kan montage alleen maandag, dan is de zaak dicht',
    gevolg: 'Plan je die klus in, dan stelt de planning maandag voor. Niet woensdag, waarna je voor een dichte deur staat.',
  },
  {
    regel: 'Marktstraat 12: hoogwerker nodig, laden via het achterterrein',
    gevolg: 'Staat op de werkbon én in de calculatie van elke volgende klus op dat pand. Je monteur weet het voordat hij vertrekt.',
  },
  {
    regel: 'De huisstijl van Van Dam is PMS 485, niet zomaar rood',
    gevolg: 'Ook als de vorige klus twee jaar terug was, start de nieuwe met de juiste kleur. Geen map doorspitten, geen gok.',
  },
  {
    regel: 'Deze klant wil altijd eerst een digitale proef zien',
    gevolg: 'Er gaat niks naar productie zonder akkoord. De proef-stap staat er vanzelf tussen, ook als een collega de klus oppakt.',
  },
]

/* ─────────────────────────────────────────────────────────────────
   De dagcyclus als flowchart: vier blokken met verbindingslijnen,
   verticaal op mobiel, horizontaal op desktop. De nacht-stap is het
   donkere anker: daar gebeurt het werk dat jou niks kost.
   ───────────────────────────────────────────────────────────────── */

const cyclus = [
  {
    moment: 'Overdag',
    title: 'Jij werkt gewoon',
    body: 'Bellen, mailen, offertes maken. Daan vangt onderweg op wat blijvend is: het PO-nummer, de hoogwerker, de montagedag.',
    donker: false,
    beslispunt: false,
  },
  {
    moment: "'s Nachts",
    title: 'Daan ruimt op',
    body: 'Hij leest de dag terug, checkt of iets echt een patroon is, gooit ruis weg en bundelt dubbelingen. Kost jou niks: geen tijd en geen AI-tegoed.',
    donker: true,
    beslispunt: false,
  },
  {
    moment: "'s Ochtends",
    title: 'Jouw lijstje',
    body: 'Maximaal vijf voorstellen op je dashboard. Even doorheen klikken en je bent klaar.',
    donker: false,
    beslispunt: true,
  },
  {
    moment: 'Daarna',
    title: 'Heel doen. weet het',
    body: 'Offertes, planning, facturen en mails houden er vanaf dat moment rekening mee. Wijs je iets af? Dan is het weg en komt het niet terug.',
    donker: false,
    beslispunt: false,
  },
]

/* Verbindingsstuk tussen twee blokken: lijn + pijl, verticaal op
   mobiel, horizontaal op desktop. Puur decoratief. */
function Verbinding() {
  return (
    <div aria-hidden className="flex flex-col md:flex-row items-center justify-center shrink-0 py-1 md:py-0 md:px-0.5 md:w-9">
      <div className="w-px h-6 md:h-px md:w-full bg-petrol/25" />
      <ArrowDown className="w-3.5 h-3.5 -mt-px text-petrol/40 md:hidden" strokeWidth={2.5} />
      <ArrowRight className="hidden md:block w-3.5 h-3.5 -ml-px text-petrol/40 shrink-0" strokeWidth={2.5} />
    </div>
  )
}

const zekerheden = [
  {
    title: 'Jij houdt de regie',
    body: 'Niks wordt onthouden zonder jouw akkoord. Wat je afwijst is weg en komt niet terug.',
  },
  {
    title: 'Alles staat op de klantkaart',
    body: 'Wat Daan over een klant weet, lees je gewoon terug. Aanpassen of weggooien kan altijd, met één klik.',
  },
  {
    title: 'Van je bedrijf, niet van één hoofd',
    body: 'Een nieuwe collega werkt vanaf dag één alsof hij er al jaren rondloopt. De kennis blijft, ook als iemand vertrekt.',
  },
]

const vragen = [
  {
    vraag: 'Wat als Daan iets verkeerd onthoudt?',
    antwoord:
      'Dan gooi je het weg. Elke regel staat leesbaar op de klantkaart en verdwijnt met één klik. En omdat niks actief wordt zonder jouw akkoord, komt een misser er zelden doorheen.',
  },
  {
    vraag: 'Ziet mijn team dit ook?',
    antwoord:
      'Ja. Wat Daan over een klant weet, weet je hele team. Zo geeft je beste verkoper zijn klantkennis door zonder er iets voor te doen.',
  },
  {
    vraag: 'Wat kost het?',
    antwoord: 'Niks extra. Het geheugen zit in je abonnement, net als Daan zelf.',
  },
]

/* App-mockup van de ochtendlijst. Mono mag hier: het is data ín de app. */
function OchtendlijstMock() {
  return (
    <div className="rounded-[12px] overflow-hidden border border-petrol/10 bg-white shadow-[0_1px_2px_rgba(20,40,40,0.04),0_24px_60px_-32px_rgba(13,52,60,0.35)]">
      <div className="bg-petrol-deep px-5 py-4">
        <p className="text-[14px] font-semibold text-white leading-tight">Vannacht geleerd</p>
        <p className="font-mono text-[11px] mt-1" style={{ color: 'rgba(226,240,241,0.55)' }}>
          3 voorstellen · uit 12 gesprekken
        </p>
      </div>
      {[
        { tekst: 'De Vries: PO-nummer verplicht op elke factuur', bron: 'uit 2 mails' },
        { tekst: 'Marktstraat 12: hoogwerker nodig, laden achterom', bron: 'uit 3 werkbonnen' },
        { tekst: 'Van Dam wil een digitale proef vóór productie', bron: 'uit 2 projecten' },
      ].map((v) => (
        <div key={v.tekst} className="px-5 py-4 border-t border-petrol/10 first:border-t-0">
          <p className="text-[14px] text-ink leading-snug">{v.tekst}</p>
          <p className="font-mono text-[11px] text-muted mt-1">{v.bron}</p>
          <div className="flex gap-2 mt-3" aria-hidden>
            <span className="text-[12px] font-semibold text-white bg-flame px-3.5 py-1.5 rounded-[6px]">
              Aannemen
            </span>
            <span className="text-[12px] font-medium text-muted border border-petrol/15 px-3.5 py-1.5 rounded-[6px]">
              Afwijzen
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function GeheugenPage() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        {/* Hero */}
        <section className="relative overflow-hidden bg-petrol-deep">
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 80% 90% at 50% 0%, rgba(42,111,122,0.5) 0%, rgba(42,111,122,0) 60%)',
            }}
          />
          <div className="container-site relative pt-28 md:pt-44 pb-14 md:pb-24">
            <div className="hero-fade inline-flex items-center gap-2 mb-6">
              <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-[3px] border border-flame text-flame">
                Nieuw
              </span>
              <span className="text-[13px] font-medium" style={{ color: 'rgba(226,240,241,0.82)' }}>
                Onderdeel van Daan, je AI-assistent
              </span>
            </div>
            <h1
              className="hero-line font-heading font-bold text-white leading-[0.97] max-w-3xl"
              style={{ fontSize: 'clamp(44px, 6.4vw, 88px)', letterSpacing: '-0.035em', textWrap: 'balance' }}
            >
              Daan vergeet niks<span className="text-flame">.</span>
            </h1>
            <p
              className="hero-fade mt-6 text-[16px] md:text-[17px] leading-[1.6] max-w-xl"
              style={{ color: 'rgba(226,240,241,0.82)' }}
            >
              Het PO-nummer van de aannemer, de hoogwerker bij dat ene pand, montage alleen op
              maandag. Daan onthoudt het, zodat jij geen tweede rit maakt, geen creditnota stuurt
              en niet twee weken op je geld wacht.
            </p>
            <div className="hero-fade mt-9 flex flex-wrap items-center gap-6">
              <a
                href="https://app.doen.team/register"
                className="group inline-flex items-center gap-2.5 text-[15px] font-semibold text-white bg-flame px-7 h-[54px] rounded-[6px] transition-transform duration-300 hover:scale-[1.02] active:scale-[0.97]"
              >
                <span>Probeer doen. gratis</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.5} />
              </a>
              <p className="text-[13px]" style={{ color: 'rgba(226,240,241,0.55)' }}>
                30 dagen gratis · geen creditcard
              </p>
            </div>
          </div>
        </section>

        {/* De dagcyclus als flowchart */}
        <section className="bg-white">
          <div className="container-site py-14 md:py-28">
            <div className="md:flex md:items-end md:justify-between gap-10 mb-10 md:mb-14">
              <h2
                className="font-heading font-bold text-petrol leading-[1.05] max-w-xl"
                style={{ fontSize: 'clamp(30px, 4vw, 52px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
              >
                Eén dag met geheugen<span className="text-flame">.</span>
              </h2>
              <p className="text-[15px] text-muted max-w-sm mt-4 md:mt-0 leading-[1.6]">
                Geen velden invullen, geen notities bijhouden. Het geheugen draait mee op je werkdag, jij zit er precies één keer tussen.
              </p>
            </div>
            <div className="flex flex-col md:flex-row md:items-stretch">
              {cyclus.map((s, i) => (
                <div key={s.title} className="contents">
                  {i > 0 && <Verbinding />}
                  <div
                    className={
                      s.donker
                        ? 'md:flex-1 rounded-[10px] bg-petrol-deep p-5 md:p-6'
                        : 'md:flex-1 rounded-[10px] bg-bg border border-petrol/10 p-5 md:p-6'
                    }
                  >
                    <p className="text-[13px] font-semibold text-flame mb-2">{s.moment}</p>
                    <h3
                      className={`font-heading text-[18px] md:text-[19px] font-bold leading-tight mb-2 ${
                        s.donker ? 'text-white' : 'text-ink'
                      }`}
                    >
                      {s.title}
                    </h3>
                    <p
                      className={s.donker ? 'text-[14px] leading-[1.6]' : 'text-[14px] text-muted leading-[1.6]'}
                      style={s.donker ? { color: 'rgba(226,240,241,0.82)' } : undefined}
                    >
                      {s.body}
                    </p>
                    {s.beslispunt && (
                      <span className="inline-flex items-center mt-3 px-3 py-1 rounded-full border border-flame text-[12px] font-semibold text-flame">
                        Aannemen of afwijzen
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Voorbeelden */}
        <section className="bg-bg">
          <div className="container-site py-14 md:py-28">
            <div className="md:flex md:items-end md:justify-between gap-10 mb-10 md:mb-14">
              <h2
                className="font-heading font-bold text-petrol leading-[1.05] max-w-xl"
                style={{ fontSize: 'clamp(30px, 4vw, 52px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
              >
                Klein om te onthouden, groot in je week<span className="text-flame">.</span>
              </h2>
              <p className="text-[15px] text-muted max-w-sm mt-4 md:mt-0 leading-[1.6]">
                Elke regel hieronder ben je dit jaar al eens tegengekomen. Als verspilde rit, als creditnota, of als klus die opnieuw moest.
              </p>
            </div>
            <div>
              {voorbeelden.map((v) => (
                <div
                  key={v.regel}
                  className="grid md:grid-cols-2 gap-2 md:gap-10 py-5 border-t border-petrol/10 last:border-b last:border-petrol/10"
                >
                  <p className="text-[16px] md:text-[17px] font-medium text-ink leading-snug">
                    &ldquo;{v.regel}&rdquo;
                  </p>
                  <p className="text-[15px] text-muted leading-[1.6]">{v.gevolg}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Ochtendlijst */}
        <section className="bg-white">
          <div className="container-site py-14 md:py-28">
            <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
              <div>
                <h2
                  className="font-heading font-bold text-petrol leading-[1.05]"
                  style={{ fontSize: 'clamp(30px, 4vw, 52px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
                >
                  Elke ochtend één lijstje<span className="text-flame">.</span>
                </h2>
                <p className="mt-5 text-[15px] md:text-[16px] text-muted leading-[1.65] max-w-lg">
                  Daan onderbreekt je nooit tussendoor. Wat hij leert, verzamelt hij en leg je
                  &rsquo;s ochtends in één keer voor: aannemen of afwijzen, klaar in dertig seconden.
                  Bij elk voorstel staat waar het vandaan komt.
                </p>
                <p className="mt-4 text-[15px] md:text-[16px] text-muted leading-[1.65] max-w-lg">
                  Dat lijstje kost je dertig seconden. Eén vergeten hoogwerker kost je een ochtend,
                  een monteur en een klant die zijn opening zonder gevelbak doet.
                </p>
              </div>
              <OchtendlijstMock />
            </div>
          </div>
        </section>

        {/* Waarom dit telt + zekerheden */}
        <section className="relative overflow-hidden bg-petrol-deep">
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 80% 90% at 50% 0%, rgba(42,111,122,0.5) 0%, rgba(42,111,122,0) 60%)',
            }}
          />
          <div className="container-site relative py-14 md:py-24">
            <h2
              className="font-heading font-bold text-white leading-[1.05] max-w-2xl mb-10 md:mb-14"
              style={{ fontSize: 'clamp(26px, 3.6vw, 44px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
            >
              Hoe langer je doen. gebruikt, hoe beter het je bedrijf kent<span className="text-flame">.</span>
            </h2>
            <div className="grid md:grid-cols-3 gap-x-10 gap-y-8">
              {zekerheden.map((z) => (
                <div key={z.title} className="border-t border-white/15 pt-5">
                  <h3 className="font-heading text-[18px] md:text-[20px] font-bold text-white leading-tight mb-2">
                    {z.title}
                  </h3>
                  <p className="text-[15px] leading-[1.6]" style={{ color: 'rgba(226,240,241,0.82)' }}>
                    {z.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Vragen */}
        <section className="bg-bg">
          <div className="container-site py-14 md:py-28">
            <h2
              className="font-heading font-bold text-petrol leading-[1.05] max-w-xl mb-10 md:mb-14"
              style={{ fontSize: 'clamp(30px, 4vw, 52px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
            >
              Goeie vragen<span className="text-flame">.</span>
            </h2>
            <div className="max-w-3xl">
              {vragen.map((v) => (
                <div key={v.vraag} className="py-6 border-t border-petrol/10 last:border-b last:border-petrol/10">
                  <h3 className="font-heading text-[18px] md:text-[20px] font-bold text-ink leading-tight mb-2">
                    {v.vraag}
                  </h3>
                  <p className="text-[15px] text-muted leading-[1.6]">{v.antwoord}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <CTASection />
      </main>
      <Footer />
    </>
  )
}
