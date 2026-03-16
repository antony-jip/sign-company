'use client';

import { useInView } from '@/hooks/useInView';

const dotPositions = [
  { cy: 150, color: '#E8A990' },  // ember — offerte
  { cy: 450, color: '#A48BBF' },  // lavender — werkbon
  { cy: 750, color: '#7DB88A' },  // sage — factuur
];

export default function FlowLine() {
  const { ref, isInView } = useInView('0px');

  return (
    <div ref={ref} className="hidden lg:block absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-24 pointer-events-none">
      <svg
        viewBox="0 0 96 900"
        fill="none"
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="flowGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E8A990" />
            <stop offset="50%" stopColor="#A48BBF" />
            <stop offset="100%" stopColor="#7DB88A" />
          </linearGradient>
        </defs>

        {/* Background line — ink-10 */}
        <path
          d="M48 0 C48 80, 68 130, 48 200 S28 330, 48 400 S68 530, 48 600 S28 730, 48 800 S48 870, 48 900"
          stroke="#E8E8E3"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />

        {/* Colored line — gradient + glow */}
        <path
          d="M48 0 C48 80, 68 130, 48 200 S28 330, 48 400 S68 530, 48 600 S28 730, 48 800 S48 870, 48 900"
          stroke="url(#flowGrad)"
          strokeWidth="2.5"
          fill="none"
          className={`flow-line-path ${isInView ? 'visible' : ''}`}
          strokeLinecap="round"
          style={{ filter: 'blur(3px)' }}
        />

        {/* Sharp colored line on top */}
        <path
          d="M48 0 C48 80, 68 130, 48 200 S28 330, 48 400 S68 530, 48 600 S28 730, 48 800 S48 870, 48 900"
          stroke="url(#flowGrad)"
          strokeWidth="2.5"
          fill="none"
          className={`flow-line-path ${isInView ? 'visible' : ''}`}
          strokeLinecap="round"
        />

        {/* Dots — outer (bg fill) + inner (color fill) */}
        {dotPositions.map((dot, i) => (
          <g
            key={i}
            style={{
              opacity: isInView ? 1 : 0,
              transition: `opacity 0.6s ease ${0.6 + i * 0.6}s`,
            }}
          >
            <circle cx="48" cy={dot.cy} r="10" fill="#FAFAF7" stroke={dot.color} strokeWidth="2.5" />
            <circle cx="48" cy={dot.cy} r="4" fill={dot.color} />
          </g>
        ))}
      </svg>
    </div>
  );
}
