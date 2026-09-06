import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useNavigateWithTab } from '@/hooks/useNavigateWithTab'
import { useFunctie } from '@/hooks/useFunctie'
import { hapticLight } from '@/utils/haptic'
import { logger } from '@/utils/logger'
import { cn } from '@/lib/utils'
import { mailStore } from '@/lib/mail/mailStore'
import { startRealtime } from '@/lib/mail/realtime'
import { prefetchBodies, haalBody } from '@/lib/mail/bodyRepository'
import { useMailLijst, useMapTellers, usePostvakken, useSyncStatus, useZoekresultaten } from '@/lib/mail/hooks'
import type { EmailBody, EmailLijstItem, MailMap } from '@/lib/mail/types'
import { getConcept } from '@/services/conceptService'
import { updateLeadStatus } from '@/services/leadsService'
import { extractSenderEmail, extractSenderName, getAvatarStyle } from './emailHelpers'
import { EmailMobileTopBar } from './EmailMobileTopBar'
import { EmailFocusKaart } from './EmailFocusKaart'
import { Mappenrail, MobieleMappenLade } from './shell/Mappenrail'
import { Lijstkop } from './shell/Lijstkop'
import { MailLijst } from './shell/MailLijst'
import { Zoekbalk } from './shell/Zoekbalk'
import { Leesvenster } from './shell/Leesvenster'
import { Klantkaart } from './shell/Klantkaart'
import { KlantToevoegenDialog } from './shell/KlantToevoegenDialog'
import { GezondheidBanner } from './shell/GezondheidBanner'
import { OutboxRijen } from './shell/OutboxRijen'
import { LegeStaat } from './shell/LegeStaat'
import { SnoozeMenu } from './shell/SnoozeMenu'
import { SneltoetsenKaart } from './shell/SneltoetsenKaart'
import { useMailToetsen } from './shell/useMailToetsen'
import { useMailSync } from './shell/useMailSync'
import { toonUndo, meervoud } from './shell/undoToast'
import { useAdresIndexen, classificeer } from './shell/afzenderClassificatie'
import { chipVoor, useKoppelingChips } from './shell/koppelingChips'
import {
  legeStaatVoor, mapLabel, sorteerVoorLijst, voldoetAanFilter,
  type LijstFilter, type SplitTab,
} from './shell/mapConfig'
import { useEigenSleutels } from './shell/toewijzing'
import { VOORKEUR, useBoolVoorkeur, useVoorkeur, type Dichtheid, type SwipeLinks } from './shell/voorkeuren'
import { chipsNaarQuery, heeftZoekopdracht, voegChipToe, type ZoekChip } from './shell/zoekChips'
import { readerActies } from './reader'
import { Composer, documentUitConcept, documentVoorAntwoord, documentVoorDoorsturen, documentVoorNieuw } from './composer'
import type { ComposerVariant } from './composer'
import type { ComposerDocument } from '@/lib/mail/types'
import type { AntwoordModus } from './shell/Leesvenster'

const LeadsPaneel = lazy(() => import('./LeadsPaneel').then((m) => ({ default: m.LeadsPaneel })))
const IngeplandeBerichtenLijst = lazy(() => import('./IngeplandeBerichtenLijst').then((m) => ({ default: m.IngeplandeBerichtenLijst })))

interface ComposerStand {
  document: ComposerDocument
  variant: ComposerVariant
}

/**
 * De shell van de mailmodule: mappen, lijst, leesvenster, composer en
 * klantkaart. Alle maildata komt uit `mailStore` (zie CONTRACT.md sectie 3);
 * deze component houdt alleen bij wat er op het scherm staat.
 */
export function EmailLayout() {
  const { user, organisatieId } = useAuth()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const navigate = useNavigate()
  const location = useLocation()
  const { navigateWithTab } = useNavigateWithTab()
  const splitAan = useFunctie('mail_split_inbox')

  // ── Voorkeuren ──
  const [dichtheid, zetDichtheid] = useVoorkeur<Dichtheid>(VOORKEUR.dichtheid, 'comfortabel', ['comfortabel', 'compact'])
  const [swipeLinks] = useVoorkeur<SwipeLinks>(VOORKEUR.swipeLinks, 'archiveren', ['archiveren', 'verwijderen'])
  const [railLabels, zetRailLabels] = useBoolVoorkeur(VOORKEUR.railLabels, true)
  const [klantkaartAan, zetKlantkaartAan] = useBoolVoorkeur(VOORKEUR.klantkaart, true)
  const [focusModus, zetFocusModus] = useBoolVoorkeur(VOORKEUR.focusModus, false)

  // ── Schermstand ──
  const [map, zetMapState] = useState<MailMap>('inbox')
  const [geselecteerdId, zetGeselecteerd] = useState<string | null>(null)
  const [aangevinkt, zetAangevinkt] = useState<Set<string>>(new Set())
  const [focusIndex, zetFocusIndex] = useState(-1)
  const [filter, zetFilter] = useState<LijstFilter>('alle')
  const [labelFilter, zetLabelFilter] = useState<string | null>(null)
  const [splitTab, zetSplitTab] = useState<SplitTab>('aanvragen')
  const [zoektekst, zetZoektekst] = useState('')
  const [chips, zetChips] = useState<ZoekChip[]>([])
  const [composer, zetComposer] = useState<ComposerStand | null>(null)
  const [ladeOpen, zetLadeOpen] = useState(false)
  const [snoozeOpen, zetSnoozeOpen] = useState(false)
  const [kaartOpen, zetKaartOpen] = useState(false)
  const [klantDialoog, zetKlantDialoog] = useState<{ naam: string; email: string; inhoud: string } | null>(null)
  const [nu, zetNu] = useState(() => Date.now())
  const laatsteVinkRef = useRef<string | null>(null)

  const zoekt = heeftZoekopdracht(zoektekst, chips)
  const lijstMap: MailMap = map
  const mapLijst = useMailLijst(lijstMap)
  const zoekLijst = useZoekresultaten()
  const tellers = useMapTellers()
  const sync = useSyncStatus()
  const postvakken = usePostvakken()
  const gedeeld = postvakken.huidig?.soort === 'gedeeld'
  const eigenSleutels = useEigenSleutels(user?.id)
  const { bezig, laatsteSync, mailboxGekoppeld } = useMailSync(map, isDesktop, !!user?.id)
  const adresIndexen = useAdresIndexen(splitAan && map === 'inbox')

  // ── Eigenaar en realtime ──
  useEffect(() => {
    mailStore.stelEigenaarIn(user?.id, organisatieId)
  }, [user?.id, organisatieId])

  useEffect(() => {
    if (!user?.id) return
    return startRealtime(user.id, () => map)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    const t = setInterval(() => zetNu(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => () => { mailStore.flushAlles() }, [])

  // ── Zoeken ──
  useEffect(() => {
    if (!zoekt) return
    const query = chipsNaarQuery(zoektekst, chips)
    const t = setTimeout(() => { void mailStore.zoek(query) }, 220)
    return () => clearTimeout(t)
  }, [zoekt, zoektekst, chips])

  // ── Deeplink /email/compose?to=... ──
  useEffect(() => {
    if (!location.pathname.endsWith('/email/compose')) return
    const params = new URLSearchParams(location.search)
    zetComposer({
      variant: isDesktop ? 'paneel' : 'volledig',
      document: documentVoorNieuw({
        aan: params.get('to') ? [{ email: params.get('to') as string }] : [],
        onderwerp: params.get('subject') || '',
        html: params.get('body') ? `<p>${params.get('body')}</p>` : '',
      }),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search])

  // ── De zichtbare lijst ──
  const bron = zoekt ? zoekLijst : mapLijst
  const zichtbaar = useMemo(() => {
    let items = bron.items.filter((i) => voldoetAanFilter(i, filter, eigenSleutels))
    if (labelFilter) items = items.filter((i) => (i.labels || []).includes(labelFilter))
    if (splitAan && map === 'inbox' && !zoekt) {
      items = items.filter((i) => classificeer(i, adresIndexen.klanten, adresIndexen.leveranciers, chipVoor(i)) === splitTab)
    }
    return sorteerVoorLijst(items)
  }, [bron.items, filter, labelFilter, eigenSleutels, splitAan, map, zoekt, splitTab, adresIndexen])

  const filterTellers = useMemo(() => {
    const basis = bron.items
    return {
      alle: basis.length,
      ongelezen: basis.filter((i) => !i.gelezen).length,
      vastgepind: basis.filter((i) => i.pinned).length,
      bijlagen: basis.filter((i) => i.has_attachments).length,
    } as Partial<Record<LijstFilter, number>>
  }, [bron.items])

  const splitTellers = useMemo(() => {
    if (!splitAan || map !== 'inbox') return {} as Record<SplitTab, number>
    const uit = { aanvragen: 0, klanten: 0, leveranciers: 0, overig: 0 } as Record<SplitTab, number>
    for (const i of bron.items) uit[classificeer(i, adresIndexen.klanten, adresIndexen.leveranciers, chipVoor(i))]++
    return uit
  }, [splitAan, map, bron.items, adresIndexen])

  const geselecteerd = useMemo(() => zichtbaar.find((i) => i.id === geselecteerdId) ?? mailStore.item(geselecteerdId ?? '') ?? null, [zichtbaar, geselecteerdId])

  // Zichtbare bodies vooruit ophalen; de repository dedupliceert zelf.
  useEffect(() => {
    if (!zichtbaar.length) return
    prefetchBodies(zichtbaar.slice(0, 25).map((i) => i.id), 'zichtbaar')
  }, [zichtbaar])

  // ── Mapwissel ──
  const zetMap = useCallback((nieuw: MailMap) => {
    zetMapState(nieuw)
    zetGeselecteerd(null)
    zetAangevinkt(new Set())
    zetFocusIndex(-1)
    zetFilter('alle')
    zetLabelFilter(null)
    zetLadeOpen(false)
  }, [])

  // Een reader die niet meer in het filter past, sluit.
  useEffect(() => {
    if (!geselecteerdId) return
    if (bron.laden) return
    if (!zichtbaar.some((i) => i.id === geselecteerdId)) zetGeselecteerd(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, splitTab])

  // ── Selecteren ──
  const openMail = useCallback((item: EmailLijstItem, markeerGelezen = true) => {
    if (map === 'concepten') {
      void (async () => {
        const doc = await getConcept(item.id)
        if (doc) zetComposer({ document: documentUitConcept(doc), variant: isDesktop ? 'paneel' : 'volledig' })
        else toast.error('Concept kon niet worden geopend')
      })()
      return
    }
    zetGeselecteerd(item.id)
    zetFocusIndex(zichtbaar.findIndex((i) => i.id === item.id))
    if (markeerGelezen && !item.gelezen) void mailStore.zetGelezen([item.id], true)
  }, [map, isDesktop, zichtbaar])

  const naarBuur = useCallback((richting: 1 | -1) => {
    if (!zichtbaar.length) return
    const huidig = geselecteerdId ? zichtbaar.findIndex((i) => i.id === geselecteerdId) : focusIndex
    const volgende = Math.min(zichtbaar.length - 1, Math.max(0, (huidig < 0 ? -1 : huidig) + richting))
    zetFocusIndex(volgende)
    if (geselecteerdId) openMail(zichtbaar[volgende])
  }, [zichtbaar, geselecteerdId, focusIndex, openMail])

  // ── Acties met undo ──
  const doelIds = useCallback((item?: EmailLijstItem) => {
    if (item) return [item.id]
    if (aangevinkt.size) return [...aangevinkt]
    if (geselecteerdId) return [geselecteerdId]
    const gefocust = zichtbaar[focusIndex]
    return gefocust ? [gefocust.id] : []
  }, [aangevinkt, geselecteerdId, zichtbaar, focusIndex])

  const naActie = useCallback((ids: string[]) => {
    zetAangevinkt(new Set())
    if (geselecteerdId && ids.includes(geselecteerdId)) {
      const rest = zichtbaar.filter((i) => !ids.includes(i.id))
      const volgende = rest[Math.min(focusIndex, rest.length - 1)]
      if (volgende) openMail(volgende)
      else zetGeselecteerd(null)
    }
  }, [geselecteerdId, zichtbaar, focusIndex, openMail])

  const archiveer = useCallback((item?: EmailLijstItem) => {
    const ids = doelIds(item)
    if (!ids.length) return
    hapticLight()
    const undo = mailStore.archiveer(ids)
    toonUndo(`${meervoud(ids.length, 'Mail', 'mails')} gearchiveerd`, undo)
    naActie(ids)
  }, [doelIds, naActie])

  const verwijder = useCallback((item?: EmailLijstItem) => {
    const ids = doelIds(item)
    if (!ids.length) return
    hapticLight()
    const undo = mailStore.verwijder(ids)
    toonUndo(`${meervoud(ids.length, 'Mail', 'mails')} verwijderd`, undo)
    naActie(ids)
  }, [doelIds, naActie])

  const wisselGelezen = useCallback((item?: EmailLijstItem) => {
    const ids = doelIds(item)
    if (!ids.length) return
    const eerste = mailStore.item(ids[0])
    void mailStore.zetGelezen(ids, !eerste?.gelezen)
    zetAangevinkt(new Set())
  }, [doelIds])

  const wisselPin = useCallback((item?: EmailLijstItem) => {
    const ids = doelIds(item)
    if (!ids.length) return
    const eerste = mailStore.item(ids[0])
    void mailStore.pin(ids, !eerste?.pinned)
  }, [doelIds])

  // ── Composer ──
  const eigenAdres = user?.email ?? null

  const openAntwoord = useCallback(async (modus: AntwoordModus, mail: EmailLijstItem, body: EmailBody | null, voorstel?: string) => {
    const inhoud = body ?? (await haalBody(mail.id, 'nu').catch(() => null))
    const doc = modus === 'doorsturen'
      ? documentVoorDoorsturen(mail, inhoud)
      : documentVoorAntwoord(mail, modus === 'allen', inhoud, eigenAdres)
    if (voorstel) doc.html = `<p>${voorstel}</p>${doc.html}`
    zetComposer({ document: doc, variant: isDesktop ? 'inline' : 'volledig' })
  }, [eigenAdres, isDesktop])

  const antwoordOpHuidige = useCallback((modus: AntwoordModus) => {
    const mail = geselecteerd ?? zichtbaar[focusIndex]
    if (mail) void openAntwoord(modus, mail, null)
  }, [geselecteerd, zichtbaar, focusIndex, openAntwoord])

  const nieuwBericht = useCallback((initieel?: Partial<ComposerDocument>) => {
    zetComposer({ document: documentVoorNieuw(initieel), variant: isDesktop ? 'paneel' : 'volledig' })
  }, [isDesktop])

  const sluitComposer = useCallback(() => {
    zetComposer(null)
    if (location.pathname.endsWith('/email/compose')) navigate('/email', { replace: true })
  }, [location.pathname, navigate])

  const naVerzenden = useCallback(() => {
    zetComposer(null)
    if (location.pathname.endsWith('/email/compose')) navigate('/email', { replace: true })
    void mailStore.ververs('verzonden')
    void mailStore.laadTellers()
  }, [location.pathname, navigate])

  // ── Toetsen ──
  useMailToetsen({
    volgende: () => naarBuur(1),
    vorige: () => naarBuur(-1),
    openen: () => { const m = zichtbaar[focusIndex]; if (m) openMail(m) },
    archiveren: () => archiveer(),
    verwijderen: () => verwijder(),
    antwoord: () => antwoordOpHuidige('antwoord'),
    allen: () => antwoordOpHuidige('allen'),
    doorsturen: () => antwoordOpHuidige('doorsturen'),
    nieuw: () => nieuwBericht(),
    snooze: () => zetSnoozeOpen(true),
    pin: () => wisselPin(),
    label: () => { const el = document.querySelector<HTMLButtonElement>('[title="Labels (l)"]'); if (el) el.click(); else toast('Open een mail om een label te kiezen') },
    ongelezen: () => wisselGelezen(),
    zoeken: () => { const el = document.querySelector<HTMLInputElement>('[data-mail-zoek]'); el?.focus() },
    kaart: () => zetKaartOpen(true),
    sluiten: () => { if (composer) sluitComposer(); else if (geselecteerdId) zetGeselecteerd(null) },
    naarMap: zetMap,
    readerOpen: !!geselecteerdId,
    readerActies,
  }, !composer || !isDesktop)

  // ── Vinken ──
  const wisselVink = useCallback((id: string, e?: React.MouseEvent) => {
    zetAangevinkt((oud) => {
      const nieuw = new Set(oud)
      if (e?.shiftKey && laatsteVinkRef.current) {
        const van = zichtbaar.findIndex((i) => i.id === laatsteVinkRef.current)
        const tot = zichtbaar.findIndex((i) => i.id === id)
        if (van >= 0 && tot >= 0) {
          for (let i = Math.min(van, tot); i <= Math.max(van, tot); i++) nieuw.add(zichtbaar[i].id)
          return nieuw
        }
      }
      if (nieuw.has(id)) nieuw.delete(id)
      else nieuw.add(id)
      laatsteVinkRef.current = id
      return nieuw
    })
  }, [zichtbaar])

  const wisselGroep = useCallback((ids: string[]) => {
    zetAangevinkt((oud) => {
      const nieuw = new Set(oud)
      const allesAan = ids.every((id) => oud.has(id))
      for (const id of ids) { if (allesAan) nieuw.delete(id); else nieuw.add(id) }
      return nieuw
    })
  }, [])

  // ── Onderdelen van het scherm ──
  const railTellers = tellers as Partial<Record<MailMap, number>>
  const legeTekst = legeStaatVoor(map, railTellers, filter, zoekt)
  const gebruiker = {
    naam: [user?.user_metadata?.voornaam, user?.user_metadata?.achternaam].filter(Boolean).join(' ') || undefined,
    email: user?.email,
    initiaal: (user?.email?.[0] ?? 'D').toUpperCase(),
    avatar: getAvatarStyle(user?.email ?? ''),
  }

  const bovenin = (
    <>
      {sync.status !== 'ok' && <GezondheidBanner sync={sync} onVerbinden={() => navigate('/instellingen?tab=email')} />}
      {map === 'verzonden' && <OutboxRijen actief />}
    </>
  )

  const lijst = (
    <MailLijst
      items={zichtbaar}
      map={map}
      geselecteerdId={geselecteerdId}
      aangevinkt={aangevinkt}
      focusIndex={focusIndex}
      dichtheid={isDesktop ? dichtheid : 'comfortabel'}
      swipeLinks={swipeLinks}
      laden={bron.laden}
      klaar={bron.klaar}
      onLaadMeer={bron.laadMeer}
      onSelect={(item) => openMail(item)}
      onToggleCheck={wisselVink}
      onToggleGroep={wisselGroep}
      onPin={wisselPin}
      onArchiveer={archiveer}
      onVerwijder={verwijder}
      onToggleGelezen={wisselGelezen}
      legeStaat={<LegeStaat tekst={legeTekst} onSprong={zetMap} mailboxGekoppeld={mailboxGekoppeld} onKoppelen={() => navigate('/instellingen?tab=email')} />}
      bovenin={bovenin}
      toonToewijzing={gedeeld}
      scrollSleutel={`${map}:${filter}:${labelFilter ?? ''}:${splitTab}:${zoekt ? 'zoek' : ''}`}
      pullToRefresh={{ actief: !isDesktop, onRefresh: async () => { await mailStore.ververs(map) } }}
    />
  )

  const composerNode = composer ? (
    <Composer
      document={composer.document}
      variant={composer.variant}
      onVerzonden={naVerzenden}
      onSluiten={sluitComposer}
      onHeropen={(doc) => zetComposer({ document: doc, variant: isDesktop ? 'paneel' : 'volledig' })}
    />
  ) : null

  const leesvenster = geselecteerdId ? (
    <Leesvenster
      emailId={geselecteerdId}
      compact={!isDesktop}
      onSluiten={() => zetGeselecteerd(null)}
      onVolgende={() => naarBuur(1)}
      onVorige={() => naarBuur(-1)}
      onAntwoord={(modus, mail, body, voorstel) => { void openAntwoord(modus, mail, body, voorstel) }}
      voet={composer?.variant === 'inline' ? composerNode : null}
      onBeantwoorden={() => antwoordOpHuidige('antwoord')}
      gedeeld={gedeeld}
    />
  ) : null

  // ── Mobiel ──
  if (!isDesktop) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-background">
        {!geselecteerdId && !composer && (
          <EmailMobileTopBar
            onOpenDrawer={() => zetLadeOpen(true)}
            searchInput={zoektekst}
            onSearchChange={zetZoektekst}
            selectedFolder={map}
            selectedFolderLabel={mapLabel(map)}
            todayUnreadCount={railTellers.inbox ?? 0}
            userInitial={gebruiker.initiaal}
            onOpenAI={() => navigate('/forgie')}
            onRefresh={() => { hapticLight(); void mailStore.ververs(map) }}
            isRefreshing={bezig}
            lastSyncAt={laatsteSync}
            nowTick={nu}
          />
        )}
        {composer?.variant === 'volledig' ? composerNode : geselecteerdId ? leesvenster : (
          map === 'leads' ? (
            <Suspense fallback={<Laden />}>
              <LeadsPaneel onMailLead={(email, body, leadId, onderwerp) => { nieuwBericht({ aan: [{ email }], onderwerp: onderwerp || '', html: body || '' }); if (leadId) void updateLeadStatus(leadId, 'benaderd').catch(() => {}) }} />
            </Suspense>
          ) : map === 'ingepland' ? (
            <Suspense fallback={<Laden />}>
              <IngeplandeBerichtenLijst onBewerk={(doc) => zetComposer({ document: doc, variant: 'volledig' })} />
            </Suspense>
          ) : lijst
        )}
        <MobieleMappenLade
          open={ladeOpen}
          onSluiten={() => zetLadeOpen(false)}
          actieveMap={map}
          tellers={railTellers}
          onKies={zetMap}
          onNieuw={() => { zetLadeOpen(false); nieuwBericht() }}
          gebruiker={gebruiker}
          focusModus={focusModus}
          onFocusModus={zetFocusModus}
          postvakken={postvakken.postvakken}
          actiefPostvak={postvakken.actief}
          onPostvak={postvakken.kies}
        />
        <SnoozeMenu open={snoozeOpen} onSluiten={() => zetSnoozeOpen(false)} onKies={(tot) => { const ids = doelIds(); if (ids.length) void mailStore.snooze(ids, tot ? tot.toISOString() : null); zetSnoozeOpen(false); naActie(ids) }} gesnoozed={map === 'gesnoozed'} />
      </div>
    )
  }

  // ── Desktop ──
  return (
    <div className="flex-1 flex min-h-0 bg-background">
      <Mappenrail
        actieveMap={map}
        tellers={railTellers}
        onKies={zetMap}
        onNieuw={() => nieuwBericht()}
        labels={railLabels}
        onLabels={zetRailLabels}
        focusModus={focusModus}
        onFocusModus={zetFocusModus}
        onInstellingen={() => navigate('/instellingen?tab=email')}
        postvakken={postvakken.postvakken}
        actiefPostvak={postvakken.actief}
        onPostvak={postvakken.kies}
        labelFilter={labelFilter}
        onLabelFilter={(l) => { zetLabelFilter(l); zetGeselecteerd(null) }}
      />

      {focusModus ? (
        <EmailFocusKaart onUitzetten={() => zetFocusModus(false)} />
      ) : map === 'leads' ? (
        <Suspense fallback={<Laden />}>
          <LeadsPaneel
            naastCompose={!!composer}
            onMailLead={(email, body, leadId, onderwerp) => { nieuwBericht({ aan: [{ email }], onderwerp: onderwerp || '', html: body || '' }); if (leadId) void updateLeadStatus(leadId, 'benaderd').catch((e) => logger.error('lead-status', e)) }}
          />
        </Suspense>
      ) : map === 'ingepland' ? (
        <Suspense fallback={<Laden />}>
          <IngeplandeBerichtenLijst onBewerk={(doc) => zetComposer({ document: doc, variant: 'paneel' })} />
        </Suspense>
      ) : (
        <>
          <div className="flex flex-col min-w-0 border-r border-border/70" style={{ width: geselecteerdId ? 470 : undefined, flex: geselecteerdId ? '0 0 auto' : '1 1 auto' }}>
            <div className="px-3 pt-3 pb-2 border-b border-border/60 flex-shrink-0">
              <Zoekbalk
                tekst={zoektekst}
                onTekst={zetZoektekst}
                chips={chips}
                onChip={(chip) => zetChips((c) => voegChipToe(c, chip))}
                onChipWeg={(i) => zetChips((c) => c.filter((_, idx) => idx !== i))}
                onWis={() => { zetZoektekst(''); zetChips([]) }}
                bezig={zoekt && zoekLijst.laden}
              />
            </div>
            <Lijstkop
              map={map}
              teller={zichtbaar.length}
              filter={filter}
              onFilter={zetFilter}
              filterTellers={filterTellers}
              aangevinkt={aangevinkt.size}
              allesAangevinkt={!!zichtbaar.length && aangevinkt.size === zichtbaar.length}
              deelsAangevinkt={aangevinkt.size > 0 && aangevinkt.size < zichtbaar.length}
              onAllesVinken={() => zetAangevinkt((oud) => (oud.size === zichtbaar.length ? new Set() : new Set(zichtbaar.map((i) => i.id))))}
              onWisSelectie={() => zetAangevinkt(new Set())}
              onBulkArchiveer={() => archiveer()}
              onBulkVerwijder={() => verwijder()}
              onBulkGelezen={() => { void mailStore.zetGelezen([...aangevinkt], true); zetAangevinkt(new Set()) }}
              onBulkOngelezen={() => { void mailStore.zetGelezen([...aangevinkt], false); zetAangevinkt(new Set()) }}
              dichtheid={dichtheid}
              onDichtheid={zetDichtheid}
              onVerversen={() => { void mailStore.ververs(map) }}
              bezig={bezig}
              laatsteSync={laatsteSync}
              nu={nu}
              onNieuw={() => nieuwBericht()}
              breed={!geselecteerdId}
              splitTabs={splitAan && map === 'inbox' && !zoekt}
              splitTab={splitTab}
              onSplitTab={(t) => { zetSplitTab(t); zetGeselecteerd(null) }}
              splitTellers={splitTellers}
              gedeeld={gedeeld}
              onBulkToewijzen={(sleutel) => { void mailStore.wijsToe([...aangevinkt], sleutel); zetAangevinkt(new Set()) }}
              onBulkLabel={(label, aan) => { void mailStore.label([...aangevinkt], label, aan) }}
            />
            {lijst}
          </div>

          {geselecteerdId && (
            <div className="flex-1 flex flex-col min-w-[420px]">
              {leesvenster}
            </div>
          )}

          {klantkaartAan && geselecteerd && !composer && (
            <Klantkaart
              mail={geselecteerd}
              open
              onSluiten={() => zetKlantkaartAan(false)}
              onZoekKlant={(klantId, label) => navigateWithTab({ path: `/klanten/${klantId}`, label, id: `/klanten/${klantId}` })}
              onSelectMail={(id) => { const m = mailStore.item(id); if (m) openMail(m) }}
              eigenAdres={eigenAdres ?? undefined}
            />
          )}
        </>
      )}

      {composer?.variant === 'paneel' && composerNode}

      <SnoozeMenu
        open={snoozeOpen}
        onSluiten={() => zetSnoozeOpen(false)}
        onKies={(tot) => { const ids = doelIds(); if (ids.length) void mailStore.snooze(ids, tot ? tot.toISOString() : null); zetSnoozeOpen(false); naActie(ids) }}
        gesnoozed={map === 'gesnoozed'}
      />
      <SneltoetsenKaart open={kaartOpen} readerOpen={!!geselecteerdId} onSluiten={() => zetKaartOpen(false)} />
      {klantDialoog && (
        <KlantToevoegenDialog
          open
          onSluiten={() => zetKlantDialoog(null)}
          afzenderNaam={klantDialoog.naam}
          afzenderEmail={klantDialoog.email}
          inhoud={klantDialoog.inhoud}
          onAangemaakt={() => { zetKlantDialoog(null); toast.success('Klant toegevoegd') }}
        />
      )}
    </div>
  )
}

function Laden() {
  return (
    <div className="flex-1 flex items-center justify-center py-10">
      <Loader2 className="h-4 w-4 animate-spin text-petrol/40" />
    </div>
  )
}
