import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  bepaalStand,
  vlagStaatAan,
  veiligeVlagRijen,
  classificeerFout,
  classificeerHttp,
  bepaalFoutAfhandeling,
  claimTaak,
  claimWaarden,
  opruimTaak,
  opruimWaarden,
  herplanWaarden,
  leaseGrens,
  messageIdVoorRij,
  synthetiseerMessageId,
  LEASE_MS,
  LEASE_MARGE_MS,
  HERPLAN_MS,
  RETRY_DELAYS_MIN,
  MAX_UITSTEL,
  type CasUitvoer,
  type FeatureFlagRij,
  type TaakStatus,
} from '@/lib/mailsyncQueue'
import { bepaalStand as bepaalStandClient } from '@/lib/featureFlags'

/**
 * De mailsync-wachtrij (migratie 202, docs/plan-mailsync-queue.md).
 *
 * Waarom deze test er is en waarom hij zwaarder weegt dan gebruikelijk: de
 * laag die hij dekt draait in `api/*`, en die bestanden vallen buiten de
 * tsconfig én buiten `npm run build`. Er is geen testdatabase, geen manier om
 * een IMAP-ronde na te spelen en geen browser om het in te bekijken. Deze
 * test is dus niet een extra poort maar de enige.
 *
 * De code die hier getest wordt staat letterlijk óók in de api-bestanden; de
 * laatste describe bewaakt dat die kopieën niet uit elkaar lopen.
 */

const ORG_A = '11111111-1111-1111-1111-111111111111'
const ORG_B = '22222222-2222-2222-2222-222222222222'
const NU = Date.parse('2026-08-13T10:00:00.000Z')

// ── Serverkant van de feature-flag ────────────────────────────────────

describe('serverkant-flaglezer', () => {
  it('geen rij is onbekend, en onbekend houdt het nieuwe pad uit', () => {
    expect(bepaalStand('mailsync_queue', [], ORG_A)).toBe('onbekend')
    expect(vlagStaatAan('mailsync_queue', [], ORG_A)).toBe(false)
  })

  it('globale rij op true zet hem aan voor wie geen eigen rij heeft', () => {
    const rijen: FeatureFlagRij[] = [{ naam: 'mailsync_queue', organisatie_id: null, aan: true }]
    expect(bepaalStand('mailsync_queue', rijen, ORG_A)).toBe('aan')
    expect(vlagStaatAan('mailsync_queue', rijen, ORG_A)).toBe(true)
    // Ook zonder bekende organisatie: de globale rij geldt voor iedereen.
    expect(vlagStaatAan('mailsync_queue', rijen, null)).toBe(true)
  })

  it('globale rij op false is een noodstop die een org-rij niet kan overrulen', () => {
    const rijen: FeatureFlagRij[] = [
      { naam: 'mailsync_queue', organisatie_id: null, aan: false },
      { naam: 'mailsync_queue', organisatie_id: ORG_A, aan: true },
    ]
    expect(bepaalStand('mailsync_queue', rijen, ORG_A)).toBe('uit')
    expect(vlagStaatAan('mailsync_queue', rijen, ORG_A)).toBe(false)
  })

  it('org-rij gaat vóór een globale true, in beide richtingen', () => {
    const globaalAan: FeatureFlagRij = { naam: 'mailsync_queue', organisatie_id: null, aan: true }
    const orgUit: FeatureFlagRij = { naam: 'mailsync_queue', organisatie_id: ORG_A, aan: false }
    expect(bepaalStand('mailsync_queue', [globaalAan, orgUit], ORG_A)).toBe('uit')
    // Organisatie B heeft geen eigen rij en volgt dus de globale.
    expect(bepaalStand('mailsync_queue', [globaalAan, orgUit], ORG_B)).toBe('aan')

    const orgAan: FeatureFlagRij = { naam: 'mailsync_queue', organisatie_id: ORG_A, aan: true }
    // Pilot-stand: geen globale rij, alleen deze organisatie doet mee.
    expect(bepaalStand('mailsync_queue', [orgAan], ORG_A)).toBe('aan')
    expect(bepaalStand('mailsync_queue', [orgAan], ORG_B)).toBe('onbekend')
  })

  it('een rij van een andere flag telt niet mee', () => {
    const rijen: FeatureFlagRij[] = [{ naam: 'module_studio', organisatie_id: null, aan: true }]
    expect(vlagStaatAan('mailsync_queue', rijen, ORG_A)).toBe(false)
  })

  it('een fout of ontbrekende tabel levert UIT, niet AAN', async () => {
    let gemeld: unknown = null
    const rijen = await veiligeVlagRijen(
      async () => { throw new Error('relation "feature_flags" does not exist') },
      (fout) => { gemeld = fout },
    )
    expect(rijen).toEqual([])
    expect(gemeld).toBeInstanceOf(Error)
    // Dit is de kern: een kapotte flagquery mag het nieuwe pad nooit openen.
    expect(vlagStaatAan('mailsync_queue', rijen, ORG_A)).toBe(false)
  })

  it('geeft exact dezelfde uitkomst als de clientkant in src/lib/featureFlags.ts', () => {
    const alleRijen: FeatureFlagRij[] = [
      { naam: 'mailsync_queue', organisatie_id: null, aan: true },
      { naam: 'mailsync_queue', organisatie_id: null, aan: false },
      { naam: 'mailsync_queue', organisatie_id: ORG_A, aan: true },
      { naam: 'mailsync_queue', organisatie_id: ORG_A, aan: false },
    ]
    // Alle 16 deelverzamelingen × 3 organisatiewaarden. Loopt de serverkopie
    // ooit uit de pas met het origineel, dan valt hij hier om.
    for (let masker = 0; masker < 16; masker++) {
      const rijen = alleRijen.filter((_, i) => masker & (1 << i))
      for (const org of [ORG_A, ORG_B, null]) {
        expect(bepaalStand('mailsync_queue', rijen, org))
          .toBe(bepaalStandClient('mailsync_queue', rijen, org))
      }
    }
  })
})

// ── De claim ──────────────────────────────────────────────────────────

interface NepTaak {
  status: TaakStatus
  retry_count: number
  uitstel_count: number
  geclaimd_door: string | null
  lease_tot: string | null
  scheduled_at: string
}

function nepTaak(overschrijf: Partial<NepTaak> = {}): NepTaak {
  return {
    status: 'wachtend',
    retry_count: 0,
    uitstel_count: 0,
    geclaimd_door: null,
    lease_tot: null,
    scheduled_at: new Date(NU).toISOString(),
    ...overschrijf,
  }
}

/**
 * Modelleert `UPDATE ... WHERE id = $1 AND status = $2` op één rij.
 *
 * De `await` staat vóór de statuscontrole en niet erna: zo lopen twee
 * gelijktijdige aanroepen gegarandeerd door elkaar heen op het moment dat het
 * ertoe doet. De controle en de schrijfactie zelf zitten in één synchroon blok,
 * want dat is precies wat Postgres met een rijvergrendeling garandeert. Zou de
 * echte code eerst lezen en daarna los updaten, dan zouden beide runs winnen.
 */
function maakCas(taak: NepTaak, telWinst: () => void): CasUitvoer {
  return async (waarden, verwachteStatus) => {
    await Promise.resolve()
    if (taak.status !== verwachteStatus) return false
    Object.assign(taak, waarden)
    telWinst()
    return true
  }
}

describe('claim met compare-and-swap', () => {
  it('bij twee gelijktijdige claims wint er precies één', async () => {
    const taak = nepTaak()
    let winsten = 0
    const cas = maakCas(taak, () => { winsten++ })

    const [a, b] = await Promise.all([
      claimTaak('run-a', NU, cas),
      claimTaak('run-b', NU, cas),
    ])

    expect(winsten).toBe(1)
    expect([a, b].filter((r) => r !== null)).toHaveLength(1)
    expect([a, b].filter((r) => r === null)).toHaveLength(1)
    expect(taak.status).toBe('verwerken')
    // De verliezer mag de taak niet naast de winnaar verwerken.
    const winnaar = a ?? b
    expect(taak.geclaimd_door).toBe(winnaar!.geclaimd_door)
  })

  it('claimt niet wat al op verwerken staat', async () => {
    const taak = nepTaak({ status: 'verwerken' })
    const uitkomst = await claimTaak('run-a', NU, maakCas(taak, () => {}))
    expect(uitkomst).toBeNull()
  })

  it('zet een lease van 90 seconden en dezelfde klok op beide tijdvelden', () => {
    const waarden = claimWaarden('run-a', NU)
    expect(waarden.status).toBe('verwerken')
    expect(waarden.geclaimd_door).toBe('run-a')
    expect(waarden.geclaimd_op).toBe(new Date(NU).toISOString())
    expect(waarden.lease_tot).toBe(new Date(NU + 90_000).toISOString())
    expect(LEASE_MS).toBe(90_000)
  })
})

// ── De opruimer ───────────────────────────────────────────────────────

describe('opruimer van verlopen leases', () => {
  it('houdt 60 seconden marge boven de lease aan', () => {
    // De opruimquery is `lease_tot < leaseGrens(now)`. Een taak geclaimd op NU
    // heeft lease tot NU+90s en komt daarmee pas voorbij NU+150s in aanmerking.
    // Zo wordt een nog levende functie (maxDuration 60) nooit onder zijn eigen
    // taak weggetrokken, ook niet bij klokverschil tussen Vercel en Postgres.
    const geclaimd = NU
    const leaseTot = new Date(geclaimd + LEASE_MS).toISOString()
    const komtInAanmerking = (nu: number) => leaseTot < leaseGrens(nu)

    expect(komtInAanmerking(geclaimd + 90_000)).toBe(false)
    expect(komtInAanmerking(geclaimd + 149_000)).toBe(false)
    expect(komtInAanmerking(geclaimd + 151_000)).toBe(true)
    expect(LEASE_MARGE_MS).toBe(60_000)
  })

  it('zet de taak terug op wachtend, verhoogt retry_count en maakt de lease leeg', async () => {
    const taak = nepTaak({ status: 'verwerken', geclaimd_door: 'dode-run', retry_count: 2 })
    const uitkomst = await opruimTaak(NU, taak.retry_count, maakCas(taak, () => {}))

    expect(uitkomst).not.toBeNull()
    expect(taak.status).toBe('wachtend')
    expect(taak.retry_count).toBe(3)
    expect(taak.geclaimd_door).toBeNull()
    expect(taak.lease_tot).toBeNull()
    // Meteen weer opgepakt worden, niet nog eens wachten.
    expect(taak.scheduled_at).toBe(new Date(NU).toISOString())
  })

  it('verhoogt retry_count niet twee keer als twee opruimers tegelijk lopen', async () => {
    const taak = nepTaak({ status: 'verwerken', retry_count: 0 })
    let winsten = 0
    const cas = maakCas(taak, () => { winsten++ })

    await Promise.all([
      opruimTaak(NU, 0, cas),
      opruimTaak(NU, 0, cas),
    ])

    expect(winsten).toBe(1)
    expect(taak.retry_count).toBe(1)
  })

  it('raakt een taak die netjes is afgerond niet aan', async () => {
    const taak = nepTaak({ status: 'wachtend' })
    expect(await opruimTaak(NU, 0, maakCas(taak, () => {}))).toBeNull()
  })

  it('opruimen legt vast waaróm de taak terugkwam', () => {
    const waarden = opruimWaarden(NU, 0)
    expect(waarden.fout_soort).toBe('onbekend')
    expect(String(waarden.foutmelding)).toContain('lease verlopen')
  })
})

// ── Backoff en dodebrievenbus ─────────────────────────────────────────

describe('backoff', () => {
  it('doorloopt de reeks 1, 3, 10, 30, 60, 180, 360 minuten en stopt daarna', () => {
    expect(RETRY_DELAYS_MIN).toEqual([1, 3, 10, 30, 60, 180, 360])

    const vertragingen: number[] = []
    let retry = 0
    for (let poging = 0; poging < 8; poging++) {
      const uitkomst = bepaalFoutAfhandeling('netwerk', retry, 0)
      if (uitkomst.status === 'mislukt') break
      vertragingen.push(uitkomst.vertraging_ms / 60_000)
      retry = uitkomst.retry_count
    }

    expect(vertragingen).toEqual([1, 3, 10, 30, 60, 180, 360])
    // Na zeven pogingen is het stil en kost de mailbox geen IMAP-slot meer.
    const achtste = bepaalFoutAfhandeling('netwerk', 7, 0)
    expect(achtste.status).toBe('mislukt')
    expect(achtste.fout_soort).toBe('netwerk')
    // Samen ruim tien uur.
    expect(vertragingen.reduce((a, b) => a + b, 0)).toBe(644)
  })

  it('een authenticatiefout krijgt geen backoff maar meteen de dodebrievenbus', () => {
    const uitkomst = bepaalFoutAfhandeling('auth', 0, 0)
    expect(uitkomst.status).toBe('mislukt')
    expect(uitkomst.fout_soort).toBe('auth')
    expect(uitkomst.vertraging_ms).toBe(0)
  })

  it('uitstel gebruikt het foutbudget niet op', () => {
    const uitkomst = bepaalFoutAfhandeling('uitstel', 3, 0)
    expect(uitkomst.status).toBe('wachtend')
    expect(uitkomst.retry_count).toBe(3)
    expect(uitkomst.uitstel_count).toBe(1)
    expect(uitkomst.fout_soort).toBeNull()
    expect(uitkomst.vertraging_ms).toBe(0)
  })

  it('maar uitstel is niet oneindig', () => {
    expect(bepaalFoutAfhandeling('uitstel', 0, MAX_UITSTEL - 1).status).toBe('wachtend')
    expect(bepaalFoutAfhandeling('uitstel', 0, MAX_UITSTEL).status).toBe('mislukt')
  })

  it('een geslaagde ronde wist het foutbudget en plant over drie minuten opnieuw in', () => {
    const waarden = herplanWaarden(NU, 4200)
    expect(waarden.status).toBe('wachtend')
    expect(waarden.retry_count).toBe(0)
    expect(waarden.uitstel_count).toBe(0)
    expect(waarden.fout_soort).toBeNull()
    expect(waarden.geclaimd_door).toBeNull()
    expect(waarden.lease_tot).toBeNull()
    expect(waarden.laatste_duur_ms).toBe(4200)
    expect(waarden.scheduled_at).toBe(new Date(NU + HERPLAN_MS).toISOString())
    // Gelijk aan het tempo van de oude cron (*/3 * * * *): aanzetten mag geen
    // tempoverandering zijn.
    expect(HERPLAN_MS).toBe(180_000)
  })
})

describe('foutclassificatie', () => {
  it('herkent de mailbox-authenticatiefout', () => {
    expect(classificeerFout('Error: Invalid credentials (Failure)')).toBe('auth')
    expect(classificeerFout('AUTHENTICATIONFAILED')).toBe('auth')
    expect(classificeerFout('EMAIL_ENCRYPTION_KEY niet geconfigureerd')).toBe('auth')
    expect(classificeerFout('Geen email instellingen gevonden.')).toBe('auth')
  })

  it('herkent netwerk en database', () => {
    expect(classificeerFout('socket timeout')).toBe('netwerk')
    expect(classificeerFout('getaddrinfo ENOTFOUND imap.example.org')).toBe('netwerk')
    expect(classificeerFout('The operation was aborted')).toBe('netwerk')
    expect(classificeerFout('upsert faalde: duplicate key violates constraint')).toBe('database')
  })

  it('valt terug op onbekend in plaats van te gokken', () => {
    expect(classificeerFout('iets onverwachts')).toBe('onbekend')
  })

  it('leest HTTP-antwoorden apart, want de tekst alleen misleidt', () => {
    // 429 is de rate limit van fetch-emails: uitstel, geen fout.
    expect(classificeerHttp(429, '')).toBe('uitstel')
    // Een fout cron-secret is een configuratiefout van de deploy en niet van
    // deze mailbox. Zou dat als 'auth' tellen, dan belandt bij één verkeerde
    // env-var iedere taak in één ronde in de dodebrievenbus.
    expect(classificeerHttp(401, 'Unauthorized')).toBe('onbekend')
    expect(classificeerHttp(403, 'Forbidden')).toBe('onbekend')
    expect(classificeerHttp(504, 'Gateway Timeout')).toBe('netwerk')
    expect(classificeerHttp(400, 'Geen email instellingen gevonden.')).toBe('auth')
  })
})

// ── Idempotentie op message-id ────────────────────────────────────────

describe('idempotentie op message-id', () => {
  it('gebruikt de echte header als die er is', () => {
    expect(messageIdVoorRij('<abc@voorbeeld.nl>', 42, 7, 'INBOX')).toBe('<abc@voorbeeld.nl>')
  })

  it('synthetiseert er een voor mail zonder Message-ID, en dat is het hele punt', () => {
    // De constraint is UNIQUE (user_id, message_id) zonder NULLS NOT DISTINCT
    // (migratie 038), dus Postgres ziet twee NULL's als verschillend en elke
    // herhaalde ophaal levert vandaag een nieuwe rij op. Een deterministisch
    // id uit de IMAP-identiteit laat de bestaande constraint zijn werk doen.
    const eerste = messageIdVoorRij('', 42, 7, 'INBOX')
    const tweede = messageIdVoorRij(null, 42, 7, 'INBOX')
    const derde = messageIdVoorRij(undefined, 42, 7, 'INBOX')
    expect(eerste).toBe(tweede)
    expect(tweede).toBe(derde)
    expect(eerste).toBe(synthetiseerMessageId(42, 7, 'INBOX'))
    expect(eerste).toMatch(/^<uid-42\.7\.[0-9a-z]+@sync\.doen\.local>$/)
  })

  it('onderscheidt uid, uidvalidity en map', () => {
    const basis = synthetiseerMessageId(42, 7, 'INBOX')
    expect(synthetiseerMessageId(43, 7, 'INBOX')).not.toBe(basis)
    // UIDVALIDITY-wissel maakt alle UID's ongeldig, dus dan hoort het een
    // ander bericht te zijn.
    expect(synthetiseerMessageId(42, 8, 'INBOX')).not.toBe(basis)
    expect(synthetiseerMessageId(42, 7, '[Gmail]/Verzonden')).not.toBe(basis)
  })

  it('blijft NULL zonder UID, want dan is er geen stabiele identiteit', () => {
    // Liever een duplicaat dan een id dat volgende ronde anders is: dat laatste
    // dupliceert alsnog én maakt de rij onvindbaar op zijn eigen sleutel.
    expect(messageIdVoorRij(null, 0, 7, 'INBOX')).toBeNull()
    expect(messageIdVoorRij(null, null, 7, 'INBOX')).toBeNull()
    expect(messageIdVoorRij(null, undefined, 7, 'INBOX')).toBeNull()
  })

  it('een gesynthetiseerd id matcht nooit een In-Reply-To', () => {
    // Naar een bericht zonder Message-ID kan niemand verwijzen, dus threading
    // mag hier niets van merken. Het domein is bewust niet routeerbaar.
    expect(synthetiseerMessageId(42, 7, 'INBOX')).toContain('@sync.doen.local>')
  })
})

// ── De kopieën in api/ ────────────────────────────────────────────────

const WORTEL = fileURLToPath(new URL('../..', import.meta.url))
const BEGIN = '// ── GEDEELD-MET-API BEGIN ──'
const EINDE = '// ── GEDEELD-MET-API EINDE ──'

function gedeeldBlok(pad: string): string {
  const inhoud = readFileSync(`${WORTEL}/${pad}`, 'utf8')
  const van = inhoud.indexOf(BEGIN)
  const tot = inhoud.indexOf(EINDE)
  if (van === -1 || tot === -1) {
    throw new Error(`${pad} mist de GEDEELD-MET-API-markers`)
  }
  return inhoud.slice(van + BEGIN.length, tot).trim()
}

describe('kopieën in api/ lopen niet uit de pas', () => {
  // api/* mag niets uit src/ importeren (CLAUDE.md §2) en valt daardoor buiten
  // de tsconfig én buiten npm run build. De logica hierboven staat er dus
  // letterlijk in gekopieerd. Zonder deze controle is er niets dat merkt dat
  // een van de kopieën achterblijft — en dan test alles hierboven code die in
  // productie niet draait.
  const bron = gedeeldBlok('src/lib/mailsyncQueue.ts')

  it('is niet leeg', () => {
    expect(bron.length).toBeGreaterThan(1000)
  })

  it.each([
    'api/cron-mailsync-werker.ts',
    'api/fetch-emails.ts',
  ])('%s bevat exact hetzelfde blok', (pad) => {
    expect(gedeeldBlok(pad)).toBe(bron)
  })
})
