// Tijdelijke landingspagina. De volledige frontend (home, shop, configurator,
// cart, checkout) volgt in de volgende stap — de backend staat nu klaar.

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-24">
      <p className="text-sm uppercase tracking-widest text-accent">Kunstdoekje</p>
      <h1 className="mt-3 font-serif text-4xl leading-tight">
        Wisselbare kunstdoeken op luxe stof
      </h1>
      <p className="mt-4 text-ink/70">
        De backend draait: catalogus, prijsmodel (formaat + stof + lijst),
        Mollie-checkout en WooCommerce-import zijn ingericht. De nieuwe
        frontend is de volgende stap.
      </p>

      <ul className="mt-8 space-y-2 text-sm text-ink/60">
        <li>
          <code className="rounded bg-black/5 px-1.5 py-0.5">GET /api/products</code> — catalogus + prijsopties
        </li>
        <li>
          <code className="rounded bg-black/5 px-1.5 py-0.5">POST /api/checkout</code> — order + Mollie-betaling
        </li>
        <li>
          <code className="rounded bg-black/5 px-1.5 py-0.5">POST /api/webhook/mollie</code> — betaalstatus
        </li>
        <li>
          <code className="rounded bg-black/5 px-1.5 py-0.5">POST /api/upload</code> — eigen foto
        </li>
        <li>
          <code className="rounded bg-black/5 px-1.5 py-0.5">POST /api/quote</code> — maatwerk/offerte
        </li>
      </ul>
    </main>
  )
}
