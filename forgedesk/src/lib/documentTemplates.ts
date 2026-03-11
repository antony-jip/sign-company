import type { DocumentStyle, DocumentTemplateId } from '@/types'

// ============ GOOGLE FONTS BESCHIKBAAR ============

export interface FontOption {
  naam: string
  label: string
  categorie: 'sans-serif' | 'serif' | 'display' | 'monospace'
  google_url: string
}

export const BESCHIKBARE_FONTS: FontOption[] = [
  // Sans-serif
  { naam: 'Open Sans', label: 'Open Sans', categorie: 'sans-serif', google_url: 'Open+Sans:wght@400;600;700' },
  { naam: 'Roboto', label: 'Roboto', categorie: 'sans-serif', google_url: 'Roboto:wght@400;500;700' },
  { naam: 'Montserrat', label: 'Montserrat', categorie: 'sans-serif', google_url: 'Montserrat:wght@400;600;700' },
  { naam: 'Lato', label: 'Lato', categorie: 'sans-serif', google_url: 'Lato:wght@400;700' },
  { naam: 'Inter', label: 'Inter', categorie: 'sans-serif', google_url: 'Inter:wght@400;500;600;700' },
  { naam: 'Poppins', label: 'Poppins', categorie: 'sans-serif', google_url: 'Poppins:wght@400;500;600;700' },
  { naam: 'Nunito', label: 'Nunito', categorie: 'sans-serif', google_url: 'Nunito:wght@400;600;700' },
  { naam: 'Source Sans 3', label: 'Source Sans', categorie: 'sans-serif', google_url: 'Source+Sans+3:wght@400;600;700' },
  { naam: 'Raleway', label: 'Raleway', categorie: 'sans-serif', google_url: 'Raleway:wght@400;600;700' },
  { naam: 'Work Sans', label: 'Work Sans', categorie: 'sans-serif', google_url: 'Work+Sans:wght@400;500;600;700' },
  // Serif
  { naam: 'Playfair Display', label: 'Playfair Display', categorie: 'serif', google_url: 'Playfair+Display:wght@400;600;700' },
  { naam: 'Merriweather', label: 'Merriweather', categorie: 'serif', google_url: 'Merriweather:wght@400;700' },
  { naam: 'Lora', label: 'Lora', categorie: 'serif', google_url: 'Lora:wght@400;600;700' },
  { naam: 'PT Serif', label: 'PT Serif', categorie: 'serif', google_url: 'PT+Serif:wght@400;700' },
  // Display
  { naam: 'Oswald', label: 'Oswald', categorie: 'display', google_url: 'Oswald:wght@400;500;600;700' },
  { naam: 'Bebas Neue', label: 'Bebas Neue', categorie: 'display', google_url: 'Bebas+Neue' },
]

// ============ TEMPLATE DEFINITIES ============

export interface TemplateDefinitie {
  id: DocumentTemplateId
  naam: string
  beschrijving: string
  preview_beschrijving: string
  defaults: Partial<DocumentStyle>
}

export const DOCUMENT_TEMPLATES: TemplateDefinitie[] = [
  {
    id: 'klassiek',
    naam: 'Klassiek',
    beschrijving: 'Formeel en professioneel — tijdloos design met serif accenten',
    preview_beschrijving: 'Traditionele layout met elegante typografie',
    defaults: {
      heading_font: 'Playfair Display',
      body_font: 'Lora',
      font_grootte_basis: 10,
      primaire_kleur: '#1e3a5f',
      secundaire_kleur: '#8b6914',
      accent_kleur: '#c49b2a',
      tekst_kleur: '#1f2937',
      marge_boven: 20,
      marge_onder: 25,
      marge_links: 25,
      marge_rechts: 25,
      logo_positie: 'links',
      logo_grootte: 90,
      tabel_stijl: 'grid',
      tabel_header_kleur: '#1e3a5f',
    },
  },
  {
    id: 'modern',
    naam: 'Modern',
    beschrijving: 'Strak en hedendaags — clean design met scherpe lijnen',
    preview_beschrijving: 'Minimalistisch met sterke kleuraccenten',
    defaults: {
      heading_font: 'Montserrat',
      body_font: 'Inter',
      font_grootte_basis: 10,
      primaire_kleur: '#2563eb',
      secundaire_kleur: '#7c3aed',
      accent_kleur: '#06b6d4',
      tekst_kleur: '#111827',
      marge_boven: 15,
      marge_onder: 20,
      marge_links: 20,
      marge_rechts: 20,
      logo_positie: 'links',
      logo_grootte: 100,
      tabel_stijl: 'striped',
      tabel_header_kleur: '#2563eb',
    },
  },
  {
    id: 'minimaal',
    naam: 'Minimaal',
    beschrijving: 'Minder is meer — maximale leesbaarheid, subtiele styling',
    preview_beschrijving: 'Ultra-clean met veel witruimte',
    defaults: {
      heading_font: 'Inter',
      body_font: 'Inter',
      font_grootte_basis: 10,
      primaire_kleur: '#374151',
      secundaire_kleur: '#6b7280',
      accent_kleur: '#9ca3af',
      tekst_kleur: '#1f2937',
      marge_boven: 20,
      marge_onder: 20,
      marge_links: 25,
      marge_rechts: 25,
      logo_positie: 'links',
      logo_grootte: 80,
      tabel_stijl: 'plain',
      tabel_header_kleur: '#374151',
    },
  },
  {
    id: 'industrieel',
    naam: 'Industrieel',
    beschrijving: 'Stoer en krachtig — perfect voor de sign- en reclamebranche',
    preview_beschrijving: 'Bold design met donkere accenten',
    defaults: {
      heading_font: 'Oswald',
      body_font: 'Open Sans',
      font_grootte_basis: 10,
      primaire_kleur: '#dc2626',
      secundaire_kleur: '#1f2937',
      accent_kleur: '#f59e0b',
      tekst_kleur: '#111827',
      marge_boven: 15,
      marge_onder: 20,
      marge_links: 20,
      marge_rechts: 20,
      logo_positie: 'links',
      logo_grootte: 110,
      tabel_stijl: 'striped',
      tabel_header_kleur: '#1f2937',
    },
  },
]

// ============ DEFAULT DOCUMENT STYLE ============

export function getDefaultDocumentStyle(userId: string): DocumentStyle {
  const modern = DOCUMENT_TEMPLATES.find(t => t.id === 'modern')!
  return {
    id: '',
    user_id: userId,
    template: 'modern',
    heading_font: modern.defaults.heading_font!,
    body_font: modern.defaults.body_font!,
    font_grootte_basis: modern.defaults.font_grootte_basis!,
    primaire_kleur: modern.defaults.primaire_kleur!,
    secundaire_kleur: modern.defaults.secundaire_kleur!,
    accent_kleur: modern.defaults.accent_kleur!,
    tekst_kleur: modern.defaults.tekst_kleur!,
    marge_boven: modern.defaults.marge_boven!,
    marge_onder: modern.defaults.marge_onder!,
    marge_links: modern.defaults.marge_links!,
    marge_rechts: modern.defaults.marge_rechts!,
    logo_positie: modern.defaults.logo_positie!,
    logo_grootte: modern.defaults.logo_grootte!,
    briefpapier_url: '',
    briefpapier_modus: 'geen',
    vervolgpapier_url: '',
    toon_header: true,
    toon_footer: true,
    footer_tekst: '',
    tabel_stijl: modern.defaults.tabel_stijl!,
    tabel_header_kleur: modern.defaults.tabel_header_kleur!,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

// ============ GOOGLE FONTS LOADER ============

let loadedFonts = new Set<string>()

export function loadGoogleFont(fontNaam: string): void {
  if (loadedFonts.has(fontNaam)) return
  const font = BESCHIKBARE_FONTS.find(f => f.naam === fontNaam)
  if (!font) return

  const linkId = `google-font-${fontNaam.replace(/\s+/g, '-').toLowerCase()}`
  if (document.getElementById(linkId)) {
    loadedFonts.add(fontNaam)
    return
  }

  const link = document.createElement('link')
  link.id = linkId
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${font.google_url}&display=swap`
  document.head.appendChild(link)
  loadedFonts.add(fontNaam)
}

export function loadGoogleFonts(fonts: string[]): void {
  fonts.forEach(loadGoogleFont)
}

// ============ JSPDF FONT MAPPING ============
// jsPDF only has helvetica, courier, times built-in.
// For Google Fonts in PDF we map to the closest built-in jsPDF font.
// A more advanced approach would embed .ttf fonts, but that adds significant
// bundle size. This gives a good approximation.

export function getJsPdfFontFamily(fontNaam: string): string {
  const font = BESCHIKBARE_FONTS.find(f => f.naam === fontNaam)
  if (!font) return 'helvetica'

  switch (font.categorie) {
    case 'serif':
      return 'times'
    case 'monospace':
      return 'courier'
    default:
      return 'helvetica'
  }
}
