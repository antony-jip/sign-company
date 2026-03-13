import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#FAFAF7',
        blush: {
          DEFAULT: '#F0D9D0',
          light: '#F7ECE7',
          deep: '#C49585',
          vivid: '#E8A990',
        },
        sage: {
          DEFAULT: '#C8D5CC',
          light: '#E4EBE6',
          deep: '#5A8264',
          vivid: '#7DB88A',
        },
        mist: {
          DEFAULT: '#CDD5DE',
          light: '#E6EAF0',
          deep: '#5D7A93',
          vivid: '#7BA3C4',
        },
        cream: {
          DEFAULT: '#EDE8D8',
          light: '#F6F4EC',
          deep: '#9A8E6E',
          vivid: '#C4B88A',
        },
        lavender: {
          DEFAULT: '#DDD5E8',
          light: '#EDE9F3',
          deep: '#7B6B8A',
          vivid: '#A48BBF',
        },
        peach: {
          DEFAULT: '#F5D5C8',
          light: '#FAE8E0',
          deep: '#D4856B',
          vivid: '#F0A080',
        },
        ember: {
          DEFAULT: '#E8A990',
          light: '#F0D9D0',
          deep: '#C49585',
        },
      },
      fontFamily: {
        heading: ['var(--font-donatto)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-dm-mono)', 'monospace'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 4s ease-in-out infinite',
        'gradient-x': 'gradientX 8s ease infinite',
        'bounce-slow': 'bounceChevron 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
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
