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
        blush: {
          DEFAULT: '#F0D9D0',
          light: '#F7ECE7',
          deep: '#C49585',
        },
        sage: {
          DEFAULT: '#C8D5CC',
          light: '#E4EBE6',
          deep: '#5A8264',
        },
        mist: {
          DEFAULT: '#CDD5DE',
          light: '#E6EAF0',
          deep: '#5D7A93',
        },
        cream: {
          DEFAULT: '#EDE8D8',
          light: '#F6F4EC',
          deep: '#9A8E6E',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
