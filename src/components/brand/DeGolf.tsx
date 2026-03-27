export default function DeGolf({
  className = '',
  flip = false,
}: {
  className?: string
  flip?: boolean
}) {
  return (
    <div
      className={`w-full overflow-hidden pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      <div
        className="h-px w-full max-w-4xl mx-auto"
        style={{
          background: flip
            ? 'linear-gradient(90deg, transparent, #1A535C20, #F1502530, #1A535C20, transparent)'
            : 'linear-gradient(90deg, transparent, #1A535C15, #F1502520, #1A535C15, transparent)',
        }}
      />
    </div>
  )
}
