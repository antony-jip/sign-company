import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center px-6">
          <p className="font-mono text-6xl md:text-8xl text-petrol/20 mb-6">404</p>
          <h1 className="font-heading text-3xl md:text-4xl text-petrol tracking-tight mb-4">
            Dit hadden we niet moeten doen<span className="text-flame">.</span>
          </h1>
          <p className="text-muted mb-8 max-w-sm mx-auto">
            Deze pagina bestaat niet. Misschien een typfout, misschien een oud
            linkje. Hoe dan ook — terug naar veilig.
          </p>
          <Link
            href="/"
            className="inline-block bg-flame text-white font-semibold text-sm px-6 py-3 rounded-lg hover:bg-flame/90 transition-colors duration-200"
          >
            Terug naar veilig.
          </Link>
        </div>
      </main>
      <Footer />
    </>
  )
}
