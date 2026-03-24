import Link from 'next/link'

interface LogoProps {
  className?: string
  onPuntClick?: () => void
}

export default function Logo({ className = '', onPuntClick }: LogoProps) {
  return (
    <Link href="/" className={`inline-flex items-baseline font-heading text-2xl tracking-tighter ${className}`}>
      <span className="text-petrol">doen</span>
      <span
        className="text-flame"
        onClick={onPuntClick ? (e) => { e.preventDefault(); onPuntClick() } : undefined}
      >.</span>
    </Link>
  )
}
