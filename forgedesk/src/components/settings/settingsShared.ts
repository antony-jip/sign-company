import React from 'react'

// ─── SubTab type + navigation ───

export interface SubTab {
  id: string
  label: string
  icon: React.ElementType
}

// ─── Email settings types ───

export interface EmailSettings {
  smtp_host: string
  smtp_port: number
  smtp_encryption: 'TLS' | 'SSL' | 'Geen'
  imap_host: string
  imap_port: number
  gmail_address: string
  app_password: string
  accept_self_signed: boolean
}

export const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  smtp_host: 'smtp.gmail.com',
  smtp_port: 587,
  smtp_encryption: 'TLS',
  imap_host: 'imap.gmail.com',
  imap_port: 993,
  gmail_address: '',
  app_password: '',
  accept_self_signed: false,
}

// ─── Font systeem ───

const DEFAULT_FONT = 'Inter'

export type FontSize = 'klein' | 'normaal' | 'groot' | 'extra-groot'

export const BESCHIKBARE_FONT_SIZES: { value: FontSize; label: string; beschrijving: string; cssValue: string }[] = [
  { value: 'klein', label: 'Klein', beschrijving: 'Compact weergave', cssValue: '14px' },
  { value: 'normaal', label: 'Normaal', beschrijving: 'Standaard grootte', cssValue: '16px' },
  { value: 'groot', label: 'Groot', beschrijving: 'Beter leesbaar', cssValue: '18px' },
  { value: 'extra-groot', label: 'Extra groot', beschrijving: 'Maximale leesbaarheid', cssValue: '20px' },
]

const FONT_STORAGE_KEY = 'doen_weergave_instellingen'

export function getFontSettings(): { font_family: string; font_size: FontSize } {
  try {
    const stored = localStorage.getItem(FONT_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        font_family: DEFAULT_FONT,
        font_size: parsed.font_size || 'normaal',
      }
    }
  } catch (err) { /* ignore */ }
  return { font_family: DEFAULT_FONT, font_size: 'normaal' }
}

export function saveFontSettings(data: { font_family?: string; font_size?: FontSize }) {
  try {
    const current = getFontSettings()
    const updated = { ...current, ...data, updated_at: new Date().toISOString() }
    localStorage.setItem(FONT_STORAGE_KEY, JSON.stringify(updated))
  } catch (err) { /* ignore */ }
}

export function applyFontFamily(font: string) {
  document.documentElement.style.setProperty('--font-family', `'${font}'`)
}

export function applyFontSize(size: FontSize) {
  const config = BESCHIKBARE_FONT_SIZES.find((s) => s.value === size)
  document.documentElement.style.setProperty('--font-size', config?.cssValue ?? '16px')
}
