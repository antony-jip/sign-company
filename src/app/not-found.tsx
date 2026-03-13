import Link from 'next/link';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen flex items-center justify-center bg-bg pt-20">
        <div className="text-center px-6">
          <h1 className="font-heading text-ink" style={{ fontSize: 'clamp(60px, 8vw, 100px)', fontWeight: 900, letterSpacing: '-3px', lineHeight: 1 }}>
            404
          </h1>
          <h2 className="text-[19px] font-bold text-ink mt-4 mb-3">
            Pagina niet gevonden
          </h2>
          <p className="text-[16px] text-ink-60 mb-8 max-w-md mx-auto leading-[1.7]">
            De pagina die je zoekt bestaat niet of is verplaatst.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center bg-ink hover:bg-ink-80 text-white font-semibold px-7 py-3 rounded-full text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(0,0,0,0.15)]"
          >
            Naar homepage
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
