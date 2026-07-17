import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

/**
 * Presentatiewrapper voor juridische pagina's (privacy, cookies, voorwaarden).
 * Server-component, geen interactie. Content wordt als children meegegeven en
 * gestyled via `.legal-prose` in globals.css.
 */
export default function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string
  updated: string
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      <main id="main-content" className="bg-bg pt-28 md:pt-40 pb-14 md:pb-32">
        <div className="container-site">
          <div className="max-w-[760px]">
            <h1
              className="font-heading font-bold text-petrol leading-[1.02] mb-3"
              style={{ fontSize: 'clamp(32px, 4.4vw, 56px)', letterSpacing: '-0.03em', textWrap: 'balance' }}
            >
              {title}
              <span className="text-flame">.</span>
            </h1>
            <p className="text-[14px] text-muted mb-10 md:mb-14">Laatst bijgewerkt: {updated}</p>
            <div className="legal-prose">{children}</div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
