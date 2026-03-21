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
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        heading: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        mono: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        "2xs": ["10px", { lineHeight: "14px" }],
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
        // Semantic UI tokens
        "border-subtle": "hsl(var(--border-subtle))",
        "text-placeholder": "hsl(var(--text-placeholder))",
        "text-tertiary": "hsl(var(--text-tertiary))",
        "bg-hover": "hsl(var(--bg-hover))",
        "bg-subtle": "hsl(var(--bg-subtle))",
        // (oude pastel palette verwijderd — vervangen door mod-* kleuren)
        // DOEN rebrand — nieuwe kleuren
        flame: {
          DEFAULT: '#F15025',
          light: '#FDE8E2',
          border: '#F5C4B4',
          text: '#C03A18',
        },
        petrol: {
          DEFAULT: '#1A535C',
          light: '#E2F0F0',
          border: '#B8D8DA',
        },
        ink: '#191919',
        'bg-page': '#FAFAF8',
        warm: '#F4F2EE',
        sand: '#E6E4E0',
        'text-sec': '#5A5A55',
        'muted-hex': '#A0A098',
        // Module kleuren — DOEN
        'mod-projecten': {
          DEFAULT: '#1A535C',
          light: '#E2F0F0',
          border: '#B8D8DA',
          text: '#1A535C',
        },
        'mod-offertes': {
          DEFAULT: '#F15025',
          light: '#FDE8E2',
          border: '#F5C4B4',
          text: '#C03A18',
        },
        'mod-facturen': {
          DEFAULT: '#2D6B48',
          light: '#E4F0EA',
          border: '#C0DBCC',
          text: '#2D6B48',
        },
        'mod-klanten': {
          DEFAULT: '#3A6B8C',
          light: '#E5ECF6',
          border: '#C0D0EA',
          text: '#2A5580',
        },
        'mod-planning': {
          DEFAULT: '#9A5A48',
          light: '#F2E8E5',
          border: '#E0CFC8',
          text: '#7A4538',
        },
        'mod-werkbonnen': {
          DEFAULT: '#C44830',
          light: '#FAE5E0',
          border: '#EDD0C5',
          text: '#943520',
        },
        'mod-taken': {
          DEFAULT: '#5A5A55',
          light: '#EEEEED',
          border: '#D8D8D5',
          text: '#4A4A45',
        },
        'mod-email': {
          DEFAULT: '#6A5A8A',
          light: '#EEE8F5',
          border: '#D8CCE8',
          text: '#5A4A78',
        },
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
      transitionDuration: {
        fast: "var(--duration-fast)",
        normal: "var(--duration-normal)",
        slow: "var(--duration-slow)",
      },
      transitionTimingFunction: {
        "out-expo": "var(--ease-out)",
        "spring": "var(--ease-spring)",
        "smooth": "var(--ease-smooth)",
      },
      boxShadow: {
        "elevation-xs": "var(--shadow-xs)",
        "elevation-sm": "var(--shadow-sm)",
        "elevation-md": "var(--shadow-md)",
        "elevation-lg": "var(--shadow-lg)",
        "elevation-xl": "var(--shadow-xl)",
        "glow": "var(--shadow-glow)",
        "inner-light": "var(--shadow-inner-light)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
      },
      keyframes: {
        "stagger-item": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "count-up": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
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
        "spring-in": {
          "0%": { opacity: "0", transform: "scale(0.9) translateY(8px)" },
          "60%": { opacity: "1", transform: "scale(1.02) translateY(-2px)" },
          "100%": { transform: "scale(1) translateY(0)" },
        },
        "slide-up-spring": {
          "0%": { opacity: "0", transform: "translateY(16px) scale(0.98)" },
          "70%": { opacity: "1", transform: "translateY(-3px) scale(1.005)" },
          "100%": { transform: "translateY(0) scale(1)" },
        },
        "number-tick": {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "60%": { transform: "translateY(-6%)" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(26,83,92,0.0)" },
          "50%": { boxShadow: "0 0 24px 4px rgba(26,83,92,0.08)" },
        },
        "shimmer-premium": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "stagger-item": "stagger-item 0.3s var(--ease-out) both",
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
        "spring-in": "spring-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "slide-up-spring": "slide-up-spring 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "number-tick": "number-tick 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "shimmer-premium": "shimmer-premium 2.5s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
