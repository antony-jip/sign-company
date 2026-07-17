import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ArticleLayout from '@/components/kennisbank/ArticleLayout'
import JsonLd from '@/components/JsonLd'
import { buildArticleSchema, buildBreadcrumbSchema } from '@/lib/structured-data'
import { pageMetadata } from '@/lib/seo'
import { articles, getArticleBySlug } from '@/data/kennisbank/articles'

export async function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const article = getArticleBySlug(params.slug)
  if (!article) return { title: 'Niet gevonden | doen.' }

  return pageMetadata({
    title: `${article.title} | Kennisbank | doen.`,
    description: article.excerpt,
    path: `/kennisbank/${article.slug}`,
  })
}

export default function KennisbankArticlePage({ params }: { params: { slug: string } }) {
  const article = getArticleBySlug(params.slug)
  if (!article) notFound()

  const articleSchema = buildArticleSchema(article)
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Kennisbank', path: '/kennisbank' },
    { name: article.title, path: `/kennisbank/${article.slug}` },
  ])

  return (
    <>
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumb} />
      <Navbar />
      <main id="main-content">
        <ArticleLayout article={article} />
      </main>
      <Footer />
    </>
  )
}
