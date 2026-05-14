import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildDaanContext } from '../api/_helpers/daanContext'

const ORG = { bedrijfscontext: 'Wij zijn een signbedrijf', schrijfstijl: 'Zakelijk maar warm' }
const USER = { bedrijfscontext: 'Persoonlijke context', schrijfstijl: 'Heel informeel' }

function fakeSupabase(opts: {
  organisatie_id?: string | null
  orgRow?: { forgie_bedrijfscontext: string; ai_tone_of_voice: string } | null
  userRow?: { forgie_bedrijfscontext: string; ai_tone_of_voice: string } | null
}): SupabaseClient {
  const profileMaybe = () => Promise.resolve({ data: { organisatie_id: opts.organisatie_id ?? null }, error: null })
  const orgMaybe = () => Promise.resolve({ data: opts.orgRow ?? null, error: null })
  const userMaybe = () => Promise.resolve({ data: opts.userRow ?? null, error: null })

  return {
    from(table: string) {
      if (table === 'profiles') {
        return { select: () => ({ eq: () => ({ maybeSingle: profileMaybe }) }) }
      }
      if (table === 'app_settings') {
        return {
          select: () => ({
            eq: (col: string) => {
              if (col === 'organisatie_id') {
                return { order: () => ({ limit: () => ({ maybeSingle: orgMaybe }) }) }
              }
              return { maybeSingle: userMaybe }
            },
          }),
        }
      }
      throw new Error(`Onverwachte tabel: ${table}`)
    },
  } as unknown as SupabaseClient
}

describe('buildDaanContext', () => {
  it('geeft lege context bij leeg userId', async () => {
    const ctx = await buildDaanContext({} as SupabaseClient, '')
    expect(ctx).toEqual({ bedrijfscontext: '', schrijfstijl: '', hasContext: false })
  })

  it('haalt org-level context op wanneer beschikbaar', async () => {
    const supabase = fakeSupabase({
      organisatie_id: 'org-1',
      orgRow: { forgie_bedrijfscontext: ORG.bedrijfscontext, ai_tone_of_voice: ORG.schrijfstijl },
    })
    const ctx = await buildDaanContext(supabase, 'user-1')
    expect(ctx.bedrijfscontext).toBe(ORG.bedrijfscontext)
    expect(ctx.schrijfstijl).toBe(ORG.schrijfstijl)
    expect(ctx.hasContext).toBe(true)
  })

  it('valt terug op user-level context wanneer org leeg is', async () => {
    const supabase = fakeSupabase({
      organisatie_id: null,
      userRow: { forgie_bedrijfscontext: USER.bedrijfscontext, ai_tone_of_voice: USER.schrijfstijl },
    })
    const ctx = await buildDaanContext(supabase, 'user-1')
    expect(ctx.bedrijfscontext).toBe(USER.bedrijfscontext)
    expect(ctx.schrijfstijl).toBe(USER.schrijfstijl)
    expect(ctx.hasContext).toBe(true)
  })

  it('mixt org-bedrijfscontext met user-schrijfstijl wanneer org-schrijfstijl ontbreekt', async () => {
    const supabase = fakeSupabase({
      organisatie_id: 'org-1',
      orgRow: { forgie_bedrijfscontext: ORG.bedrijfscontext, ai_tone_of_voice: '' },
      userRow: { forgie_bedrijfscontext: '', ai_tone_of_voice: USER.schrijfstijl },
    })
    const ctx = await buildDaanContext(supabase, 'user-1')
    expect(ctx.bedrijfscontext).toBe(ORG.bedrijfscontext)
    expect(ctx.schrijfstijl).toBe(USER.schrijfstijl)
  })

  it('hasContext is false wanneer beide velden leeg zijn', async () => {
    const supabase = fakeSupabase({ organisatie_id: null, userRow: null })
    const ctx = await buildDaanContext(supabase, 'user-1')
    expect(ctx).toEqual({ bedrijfscontext: '', schrijfstijl: '', hasContext: false })
  })
})

describe('AI-routes wiring', () => {
  const ROUTES = [
    'api/ai-chat.ts',
    'api/ai-rewrite.ts',
    'api/ai-email.ts',
    'api/ai-followup-email.ts',
  ]

  for (const route of ROUTES) {
    it(`${route} importeert buildDaanContext en gebruikt beide velden`, () => {
      const source = readFileSync(join(__dirname, '..', route), 'utf8')
      expect(source, `${route} mist buildDaanContext import`).toMatch(/from ['"]\.\/_helpers\/daanContext['"]/)
      expect(source, `${route} roept buildDaanContext niet aan`).toMatch(/buildDaanContext\(/)
      expect(source, `${route} gebruikt bedrijfscontext niet in prompt-bouw`).toMatch(/bedrijfscontext/)
      expect(source, `${route} gebruikt schrijfstijl niet in prompt-bouw`).toMatch(/schrijfstijl/)
    })
  }

  it('ai-rewrite ondersteunt skipTone-flag voor opt-out per veld', () => {
    const source = readFileSync(join(__dirname, '..', 'api/ai-rewrite.ts'), 'utf8')
    expect(source).toMatch(/skipTone/)
  })

  it('ai-email skipt context voor pure vertaal-acties', () => {
    const source = readFileSync(join(__dirname, '..', 'api/ai-email.ts'), 'utf8')
    expect(source).toMatch(/translate-en|translate-nl/)
  })
})
