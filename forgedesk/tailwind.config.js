/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Outfit', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Outfit', 'system-ui', 'sans-serif'],
        mono: ['"DM Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        outfit: ['"Outfit"', 'sans-serif'],
        serif: ['"DM Serif Display"', 'Georgia', 'serif'],
      },
      letterSpacing: {
        'label': '0.06em',
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "wm-hover": "hsl(var(--wm-hover))",
        "wm-light": "hsl(var(--wm-light))",
        "wm-pale": "hsl(var(--wm-pale))",
        // Pastel palette — FORGEdesk signature
        blush: {
          DEFAULT: '#EDCFC4',
          deep: '#B8806A',
        },
        sage: {
          DEFAULT: '#B8CCBE',
          deep: '#4E7A58',
        },
        mist: {
          DEFAULT: '#BCCAD6',
          deep: '#4A6E8A',
        },
        cream: {
          DEFAULT: '#E2DCCB',
          deep: '#8A7E60',
        },
        lavender: {
          DEFAULT: '#D5CCE6',
          deep: '#6B5B8A',
        },
        peach: {
          DEFAULT: '#F5D5C8',
          deep: '#C4735A',
        },
        // Module accent kleuren (per-module identity)
        'mod-projecten': '#7EB5A6',
        'mod-klanten': '#8BAFD4',
        'mod-offertes': '#9B8EC4',
        'mod-facturen': '#E8866A',
        'mod-werkbonnen': '#D4836A',
        'mod-taken': '#C4A882',
        'mod-planning': '#7EB5A6',
        'mod-email': '#8BAFD4',
        // Liftoff-inspired landing page palette
        'lf-bg': '#FAFAF8',
        'lf-fg': '#1a1a1a',
        'lf-coral': '#E8866A',
        'lf-sage': '#7EB5A6',
        'lf-gold': '#C4A882',
        'lf-purple': '#9B8EC4',
        'lf-blue': '#8BAFD4',
        'lf-border': '#E8E5DE',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "marquee": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "orb-float": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(30px, -20px) scale(1.05)" },
          "66%": { transform: "translate(-20px, 15px) scale(0.95)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          "0%": { opacity: "0", transform: "translateX(-40px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(40px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "float": "float 5s ease-in-out infinite",
        "float-slow": "float 6s ease-in-out infinite",
        "float-fast": "float 4s ease-in-out infinite",
        "marquee": "marquee 30s linear infinite",
        "pulse-soft": "pulse-soft 3s ease-in-out infinite",
        "shimmer": "shimmer 3s ease-in-out infinite",
        "orb-float": "orb-float 12s ease-in-out infinite",
        "orb-float-slow": "orb-float 18s ease-in-out infinite",
        "fade-up": "fade-up 0.7s cubic-bezier(.4,0,.2,1) forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
