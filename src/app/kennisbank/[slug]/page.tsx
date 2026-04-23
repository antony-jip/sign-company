import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import ScrollProgress from '@/components/ScrollProgress'
import Footer from '@/components/Footer'
import ArticleLayout from '@/components/kennisbank/ArticleLayout'
import { articles, getArticleBySlug } from '@/data/kennisbank/articles'

export async function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const article = getArticleBySlug(params.slug)
  if (!article) return { title: 'Niet gevonden | doen.' }

  return {
    title: `${article.title} | Kennisbank | doen.`,
    description: article.excerpt,
  }
}

export default function KennisbankArticlePage({ params }: { params: { slug: string } }) {
  const article = getArticleBySlug(params.slug)
  if (!article) notFound()

  return (
    <>
      <ScrollProgress />
      <Navbar />
      <main id="main-content">
        <ArticleLayout article={article} />
      </main>
      <Footer />
    </>
  )
}
