import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// buildDaanContext is sinds de hotfix inline in elke API-route
// (Vercel bundelt geen api/_helpers/ imports). Source-checks per
// route blijven de regressie-bewaker · helper-unit-tests vervallen.

describe('AI-routes wiring', () => {
  const ROUTES = [
    'api/ai-chat.ts',
    'api/ai-rewrite.ts',
    'api/ai-email.ts',
    'api/ai-followup-email.ts',
  ]

  for (const route of ROUTES) {
    it(`${route} bevat inline buildDaanContext en gebruikt beide velden`, () => {
      const source = readFileSync(join(__dirname, '..', route), 'utf8')
      expect(source, `${route} mist inline buildDaanContext-functie`).toMatch(/async function buildDaanContext\(/)
      expect(source, `${route} roept buildDaanContext niet aan`).toMatch(/buildDaanContext\(/)
      expect(source, `${route} gebruikt bedrijfscontext niet in prompt-bouw`).toMatch(/bedrijfscontext/)
      expect(source, `${route} gebruikt schrijfstijl niet in prompt-bouw`).toMatch(/schrijfstijl/)
      expect(source, `${route} mag niet importeren uit api/_helpers/`).not.toMatch(/from ['"]\.\/_helpers\//)
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

  it("ai-rewrite registreert 'eigen-stijl' action", () => {
    const source = readFileSync(join(__dirname, '..', 'api/ai-rewrite.ts'), 'utf8')
    expect(source).toMatch(/'eigen-stijl':\s*\{/)
  })

  it("aiRewriteService union bevat 'eigen-stijl'", () => {
    const source = readFileSync(join(__dirname, '..', 'src/services/aiRewriteService.ts'), 'utf8')
    expect(source).toMatch(/'eigen-stijl'/)
  })
})
