import Link from 'next/link'

export default function Logo({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-baseline font-heading text-2xl tracking-tighter ${className}`}>
      <span className="text-petrol">doen</span>
      <span className="text-flame">.</span>
    </Link>
  )
}
