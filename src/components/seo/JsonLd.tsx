/**
 * Rendert een JSON-LD <script> in de pagina. Server-component-vriendelijk.
 * Geef een compleet schema-object door (bv. via `jsonLdGraph(...)`).
 */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // JSON-LD is statisch en wordt server-side geserialiseerd; veilig.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
