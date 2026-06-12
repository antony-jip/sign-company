import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-black/10 bg-ink text-canvas">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-4">
        <div>
          <p className="font-serif text-xl">Kunstdoekje<span className="text-accent">.</span></p>
          <p className="mt-3 text-sm text-canvas/60">
            Wisselbare kunstdoeken op luxe stof. Eén lijst, eindeloos wisselen.
          </p>
        </div>

        <div>
          <p className="text-sm font-medium text-canvas/90">Shop</p>
          <ul className="mt-3 space-y-2 text-sm text-canvas/60">
            <li><Link href="/shop" className="hover:text-canvas">Alle kunstdoeken</Link></li>
            <li><Link href="/eigen-foto" className="hover:text-canvas">Eigen foto</Link></li>
            <li><Link href="/maatwerk" className="hover:text-canvas">Maatwerk</Link></li>
            <li><Link href="/hoe-het-werkt" className="hover:text-canvas">Hoe het werkt</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-medium text-canvas/90">Zakelijk</p>
          <ul className="mt-3 space-y-2 text-sm text-canvas/60">
            <li><Link href="/zakelijk" className="hover:text-canvas">Voor bedrijven</Link></li>
            <li><Link href="/contact" className="hover:text-canvas">Contact</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-medium text-canvas/90">Contact</p>
          <ul className="mt-3 space-y-2 text-sm text-canvas/60">
            <li>info@kunstdoekje.nl</li>
            <li>+31 (0)85 060 8476</li>
            <li>Enkhuizen</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-canvas/10 px-6 py-6 text-center text-xs text-canvas/40">
        © {new Date().getFullYear()} Kunstdoekje — Alle rechten voorbehouden
      </div>
    </footer>
  )
}
