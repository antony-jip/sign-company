import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import ScrollProgress from '@/components/ScrollProgress'
import Footer from '@/components/Footer'
import { articles, CATEGORY_ORDER } from '@/data/kennisbank/articles'
import type { Article, Category } from '@/data/kennisbank/articles'

export const metadata: Metadata = {
  title: 'Kennisbank | doen.',
  description:
    'Alles wat je moet weten over doen. Per module uitgelegd. Van aan de slag tot geavanceerde tips.',
}

const PETROL = '#1A535C'
const FLAME = '#F15025'
const MUTED = '#6B6B66'
const MUTED_SOFT = '#9B9B95'

export default function KennisbankPage() {
  return (
    <>
      <ScrollProgress />
      <Navbar />
      <main id="main-content" className="pt-28 md:pt-36 pb-20 md:pb-32">
        <div className="container-site">
          {/* Hero */}
          <div className="max-w-3xl mb-16 md:mb-20">
            <p
              className="font-mono text-[12px] font-bold tracking-[0.2em] uppercase mb-5"
              style={{ color: FLAME }}
            >
              Kennisbank
            </p>
            <h1
              className="font-heading text-[44px] md:text-[64px] font-extrabold tracking-[-2.5px] leading-[0.98] mb-6"
              style={{ color: PETROL }}
            >
              Alles over doen
              <span style={{ color: FLAME }}>.</span>
              <br />
              <span style={{ color: MUTED_SOFT }}>Per module uitgelegd</span>
              <span style={{ color: FLAME }}>.</span>
            </h1>
            <p className="text-[17px] md:text-[19px] leading-relaxed max-w-2xl" style={{ color: MUTED }}>
              Zoek je een antwoord? Begin hier. Per module de belangrijkste uitleg,
              praktijkvoorbeelden en tips. Niet gevonden wat je zoekt?{' '}
              <Link href="/contact" className="font-semibold underline decoration-2 underline-offset-2 hover:opacity-70 transition-opacity" style={{ color: PETROL, textDecorationColor: FLAME }}>
                Stel je vraag
              </Link>
              .
            </p>
          </div>

          {/* Categories grid */}
          <div className="space-y-16">
            {CATEGORY_ORDER.map((category) => {
              const categoryArticles = articles.filter((a) => a.category === category)
              return (
                <CategoryBlock
                  key={category}
                  category={category}
                  articles={categoryArticles}
                />
              )
            })}
          </div>

          {/* Footer CTA */}
          <div
            className="mt-24 pt-12 text-center"
            style={{ borderTop: '1px solid rgba(26,83,92,0.08)' }}
          >
            <p className="text-[14px] mb-4" style={{ color: MUTED }}>
              Nog niks gevonden? We helpen je persoonlijk.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 font-semibold text-[14px] text-white px-6 h-12 rounded-xl transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: FLAME, boxShadow: '0 4px 14px rgba(241,80,37,0.25)' }}
            >
              <span>Neem contact op</span>
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

function CategoryBlock({ category, articles }: { category: Category; articles: Article[] }) {
  const hasArticles = articles.length > 0

  return (
    <section>
      <div className="flex items-baseline justify-between mb-6" style={{ borderBottom: '1px solid rgba(26,83,92,0.08)', paddingBottom: '12px' }}>
        <h2
          className="font-heading text-[22px] md:text-[26px] font-extrabold tracking-[-0.5px]"
          style={{ color: PETROL }}
        >
          {category}
          <span style={{ color: FLAME }}>.</span>
        </h2>
        <p className="font-mono text-[11px] font-bold tracking-[0.14em] uppercase" style={{ color: MUTED_SOFT }}>
          {articles.length} {articles.length === 1 ? 'artikel' : 'artikelen'}
        </p>
      </div>

      {hasArticles ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {articles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      ) : (
        <EmptyCategory category={category} />
      )}
    </section>
  )
}

function ArticleCard({ article }: { article: Article }) {
  return (
    <Link href={`/kennisbank/${article.slug}`} className="group block">
      <div
        className="rounded-2xl p-6 md:p-7 h-full transition-all duration-300 group-hover:-translate-y-1"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid rgba(26,83,92,0.08)',
          boxShadow: '0 1px 3px rgba(26,83,92,0.04)',
        }}
      >
        <h3
          className="font-heading text-[18px] md:text-[20px] font-bold tracking-tight leading-snug mb-2 transition-colors"
          style={{ color: PETROL }}
        >
          {article.title}
          <span style={{ color: FLAME }}>.</span>
        </h3>
        <p className="text-[14px] leading-[1.6] mb-4" style={{ color: MUTED }}>
          {article.excerpt}
        </p>
        <div className="flex items-center gap-3 text-[11px] font-mono" style={{ color: MUTED_SOFT }}>
          <span>{article.readingTime} min</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1 transition-all duration-200 group-hover:gap-2" style={{ color: FLAME }}>
            Lees artikel
            <span aria-hidden>→</span>
          </span>
        </div>
      </div>
    </Link>
  )
}

function EmptyCategory({ category }: { category: Category }) {
  return (
    <div
      className="rounded-2xl p-6 md:p-7 text-center"
      style={{
        backgroundColor: 'rgba(26,83,92,0.03)',
        border: '1px dashed rgba(26,83,92,0.15)',
      }}
    >
      <p className="text-[14px] mb-1" style={{ color: MUTED }}>
        <span className="font-semibold" style={{ color: PETROL }}>{category}</span> — artikel onderweg.
      </p>
      <p className="text-[12px]" style={{ color: MUTED_SOFT }}>
        Nu al een vraag?{' '}
        <Link href="/contact" className="underline decoration-2 underline-offset-2 transition-opacity hover:opacity-70" style={{ color: PETROL, textDecorationColor: FLAME }}>
          Stuur ons een bericht
        </Link>
        .
      </p>
    </div>
  )
}
