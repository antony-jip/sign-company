'use client';

import { useInView } from '@/hooks/useInView';

export default function FlowLine() {
  const { ref, isInView } = useInView();

  return (
    <div ref={ref} className="hidden lg:block absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-20 pointer-events-none">
      <svg
        viewBox="0 0 80 900"
        fill="none"
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="flowGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E8A990" />
            <stop offset="50%" stopColor="#A48BBF" />
            <stop offset="100%" stopColor="#7DB88A" />
          </linearGradient>
        </defs>

        {/* Flowing curve */}
        <path
          d="M40 0 C40 80, 60 120, 40 200 S20 320, 40 400 S60 520, 40 600 S20 720, 40 800 S40 860, 40 900"
          stroke="url(#flowGradient)"
          strokeWidth="2"
          fill="none"
          className={`flow-line-path ${isInView ? 'visible' : ''}`}
          strokeLinecap="round"
        />

        {/* Dots at step positions */}
        {[150, 450, 750].map((y, i) => (
          <circle
            key={i}
            cx="40"
            cy={y}
            r="5"
            fill={['#E8A990', '#A48BBF', '#7DB88A'][i]}
            className="flow-dot"
            style={{
              opacity: isInView ? 1 : 0,
              transition: `opacity 0.6s ease ${0.8 + i * 0.3}s`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </svg>
    </div>
  );
}
