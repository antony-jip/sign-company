# Mail-ombouw: het contract tussen de bouwers

Stand 6 september 2026. Dit document is de bron voor iedereen die aan de
mailmodule bouwt tijdens de ombouw naar Outlook-niveau. Wijzig je een
interface hieronder, wijzig dan eerst dit document en meld het in LOGBOEK.md.

Aanleiding en analyse: artifact "Mail op Outlook-niveau" (6 sep 2026) en de
vier auditrapporten (architectuur, functies, sync, klik-doorloop).

## 0. Spelregels

- Branch `mail-outlook`. Nooit van branch wisselen, geen `git stash`, geen
  `git add -A`: stage per pad. Eén concern per commit, Engelse commit-message,
  trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` en
  `Claude-Session: https://claude.ai/code/session_01QmbarPQuYCRannKuNRozDy`.
- Bestaande bestanden alleen met de Edit-tool (nooit Write over een bestaand
  bestand). Lees de regio vlak vóór je edit opnieuw; er werken meer agents.
- Poorten: `npx tsc --noEmit 2>&1 | grep -cE "error TS"` = 32 bij start,
  `npm run typecheck:api` = 3, `npm run build` groen, `npm run test:run` groen.
  Mag niet stijgen. Raak je een bestand met bestaande fouten, ruim die op.
- Geen nieuwe npm-packages. De editor blijft contentEditable (opgeschoond).
- `api/*.ts` is standalone: geen imports uit `src/`. Kopiëren mag, `api/_lib`
  niet (niet geverifieerd op Vercel; staat op de lijst voor later).
- Migraties schrijft de hoofdsessie (244 staat klaar). Mis je een kolom: stop
  en meld het in LOGBOEK.md, verzin geen eigen migratie.
- Nederlands in code, types PascalCase Nederlands, geen emoji's, geen
  em-dashes, Flame `#F15025` alleen voor de primaire actie, Petrol `#1A535C`.
- Elke gedragsverandering die een gebruiker kan merken krijgt een schakelaar
  in `src/lib/functies.ts` (groep `mail`) of een voorkeur in localStorage
  (`doen_mail_<naam>`). Zie sectie 7.
- Alles wat je bouwt of bewust anders doet: één regel in LOGBOEK.md onder je
  eigen kop. Proactieve ideeën mag je uitvoeren als ze binnen je gebied
  vallen; leg ze vast met "idee:" ervoor.

## 1. Bestandseigendom per golf

Golf 1 (parallel):
- **sync** (backend): `api/fetch-emails.ts`, `api/send-email.ts`,
  `api/email-imap-action.ts`, `api/read-email.ts`, `api/prefetch-email-bodies.ts`,
  `api/cron-email-sync.ts`, `api/cron-mailsync-werker.ts`,
  `api/cron-verzend-geplande-berichten.ts`, nieuw `api/cron-mail-snooze.ts`,
  `vercel.json` (alleen crons), `src/lib/mailsyncQueue.ts`, `tests/lib/mailsyncQueue.test.ts`.
- **store** (client-data): nieuw `src/lib/mail/*` (mailStore, bodyRepository,
  realtime, types), `src/services/emailService.ts`, nieuw
  `src/services/conceptService.ts`, nieuw `src/services/koppelingService.ts`,
  `src/lib/mailCache.ts`, `src/lib/sanitize.ts`, nieuw `src/lib/mail/quoted.ts`,
  `src/types/index.ts` (alleen mail-types, via grep).
- **composer**: nieuw `src/components/email/composer/*`,
  `src/components/shared/OntvangerVeld.tsx`, `src/hooks/useEmailCompose.ts`,
  `src/utils/emailConceptDraft.ts`, `src/utils/sendInBackground.ts`,
  `src/services/gmailService.ts` (alleen verzendpad).

Golf 2 (parallel, na golf 1):
- **reader**: `src/components/email/EmailReader.tsx` (wordt `ConversationView`),
  nieuw `src/components/email/reader/*`, `EmailReaderAIToolbar.tsx`,
  `BijlageProjectDialog.tsx`, `AanvraagKaart.tsx`.
- **shell**: `src/components/email/EmailLayout.tsx`, `EmailListItem.tsx`,
  `EmailMobileTopBar.tsx`, `EmailFocusKaart.tsx`, `emailHelpers.ts`,
  `EmailContextSidebar.tsx` (wordt zichtbare rechterkolom), `EmailActionsPopover.tsx`,
  `EmailProjectKoppelingPanel.tsx`, `IngeplandeBerichtenLijst.tsx`, `LeadsPaneel.tsx`.
- **instellingen**: `src/components/settings/EmailTab.tsx`,
  `src/components/settings/communicatie/*`, `src/lib/functies.ts` (groep mail),
  `src/components/kennisbank/KennisbankPage.tsx`, `src/components/changelog/ChangelogPage.tsx`,
  `docs/DAAN_KNOWLEDGE.md`.

Golf 3 (fase 4): IDLE-worker in `src/trigger/mail-idle.ts`, OAuth in
`api/mail-oauth-*.ts`, meerdere mailboxen en team-inbox (migratie 245),
regels en eigen mappen.

## 2. Datamodel (migratie 244_mail_ombouw.sql)

- `email_bodies(email_id PK → emails, user_id, body_html, body_text, quoted_html, bijgewerkt_op)`.
  RLS: eigenaar, plus team-lezen via projectkoppeling zoals migratie 109.
  Bestaande `emails.body_html` is gekopieerd en daarna op NULL gezet; de kolom
  blijft bestaan tot migratie 246. **Niemand leest of schrijft nog
  `emails.body_html`.** `emails.body_text` blijft (de lijst-view gebruikt
  `LEFT(body_text, 200)`), maar begrens hem bij schrijven op 20.000 tekens.
- `emails.concept JSONB`: het `ComposerDocument` van een concept. Een concept
  is een rij met `map = 'concepten'`, `concept IS NOT NULL`, `datum = now()`
  bij elke autosave, `onderwerp` en `aan` gespiegeld uit het document zodat de
  lijst-view hem toont.
- `email_koppelingen(id, organisatie_id, user_id, email_id?, thread_id?, soort, doel_id, created_at)`,
  `soort` in klant, project, offerte, factuur, aanvraag, taak, lead. Org-scoped
  RLS. `email_project_koppelingen` (108) blijft bestaan en blijft de bron voor
  de team-leesrechten (109); `koppelingService` schrijft bij soort `project`
  naar beide.
- `email_sync_state`: `status` (ok, fout, uitgezet), `laatste_fout`,
  `laatste_fout_op`, `laatste_succes_op`. Client mag lezen (bestaande policy).
- `email_threads_view` (security_invoker): per `(user_id, thread_id)`:
  `laatste_datum`, `aantal`, `ongelezen`, `laatste_email_id`, `deelnemers` (text[]).
- Index `emails(user_id, snoozed_until) WHERE snoozed_until IS NOT NULL`.
- `user_email_settings`: `auth_type` (wachtwoord, google, microsoft),
  `oauth_refresh_token_enc`, `oauth_access_token_enc`, `oauth_token_verloopt_op`.
  Gebruikt in golf 3.

## 3. Client-store (`src/lib/mail/`)

```ts
// types.ts
export type MailMap = 'inbox' | 'verzonden' | 'concepten' | 'archief' | 'prullenbak'
  | 'gesnoozed' | 'opvolgen' | 'beantwoord' | 'ingepland' | 'leads'
export interface EmailLijstItem { /* kolommen van emails_list_view, plus threadAantal, threadOngelezen */ }
export interface EmailBody { emailId: string; html: string | null; tekst: string | null; quotedHtml: string | null }
export interface ComposerDocument {
  id?: string                     // emails.id van het concept
  modus: 'nieuw' | 'antwoord' | 'allen' | 'doorsturen'
  aan: Ontvanger[]; cc: Ontvanger[]; bcc: Ontvanger[]
  onderwerp: string
  html: string                    // zonder handtekening
  handtekening: boolean
  bijlagen: ComposerBijlage[]     // { naam, grootte, type, bron: 'upload' | 'storage' | 'origineel', pad?, emailId? }
  inReplyTo?: string; references?: string[]; threadId?: string; bronEmailId?: string
  opvolgen: boolean
  verzendOp?: string              // ISO; gepland verzenden
  koppelingen: { soort: KoppelingSoort; doelId: string }[]
}
export interface Ontvanger { email: string; naam?: string; bedrijf?: string; bron?: 'klant' | 'contactpersoon' | 'collega' | 'recent' | 'vrij' }
```

```ts
// mailStore.ts  (useSyncExternalStore, geen package)
export const mailStore: {
  subscribe(cb: () => void): () => void
  getSnapshot(): MailState
  laadMap(map: MailMap, opties?: { vers?: boolean }): Promise<void>
  laadMeer(map: MailMap): Promise<void>
  zoek(query: string, cursor?: string): Promise<void>
  zetGelezen(ids: string[], gelezen: boolean): Promise<void>
  archiveer(ids: string[]): Undo           // optimistisch, 5 s buffer, dan DB + IMAP
  verwijder(ids: string[]): Undo
  herstel(ids: string[]): Promise<void>
  pin(ids: string[], aan: boolean): Promise<void>
  snooze(ids: string[], tot: string | null): Promise<void>
  label(ids: string[], label: string, aan: boolean): Promise<void>
  patch(id: string, deel: Partial<EmailLijstItem>): void   // realtime en optimistisch
  verwijderLokaal(id: string): void
}
export type Undo = { ongedaan: () => void; klaarOver: number }
// hooks.ts
export function useMailLijst(map: MailMap): { items: EmailLijstItem[]; laden: boolean; klaar: boolean; laadMeer: () => void }
export function useMail(id: string | null): EmailLijstItem | undefined
export function useThread(threadId: string | null): { berichten: EmailLijstItem[]; laden: boolean }
export function useMapTellers(): Record<MailMap, number>
export function useSyncStatus(): { status: 'ok' | 'fout' | 'uitgezet'; laatsteFout?: string; laatsteSucces?: string }
```

Regels: één genormaliseerde `Map<id, EmailLijstItem>` plus per map een
geordende id-lijst met cursor (keyset op `(datum, id)`). Threading komt van de
server (`thread_id` en `email_threads_view`), de client groepeert niet meer.
IndexedDB (`mailCache.ts`) blijft de persistentie-laag: lijst per map, bodies
begrensd. Realtime: INSERT, UPDATE en DELETE op `emails` met `user_id`-filter,
gepatcht in de store; geen volledige herlaad.

```ts
// bodyRepository.ts
export function useBody(emailId: string | null): { body: EmailBody | null; laden: boolean; fout?: string; opnieuw: () => void }
export function vergeetMislukt(emailId?: string): void   // wist de mislukt-markering, zodat 'Opnieuw' meteen weer probeert
export function prefetchBodies(ids: string[], prioriteit: 'zichtbaar' | 'later'): void
export function haalBody(emailId: string, prioriteit: 'nu' | 'zichtbaar' | 'later'): Promise<EmailBody>
```
Eén wachtrij met prioriteit (geselecteerd > zichtbaar > rest), bronnen in
volgorde: geheugen, IndexedDB, `email_bodies`, server-prefetch, `read-email`.
Wat mislukt krijgt een markering met tijdstempel: 60 seconden lang gaat die id
niet opnieuw de wachtrij in, tenzij de gebruiker zelf `opnieuw()` kiest.
`quoted.ts` splitst html in eigen deel en geciteerd deel (blockquote,
`.gmail_quote`, "Op ... schreef", "From:"/"Van:"-blok, "-----Original Message-----").

## 4. Composer (`src/components/email/composer/`)

```tsx
<Composer
  document={ComposerDocument}           // initieel, uit conceptService of uit bron-mail
  variant="inline" | "paneel" | "volledig"   // inline onder de thread, paneel rechts (zoals ProjectMailDialog), volledig op mobiel
  onVerzonden={(emailId) => void}
  onSluiten={() => void}
/>
```
- Eén composer voor nieuw, antwoord, allen, doorsturen, en voor
  `ProjectMailComposer`, `SendOfferteDialog` en `FactuurEditor` (die krijgen een
  dunne wrapper; wijzigen in golf 2 door shell).
- Ontvanger-chips (`OntvangerVeld`): naam + bedrijf, Backspace verwijdert,
  ranking: prefix op naam of e-mail of domein > recente afzenders (laatste 90
  dagen uit `emails`) > klanten > contactpersonen > collega's. Match gemarkeerd.
- Autosave: elke 2 s na wijziging en bij sluiten, via `conceptService`
  (rij in `emails`, map `concepten`). Sluiten zonder vraag is toegestaan omdat
  niets verloren gaat; Concepten-map toont de rij en opent de composer.
- Verzenden: `undo` van N seconden (schakelaar `mail_undo_seconden`, standaard
  8) in een toast "Verzonden · Ongedaan maken"; pas daarna `send-email`. Bij
  `verzendOp` in de toekomst: `ingeplande_berichten`, bewerkbaar tot verzending.
- Templates, veld invoegen (`{{contactpersoon}}`, `{{bedrijfsnaam}}`,
  `{{project_naam}}`, `{{offerte_nummer}}`: ingevuld uit de koppelingen),
  opvolgen-schakelaar, gepland verzenden en handtekening in élke modus.
- Threading-headers (`In-Reply-To`, `References`, `thread_id`) altijd mee.
- Editor: contentEditable met één document-state (html in React-state,
  wijzigingen via `input`-event, nooit `innerHTML` toewijzen na de eerste
  mount behalve bij template-invoeging via `execCommand('insertHTML')`).
  Genummerde lijst erbij. Inline afbeeldingen als cid zoals nu.
- Mobiel: variant `volledig`, handtekening schaalt (max-width 100%),
  bottom-nav verborgen zolang de composer open is.

## 5. Sync-backend

- **Verzonden**: na `sendMail` een `client.append(raw, ['\\Seen'], sentFolder)`
  met de MIME van nodemailer (`info.message` of via `transporter` met
  `buildMessage`); `uid` uit `APPENDUID` in de rij. Ook in `cron-verzend-geplande-berichten`.
  Verzonden-map meesyncen in `fetch-emails` (eigen `email_sync_state`-rij per
  folder; bestaat al per `folder`).
- **Twee kanten op**: `email-imap-action` staat toe: `seen`, `unseen`,
  `flagged`, `unflagged`, `archive`, `trash`, `purge`, `move`. `EMAIL_IMAP_WRITEBACK`
  default aan (env ontbreekt = aan; `uit` schakelt uit). Server→DB: per ronde
  flags-resync van de laatste 500 uids én `UID SEARCH ALL` vergelijken met de
  DB voor de INBOX: ontbreekt een uid op de server, dan `map = 'archief'` als
  hij in Archief/All Mail staat, anders `prullenbak`. Pin ↔ `\Flagged`.
- **Snooze**: `api/cron-mail-snooze.ts` elke minuut: `snoozed_until <= now()`
  → `map = 'inbox'`, `snoozed_until = NULL`, `gelezen = false`, notificatie
  via bestaande push als `push_nieuwe_mail` aan staat.
- **Gezondheid**: `fetch-emails` schrijft `laatste_succes_op` bij succes en
  `status`, `laatste_fout`, `laatste_fout_op` bij fout (auth-fout = `uitgezet`
  na de dodebrievenbus). Opnieuw opslaan van instellingen zet `status = ok` en
  reset de wachtrij. Sentry in `fetch-emails`, `read-email`, `prefetch`, `imap-action`.
- **Outbox**: `send-email` schrijft eerst een rij in `ingeplande_berichten`
  met status `verzenden`, verstuurt, zet `verzonden` (met `emails.id`) of
  `mislukt` met `foutmelding`. Auth-fouten (535, "Invalid credentials") niet
  retryen: direct `mislukt` + notificatie. De client toont status uit deze rij.
- **Bodies**: `read-email` en `prefetch` schrijven naar `email_bodies`
  (html, tekst, quoted_html via dezelfde splitsing als `quoted.ts`, in api
  gekopieerd). Prefetch draait ook vanuit de werker na een sync (max 25 per
  ronde) zodat een body er al is vóór de gebruiker klikt.
- **Realtime**: geen wijziging in de publication; UPDATE-payloads zijn licht
  zodra `emails.body_html` leeg is.

## 6. Toetsenbord (shell, golf 2)

Altijd actief behalve in `input`, `textarea`, `[contenteditable]` en open
dialogs. `j`/`k` volgende/vorige (zichtbare focusrij, petrol rand), `o`/Enter
openen, `e` archiveren (springt naar volgende), `#` verwijderen, `r` antwoorden,
`a` allen, `f` doorsturen, `c` nieuw, `z` snooze-menu, `p` pin, `l` label,
`u` ongelezen, `/` zoeken, `g i` inbox, `g s` verzonden, `?` kaart, `Esc`
sluit reader of composer (composer: alleen sluiten, concept blijft), `⌘Enter`
verzenden, `⌘K` palet (bestaat al).

## 7. Schakelaars en voorkeuren

Schakelaars (`src/lib/functies.ts`, groep `mail`, org-breed, admin):
- `mail_afbeeldingen_blokkeren` (standaard aan): externe afbeeldingen pas na klik.
- `mail_undo_seconden` (getal, standaard 8, 0 = uit).
- `mail_split_inbox` (standaard uit): Aanvragen · Klanten · Leveranciers · Overig door Daan.
- `mail_verzonden_naar_server` (standaard aan): IMAP APPEND.

Voorkeuren (localStorage, per gebruiker):
- `doen_mail_dichtheid` (`comfortabel` standaard, `compact`).
- `doen_mail_rail_labels` (aan standaard).
- `doen_mail_swipe_links` (`archiveren` standaard, `verwijderen`).
- `doen_mail_paneel_breedte` (bestaat).
