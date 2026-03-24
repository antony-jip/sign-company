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
      <svg
        viewBox="0 0 1440 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-auto block ${flip ? 'rotate-180' : ''}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="golf-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1A535C" />
            <stop offset="40%" stopColor="#1A535C" />
            <stop offset="100%" stopColor="#F15025" />
          </linearGradient>
        </defs>
        <path
          d="M0,60 C180,120 360,0 540,60 C720,120 900,0 1080,60 C1260,120 1350,40 1440,60"
          stroke="url(#golf-gradient)"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  )
}
