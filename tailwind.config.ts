import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['var(--font-madellin)', 'Outfit', 'system-ui', 'sans-serif'],
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-dm-mono)', 'monospace'],
      },
      colors: {
        bg: '#FAFAF7',
        ink: {
          DEFAULT: '#1A1A1A',
          80: '#333330',
          60: '#5A5A55',
          40: '#8A8A85',
          20: '#C0C0BA',
          10: '#E8E8E3',
          '05': '#F2F2ED',
        },
        blush: {
          light: '#F7ECE7',
          DEFAULT: '#F0D9D0',
          vivid: '#E8A990',
          deep: '#C49585',
        },
        sage: {
          light: '#E4EBE6',
          DEFAULT: '#C8D5CC',
          vivid: '#7DB88A',
          deep: '#5A8264',
        },
        mist: {
          light: '#E6EAF0',
          DEFAULT: '#CDD5DE',
          vivid: '#7BA3C4',
          deep: '#5D7A93',
        },
        cream: {
          light: '#F6F4EC',
          DEFAULT: '#EDE8D8',
          vivid: '#C4B88A',
          deep: '#9A8E6E',
        },
        lavender: {
          light: '#EDE9F3',
          DEFAULT: '#DDD5E8',
          vivid: '#A48BBF',
          deep: '#7B6B8A',
        },
        peach: {
          light: '#FAE8E0',
          DEFAULT: '#F5D5C8',
          vivid: '#F0A080',
          deep: '#D4856B',
        },
      },
      animation: {
        'bounce-slow': 'bounceChevron 2s ease-in-out infinite',
      },
      keyframes: {
        bounceChevron: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(8px)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
