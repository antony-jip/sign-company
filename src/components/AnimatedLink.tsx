import Link from 'next/link'

type Props = {
  href: string
  children: React.ReactNode
  className?: string
  accent?: string
  external?: boolean
}

/**
 * Text link met onder-sweep animatie: lijn groeit van 0 → 100% bij hover.
 * Gebruikt currentColor standaard; optioneel een brand-accent als aparte lijn-kleur.
 */
export default function AnimatedLink({
  href,
  children,
  className = '',
  accent,
  external = false,
}: Props) {
  const content = (
    <span className="inline-block relative group">
      <span className="relative z-10">{children}</span>
      <span
        aria-hidden
        className="absolute left-0 bottom-0 w-full h-[1.5px] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ backgroundColor: accent || 'currentColor' }}
      />
    </span>
  )

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-block ${className}`}
      >
        {content}
      </a>
    )
  }

  return (
    <Link href={href} className={`inline-block ${className}`}>
      {content}
    </Link>
  )
}
