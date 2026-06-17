import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import ScrollProgress from '@/components/ScrollProgress'
import Footer from '@/components/Footer'
import ArticleLayout from '@/components/kennisbank/ArticleLayout'
import { articles, getArticleBySlug, DEFAULT_AUTHOR } from '@/data/kennisbank/articles'
import JsonLd from '@/components/seo/JsonLd'
import { jsonLdGraph, articleSchema, breadcrumbSchema } from '@/lib/seo'

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

  const articleUrl = `/kennisbank/${article.slug}`

  return (
    <>
      <JsonLd
        data={jsonLdGraph(
          articleSchema({
            title: article.title,
            excerpt: article.excerpt,
            url: articleUrl,
            updatedAt: article.updatedAt,
            author: article.author ?? DEFAULT_AUTHOR,
          }),
          breadcrumbSchema([
            { name: 'Home', url: '/' },
            { name: 'Kennisbank', url: '/kennisbank' },
            { name: article.title, url: articleUrl },
          ]),
        )}
      />
      <ScrollProgress />
      <Navbar />
      <main id="main-content">
        <ArticleLayout article={article} />
      </main>
      <Footer />
    </>
  )
}
