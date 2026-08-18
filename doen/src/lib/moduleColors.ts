/**
 * Module color hex values for inline style usage.
 * These match the mod-* colors in tailwind.config.js.
 * For Tailwind classes, use bg-mod-offertes-light, text-mod-facturen-text, etc.
 */
export const MODULE_COLORS = {
  offertes: { DEFAULT: '#F15025', light: '#FDE8E2', text: '#C03A18', border: '#F5C4B4' },
  facturen: { DEFAULT: '#2D6B48', light: '#E4F0EA', text: '#2D6B48', border: '#C0DBCC' },
  klanten: { DEFAULT: '#3A6B8C', light: '#E5ECF6', text: '#2A5580', border: '#C0D0EA' },
  projecten: { DEFAULT: '#1A535C', light: '#E2F0F0', text: '#1A535C', border: '#B8D8DA' },
  planning: { DEFAULT: '#9A5A48', light: '#F2E8E5', text: '#7A4538', border: '#E0CFC8' },
  werkbonnen: { DEFAULT: '#C44830', light: '#FAE5E0', text: '#943520', border: '#EDD0C5' },
  taken: { DEFAULT: '#5A5A55', light: '#EEEEED', text: '#4A4A45', border: '#D8D8D5' },
  email: { DEFAULT: '#6A5A8A', light: '#EEE8F5', text: '#5A4A78', border: '#D8CCE8' },
} as const
