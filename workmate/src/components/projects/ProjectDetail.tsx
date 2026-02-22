import React, { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Copy,
  Send,
  Mail,
  Paperclip,
  CheckCheck,
  Receipt,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  updateProject,
  createProject,
  createTaak,
  getOfferteItems,
  updateOfferte,
  createTekeningGoedkeuring,
  getKlanten,
  createFactuur,
  createFactuurItem,
  sendEmail,
} from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { analyzeProject } from '@/services/aiService'
import { sendEmail as sendGmailEmail } from '@/services/gmailService'
import { tekeningGoedkeuringTemplate } from '@/services/emailTemplateService'
import { useProjectData } from '@/hooks/useProjectData'
import { ProjectHeroBanner } from './ProjectHeroBanner'
import { ProjectBriefing } from './ProjectBriefing'
import { ProjectTakenBoard } from './ProjectTakenBoard'
import { ProjectDocumenten, getFileIcon, formatFileSize } from './ProjectDocumenten'
import { ProjectGoedkeuringen } from './ProjectGoedkeuringen'
import { ProjectSidebar } from './ProjectSidebar'
import { ProjectOfferteEditor } from './ProjectOfferteEditor'
import type { Offerte, OfferteItem, TekeningGoedkeuring, Klant } from '@/types'
import { logger } from '../../utils/logger'

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { offertePrefix, offerteGeldigheidDagen, standaardBtw, bedrijfsnaam, primaireKleur, emailHandtekening } = useAppSettings()

  // ── Central data hook ──
  const data = useProjectData(id)
  const {
    project, klant, taken, documenten, offertes, goedkeuringen,
    tijdregistraties, medewerkers, toewijzingen, werkbonnen, uitgaven,
    isLoading, setProject, setToewijzingen,
    refetchTaken, refetchDocumenten, refetchOffertes, refetchGoedkeuringen,
  } = data

  // ── AI analysis state ──
  const [aiAnalysisOpen, setAiAnalysisOpen] = useState(false)
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false)
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null)

  // ── Offerte editor state ──
  const [editOfferteId, setEditOfferteId] = useState<string | null>(null)

  // ── Verstuur naar klant state ──
  const [verstuurOpen, setVerstuurOpen] = useState(false)
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])
  const [selectedOfferteId, setSelectedOfferteId] = useState('')
  const [verstuurOnderwerp, setVerstuurOnderwerp] = useState('')
  const [verstuurBericht, setVerstuurBericht] = useState('')
  const [isVersturen, setIsVersturen] = useState(false)

  // ── Invoice from offerte state ──
  const [creatingFactuurForOfferte, setCreatingFactuurForOfferte] = useState<string | null>(null)

  // ── Project kopiëren state ──
  const [kopieDialogOpen, setKopieDialogOpen] = useState(false)
  const [kopieNaam, setKopieNaam] = useState('')
  const [kopieKlantId, setKopieKlantId] = useState('')
  const [kopieStartDatum, setKopieStartDatum] = useState(new Date().toISOString().split('T')[0])
  const [alleKlanten, setAlleKlanten] = useState<Klant[]>([])
  const [kopieBezig, setKopieBezig] = useState(false)

  // ── Email offerte state ──
  const [emailOfferteOpen, setEmailOfferteOpen] = useState(false)
  const [emailOnderwerp, setEmailOnderwerp] = useState('')
  const [emailBericht, setEmailBericht] = useState('')
  const [emailOfferteId, setEmailOfferteId] = useState<string | null>(null)
  const [isEmailVerzenden, setIsEmailVerzenden] = useState(false)

  // ── Handlers ──

  const handleAiAnalysis = async () => {
    if (!project) return
    setAiAnalysisLoading(true)
    setAiAnalysisOpen(true)
    setAiAnalysisResult(null)
    try {
      const result = await analyzeProject({
        naam: project.naam,
        beschrijving: project.beschrijving || '',
        status: project.status,
        budget: project.budget,
        besteed: project.besteed,
        voortgang: project.voortgang,
        taken: taken.map((t) => ({
          titel: t.titel,
          status: t.status,
          prioriteit: t.prioriteit,
        })),
      })
      setAiAnalysisResult(result)
    } catch {
      setAiAnalysisResult('Kon de analyse niet uitvoeren. Probeer het later opnieuw.')
    } finally {
      setAiAnalysisLoading(false)
    }
  }

  const openNieuweOfferte = () => {
    if (!project) return
    const params = new URLSearchParams({
      project_id: id || '',
      klant_id: project.klant_id || '',
      titel: project.naam || '',
    })
    navigate(`/offertes/nieuw?${params.toString()}`)
  }

  const openKopieDialog = async () => {
    if (!project) return
    setKopieNaam(`${project.naam} (kopie)`)
    setKopieKlantId(project.klant_id || '')
    setKopieStartDatum(new Date().toISOString().split('T')[0])
    try {
      const klanten = await getKlanten()
      setAlleKlanten(klanten)
    } catch {
      setAlleKlanten([])
    }
    setKopieDialogOpen(true)
  }

  const handleKopieerProject = async () => {
    if (!project || !user || !kopieNaam.trim()) return
    setKopieBezig(true)
    try {
      const gekozenKlant = alleKlanten.find(k => k.id === kopieKlantId)
      const newProject = await createProject({
        user_id: user.id,
        naam: kopieNaam.trim(),
        klant_id: kopieKlantId || project.klant_id,
        klant_naam: gekozenKlant?.bedrijfsnaam || project.klant_naam,
        beschrijving: project.beschrijving,
        status: 'gepland',
        prioriteit: project.prioriteit,
        start_datum: kopieStartDatum,
        eind_datum: '',
        budget: project.budget,
        besteed: 0,
        voortgang: 0,
        team_leden: [...project.team_leden],
        budget_waarschuwing_pct: project.budget_waarschuwing_pct,
        bron_project_id: project.id,
      })

      for (const taak of taken) {
        await createTaak({
          user_id: user.id,
          project_id: newProject.id,
          titel: taak.titel,
          beschrijving: taak.beschrijving,
          status: 'todo',
          prioriteit: taak.prioriteit,
          toegewezen_aan: taak.toegewezen_aan,
          deadline: '',
          geschatte_tijd: taak.geschatte_tijd,
          bestede_tijd: 0,
        })
      }

      toast.success(`Project "${kopieNaam}" aangemaakt met ${taken.length} taken`)
      setKopieDialogOpen(false)
      navigate(`/projecten/${newProject.id}`)
    } catch (err) {
      logger.error('Fout bij kopiëren project:', err)
      toast.error('Kon project niet kopiëren')
    } finally {
      setKopieBezig(false)
    }
  }

  const handleCreateFactuurFromOfferte = async (offerte: Offerte) => {
    if (!project || !user) return
    setCreatingFactuurForOfferte(offerte.id)
    try {
      const offerteItems = await getOfferteItems(offerte.id)
      const factuurNummer = `FAC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`
      const vervaldatum = new Date()
      vervaldatum.setDate(vervaldatum.getDate() + 30)

      const newFactuur = await createFactuur({
        user_id: user.id,
        klant_id: offerte.klant_id,
        offerte_id: offerte.id,
        project_id: id,
        nummer: factuurNummer,
        titel: offerte.titel,
        status: 'concept',
        subtotaal: offerte.subtotaal,
        btw_bedrag: offerte.btw_bedrag,
        totaal: offerte.totaal,
        betaald_bedrag: 0,
        factuurdatum: new Date().toISOString().split('T')[0],
        vervaldatum: vervaldatum.toISOString().split('T')[0],
        notities: `Factuur aangemaakt vanuit offerte ${offerte.nummer}`,
        voorwaarden: '',
        bron_type: 'offerte',
        bron_offerte_id: offerte.id,
        bron_project_id: id,
      })

      await Promise.all(
        offerteItems.map((item: OfferteItem, index: number) =>
          createFactuurItem({
            factuur_id: newFactuur.id,
            beschrijving: item.beschrijving,
            aantal: item.aantal,
            eenheidsprijs: item.eenheidsprijs,
            btw_percentage: item.btw_percentage,
            korting_percentage: item.korting_percentage,
            totaal: item.totaal,
            volgorde: index + 1,
          })
        )
      )

      await updateOfferte(offerte.id, {
        geconverteerd_naar_factuur_id: newFactuur.id,
      })

      toast.success(`Factuur ${factuurNummer} aangemaakt vanuit offerte ${offerte.nummer}`)
      navigate(`/facturen`)
    } catch (err) {
      logger.error('Fout bij aanmaken factuur:', err)
      toast.error('Kon factuur niet aanmaken')
    } finally {
      setCreatingFactuurForOfferte(null)
    }
  }

  const openVerstuurDialog = () => {
    if (!project || !klant) {
      toast.error('Klantgegevens niet beschikbaar')
      return
    }
    setSelectedDocIds([])
    setSelectedOfferteId('')
    setVerstuurOnderwerp(`Tekeningen - ${project.naam}`)
    setVerstuurBericht(
      `Beste ${klant.contactpersoon || project.klant_naam || 'klant'},\n\nBijgaand ontvangt u de tekening(en) voor het project "${project.naam}".\n\nGraag ontvangen wij uw goedkeuring of eventuele opmerkingen via de link in deze e-mail.\n\nMet vriendelijke groet`
    )
    setVerstuurOpen(true)
  }

  const handleVerstuurNaarKlant = async () => {
    if (!project || !klant || selectedDocIds.length === 0) {
      toast.error('Selecteer minimaal één bestand om te versturen')
      return
    }
    setIsVersturen(true)
    try {
      const gk = await createTekeningGoedkeuring({
        user_id: user?.id || '',
        project_id: id!,
        klant_id: project.klant_id,
        document_ids: selectedDocIds,
        offerte_id: selectedOfferteId || undefined,
        status: 'verzonden',
        email_aan: klant.email,
        email_onderwerp: verstuurOnderwerp,
        email_bericht: verstuurBericht,
        revisie_nummer: 1,
      })

      try {
        const goedkeurUrl = `${window.location.origin}/goedkeuring/${gk.token}`
        const { subject, html } = tekeningGoedkeuringTemplate({
          klantNaam: klant.contactpersoon || klant.bedrijfsnaam,
          projectNaam: project.naam,
          beschrijving: verstuurBericht,
          goedkeurUrl,
          bedrijfsnaam: bedrijfsnaam || undefined,
          primaireKleur: primaireKleur || undefined,
          handtekening: emailHandtekening || undefined,
        })
        await sendGmailEmail(klant.email, subject, '', { html })
      } catch (emailErr) {
        logger.error('Goedkeuring email mislukt:', emailErr)
        toast.error('Goedkeuring aangemaakt, maar email niet verzonden')
      }

      if (selectedOfferteId) {
        await updateOfferte(selectedOfferteId, { status: 'verzonden' })
      }

      toast.success('Tekeningen verstuurd naar klant!')
      setVerstuurOpen(false)
      await Promise.all([refetchGoedkeuringen(), refetchOffertes()])
    } catch (err) {
      logger.error('Fout bij versturen:', err)
      toast.error('Kon niet versturen naar klant')
    } finally {
      setIsVersturen(false)
    }
  }

  const handleOfferteEmail = async (offerte: Offerte) => {
    setEmailOfferteId(offerte.id)
    setEmailOnderwerp(`Offerte ${offerte.nummer} - ${offerte.titel}`)
    setEmailBericht(
      `Beste ${project?.klant_naam || 'klant'},\n\nHierbij ontvangt u onze offerte "${offerte.titel}" (${offerte.nummer}) ter waarde van ${formatCurrency(offerte.totaal)}.\n\nDeze offerte is geldig tot ${formatDate(offerte.geldig_tot)}.\n\nMocht u vragen hebben, neem dan gerust contact met ons op.\n\nMet vriendelijke groet`
    )
    setEmailOfferteOpen(true)
  }

  const handleSendOfferteEmail = async () => {
    setIsEmailVerzenden(true)
    try {
      // Actually send the email
      if (klant?.email && emailOnderwerp.trim()) {
        try {
          await sendGmailEmail(klant.email, emailOnderwerp, emailBericht)
        } catch (emailErr) {
          logger.error('Email versturen mislukt:', emailErr)
        }
      }

      if (emailOfferteId) {
        await updateOfferte(emailOfferteId, { status: 'verzonden' })
      }
      toast.success('Offerte succesvol verzonden via e-mail!')
      setEmailOfferteOpen(false)
      setEmailOnderwerp('')
      setEmailBericht('')
      setEmailOfferteId(null)
      await refetchOffertes()
    } catch (err) {
      logger.error('Fout bij verzenden offerte:', err)
      toast.error('Kon offerte niet verzenden')
    } finally {
      setIsEmailVerzenden(false)
    }
  }

  const handleRevisieVerstuur = (gk: TekeningGoedkeuring) => {
    if (!project || !klant) return
    setSelectedDocIds(gk.document_ids)
    setSelectedOfferteId(gk.offerte_id || '')
    setVerstuurOnderwerp(`Revisie - ${project.naam}`)
    setVerstuurBericht(
      `Beste ${klant.contactpersoon || project.klant_naam || 'klant'},\n\nHierbij ontvangt u de aangepaste tekening(en) voor het project "${project.naam}".\n\nWij hebben de volgende aanpassingen verwerkt:\n- ${gk.revisie_opmerkingen}\n\nGraag ontvangen wij opnieuw uw goedkeuring.\n\nMet vriendelijke groet`
    )
    setVerstuurOpen(true)
  }

  const toggleDocSelection = (docId: string) => {
    setSelectedDocIds(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    )
  }

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <Button variant="ghost" asChild>
          <Link to="/projecten">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Terug naar projecten
          </Link>
        </Button>
        <Card>
          <CardContent className="py-16 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-sm text-muted-foreground mt-4">Project laden...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link to="/projecten">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Terug naar projecten
          </Link>
        </Button>
        <Card>
          <CardContent className="py-16 text-center">
            <h3 className="text-lg font-medium text-foreground">Project niet gevonden</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Het project met ID "{id}" bestaat niet.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ── Hero Banner ── */}
      <ProjectHeroBanner
        project={project}
        klant={klant}
        goedkeuringen={goedkeuringen}
        taken={taken}
        tijdregistraties={tijdregistraties}
        onAiAnalysis={handleAiAnalysis}
        aiAnalysisLoading={aiAnalysisLoading}
        onKopieer={openKopieDialog}
      />

      {/* ── Briefing ── */}
      <ProjectBriefing
        project={project}
        onProjectUpdate={(updated) => setProject(updated)}
      />

      {/* ── Main Layout: Taken + Sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Taken (hoofdcontent) */}
        <div className="lg:col-span-2 space-y-4">
          <ProjectTakenBoard
            projectId={id!}
            taken={taken}
            onTakenChanged={refetchTaken}
          />

          {/* Goedkeuringen */}
          <ProjectGoedkeuringen
            goedkeuringen={goedkeuringen}
            projectNaam={project.naam}
            klantNaam={klant?.contactpersoon || project.klant_naam || ''}
            onRevisieVerstuur={handleRevisieVerstuur}
          />
        </div>

        {/* Rechter Sidebar */}
        <div className="space-y-6">
          <ProjectSidebar
            project={project}
            offertes={offertes}
            medewerkers={medewerkers}
            toewijzingen={toewijzingen}
            werkbonnen={werkbonnen}
            uitgaven={uitgaven}
            onToewijzingenChanged={setToewijzingen}
            onOfferteView={(id) => navigate(`/offertes/${id}/bewerken`)}
            onOfferteEdit={(id) => navigate(`/offertes/${id}/bewerken`)}
            onOfferteEmail={handleOfferteEmail}
            onOfferteFactuur={handleCreateFactuurFromOfferte}
            onNieuweOfferte={openNieuweOfferte}
            creatingFactuurForOfferte={creatingFactuurForOfferte}
          />

          {/* Bestanden */}
          <ProjectDocumenten
            projectId={id!}
            project={project}
            documenten={documenten}
            onDocumentenChanged={refetchDocumenten}
            onVerstuurClick={openVerstuurDialog}
          />
        </div>
      </div>

      {/* ── Offerte Editor Dialog ── */}
      {editOfferteId && (
        <ProjectOfferteEditor
          offerteId={editOfferteId}
          open={!!editOfferteId}
          onClose={() => setEditOfferteId(null)}
          onSaved={refetchOffertes}
        />
      )}

      {/* ── AI Analyse dialog ── */}
      <Dialog open={aiAnalysisOpen} onOpenChange={setAiAnalysisOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              AI Projectanalyse
            </DialogTitle>
            <DialogDescription>
              AI-gegenereerde analyse van {project.naam}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {aiAnalysisLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
                <p className="text-sm text-muted-foreground">Analyse wordt uitgevoerd...</p>
              </div>
            ) : aiAnalysisResult ? (
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm text-foreground leading-relaxed">
                {aiAnalysisResult}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiAnalysisOpen(false)}>Sluiten</Button>
            <Button onClick={handleAiAnalysis} disabled={aiAnalysisLoading} className="bg-gradient-to-r from-accent to-primary border-0">
              {aiAnalysisLoading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
              Opnieuw analyseren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Verstuur naar klant dialog ── */}
      <Dialog open={verstuurOpen} onOpenChange={(open) => {
        setVerstuurOpen(open)
        if (!open) { setSelectedDocIds([]); setSelectedOfferteId('') }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-accent" />
              Verstuur naar klant ter goedkeuring
            </DialogTitle>
            <DialogDescription>
              Selecteer bestanden en eventueel een offerte om naar {klant?.contactpersoon || project.klant_naam || 'de klant'} te versturen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-blue-600" />
                  Selecteer bestanden
                </Label>
                {documenten.length > 1 && (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs"
                    onClick={() => {
                      if (selectedDocIds.length === documenten.length) setSelectedDocIds([])
                      else setSelectedDocIds(documenten.map(d => d.id))
                    }}
                  >
                    <CheckCheck className="h-3 w-3 mr-1" />
                    {selectedDocIds.length === documenten.length ? 'Deselecteer' : 'Selecteer alles'}
                  </Button>
                )}
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto border rounded-lg p-2">
                {documenten.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-3">Geen bestanden. Upload eerst bestanden.</p>
                ) : documenten.map((doc) => (
                  <label key={doc.id} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                    selectedDocIds.includes(doc.id)
                      ? 'bg-primary/10 dark:bg-primary/20 border border-primary/30'
                      : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 border border-transparent'
                  }`}>
                    <input type="checkbox" checked={selectedDocIds.includes(doc.id)} onChange={() => toggleDocSelection(doc.id)}
                      className="rounded border-gray-300 text-accent focus:ring-primary" />
                    <div className="flex-shrink-0">{getFileIcon(doc.type, 'h-5 w-5')}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{doc.naam}</p>
                      <span className="text-[10px] text-muted-foreground">{formatFileSize(doc.grootte)}</span>
                    </div>
                  </label>
                ))}
              </div>
              {selectedDocIds.length > 0 && (
                <p className="text-xs text-accent">{selectedDocIds.length} bestand(en) geselecteerd</p>
              )}
            </div>

            {offertes.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-amber-600" />
                  Offerte bijvoegen (optioneel)
                </Label>
                <select value={selectedOfferteId} onChange={e => setSelectedOfferteId(e.target.value)}
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                  <option value="">Geen offerte bijvoegen</option>
                  {offertes.map(o => (
                    <option key={o.id} value={o.id}>{o.nummer} - {o.titel} ({formatCurrency(o.totaal)})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Aan</Label>
              <Input value={klant?.email || project.klant_naam || ''} readOnly className="bg-gray-50 dark:bg-gray-800" />
            </div>
            <div className="space-y-2">
              <Label>Onderwerp</Label>
              <Input value={verstuurOnderwerp} onChange={e => setVerstuurOnderwerp(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Bericht</Label>
              <Textarea value={verstuurBericht} onChange={e => setVerstuurBericht(e.target.value)} rows={6} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerstuurOpen(false)}>Annuleren</Button>
            <Button disabled={isVersturen || selectedDocIds.length === 0 || !verstuurOnderwerp.trim()}
              className="bg-gradient-to-r from-accent to-primary border-0"
              onClick={handleVerstuurNaarKlant}>
              <Send className="mr-1.5 h-4 w-4" />
              {isVersturen ? 'Versturen...' : `Verstuur (${selectedDocIds.length} bestanden)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Email offerte dialog ── */}
      <Dialog open={emailOfferteOpen} onOpenChange={(open) => {
        setEmailOfferteOpen(open)
        if (!open) { setEmailOnderwerp(''); setEmailBericht(''); setEmailOfferteId(null) }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-accent" />
              Offerte versturen via e-mail
            </DialogTitle>
            <DialogDescription>
              Verstuur deze offerte naar {project.klant_naam || 'de klant'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Aan</Label>
              <Input value={klant?.email || project.klant_naam || 'Klant'} readOnly className="bg-gray-50 dark:bg-gray-800" />
            </div>
            <div className="space-y-2">
              <Label>Onderwerp</Label>
              <Input value={emailOnderwerp} onChange={(e) => setEmailOnderwerp(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Bericht</Label>
              <Textarea value={emailBericht} onChange={(e) => setEmailBericht(e.target.value)} rows={8} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailOfferteOpen(false)}>Annuleren</Button>
            <Button disabled={isEmailVerzenden || !emailOnderwerp.trim()}
              className="bg-gradient-to-r from-accent to-primary border-0"
              onClick={handleSendOfferteEmail}>
              <Send className="mr-1.5 h-4 w-4" />
              {isEmailVerzenden ? 'Verzenden...' : 'Versturen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Kopieer project dialog ── */}
      <Dialog open={kopieDialogOpen} onOpenChange={(open) => {
        setKopieDialogOpen(open)
        if (!open) { setKopieNaam(''); setKopieKlantId('') }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5 text-accent" />
              Project kopiëren
            </DialogTitle>
            <DialogDescription>
              Taken en teamleden worden gekopieerd. Tijdregistraties, facturen en documenten niet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Projectnaam</Label>
              <Input value={kopieNaam} onChange={(e) => setKopieNaam(e.target.value)} placeholder="Naam van het nieuwe project" />
            </div>
            <div className="space-y-2">
              <Label>Klant</Label>
              <select value={kopieKlantId} onChange={(e) => setKopieKlantId(e.target.value)}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="">Zelfde klant behouden</option>
                {alleKlanten.map((k) => (
                  <option key={k.id} value={k.id}>{k.bedrijfsnaam}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Startdatum</Label>
              <Input type="date" value={kopieStartDatum} onChange={(e) => setKopieStartDatum(e.target.value)} />
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
              <p>Wordt gekopieerd:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>{taken.length} taken (status wordt reset naar 'todo')</li>
                <li>{project.team_leden.length} teamleden</li>
                <li>Budget: {formatCurrency(project.budget)}</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKopieDialogOpen(false)}>Annuleren</Button>
            <Button disabled={kopieBezig || !kopieNaam.trim()}
              className="bg-gradient-to-r from-accent to-primary border-0"
              onClick={handleKopieerProject}>
              {kopieBezig ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Copy className="h-4 w-4 mr-1.5" />}
              {kopieBezig ? 'Kopiëren...' : 'Project kopiëren'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
