import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { articles, CATEGORY_ORDER } from '@/data/kennisbank/articles'
import type { Article, Category } from '@/data/kennisbank/articles'

export const metadata: Metadata = {
  title: 'Kennisbank | doen.',
  description:
    'Alles wat je moet weten over doen. Per module uitgelegd. Van aan de slag tot geavanceerde tips.',
  alternates: { canonical: '/kennisbank' },
}

export default function KennisbankPage() {
  const filledCategories = CATEGORY_ORDER.filter((category) =>
    articles.some((a) => a.category === category)
  )

  return (
    <>
      <Navbar />
      <main id="main-content" className="bg-bg pt-28 md:pt-44 pb-14 md:pb-32">
        <div className="container-site">
          {/* Hero */}
          <div className="max-w-3xl mb-10 md:mb-24">
            <h1
              className="font-heading font-bold leading-[0.98] mb-4 md:mb-6"
              style={{ fontSize: 'clamp(36px, 5.6vw, 76px)', letterSpacing: '-0.035em', textWrap: 'balance' }}
            >
              <span className="block text-petrol">
                Alles over doen<span className="text-flame">.</span>
              </span>
              <span className="block text-muted">
                Per module uitgelegd<span className="text-flame">.</span>
              </span>
            </h1>
            <p className="text-[16px] md:text-[17px] leading-[1.6] text-ink max-w-2xl">
              Zoek je een antwoord? Begin hier. Per module de belangrijkste
              uitleg, praktijkvoorbeelden en tips uit het vak.
            </p>
          </div>

          {/* Categorieën met artikelen */}
          <div className="space-y-10 md:space-y-20">
            {filledCategories.map((category) => (
              <CategoryBlock
                key={category}
                category={category}
                articles={articles.filter((a) => a.category === category)}
              />
            ))}
          </div>

          {/* Afsluiter */}
          <div className="mt-14 md:mt-24 pt-8 md:pt-12 border-t border-petrol/10 flex flex-col md:flex-row md:items-center justify-between gap-5 md:gap-6">
            <p className="text-[15px] md:text-[16px] text-muted">
              Niet gevonden wat je zoekt? We helpen je persoonlijk.
            </p>
            <Link
              href="/contact"
              className="group inline-flex items-center gap-2 self-start text-[15px] font-semibold text-white bg-flame px-7 h-[54px] rounded-[6px] transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Neem contact op</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

function CategoryBlock({ category, articles }: { category: Category; articles: Article[] }) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-6 mb-2">
        <h2
          className="font-heading font-bold text-petrol leading-[1.05]"
          style={{ fontSize: 'clamp(24px, 3vw, 32px)', letterSpacing: '-0.03em' }}
        >
          {category}
          <span className="text-flame">.</span>
        </h2>
        <p className="hidden md:block text-[15px] text-muted shrink-0">
          {articles.length} {articles.length === 1 ? 'artikel' : 'artikelen'}
        </p>
      </div>

      <ul className="border-t border-petrol/10">
        {articles.map((article) => (
          <li key={article.slug} className="border-b border-petrol/10">
            <Link
              href={`/kennisbank/${article.slug}`}
              className="group grid grid-cols-1 md:grid-cols-[1fr_auto] items-baseline gap-x-12 gap-y-1.5 py-5 md:py-6"
            >
              <span>
                <span className="block font-heading text-[19px] md:text-[21px] font-bold text-ink leading-snug transition-colors duration-200 group-hover:text-petrol">
                  {article.title}
                  <span className="text-flame">.</span>
                </span>
                <span className="block mt-1.5 text-[15px] leading-[1.6] text-muted max-w-2xl">
                  {article.excerpt}
                </span>
              </span>
              <span className="flex items-baseline gap-3 text-[15px] text-muted">
                <span>{article.readingTime} min</span>
                <span
                  aria-hidden
                  className="text-flame opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0"
                >
                  →
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
