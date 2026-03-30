export {
  getOffertes, getOfferte, getOffertesByProject, getOffertesByKlant,
  getKlantOfferteContext, getMateriaalSuggesties,
  createOfferte, updateOfferte, deleteOfferte, OfferteConflictError,
  getOfferteItems, createOfferteItem, updateOfferteItem, deleteOfferteItem,
  syncOfferteItems, getRecentOfferteItemSuggesties,
  getNextOfferteNummer, generateOfferteNummer,
  getOfferteVersies, createOfferteVersie,
  getOfferteTemplates, createOfferteTemplate, updateOfferteTemplate, deleteOfferteTemplate,
  getCalculatieProducten, createCalculatieProduct, updateCalculatieProduct, deleteCalculatieProduct,
  getCalculatieTemplates, createCalculatieTemplate, updateCalculatieTemplate, deleteCalculatieTemplate,
  getTekeningGoedkeuringen, getTekeningGoedkeuringByToken,
  createTekeningGoedkeuring, updateTekeningGoedkeuring, updateTekeningGoedkeuringByToken,
} from './offerteService'

export {
  getVoorraadArtikelen, getVoorraadArtikel, getVoorraadArtikelenBijMinimum,
  createVoorraadArtikel, updateVoorraadArtikel, deleteVoorraadArtikel,
  getVoorraadMutaties, getVoorraadMutatiesByProject,
  createVoorraadMutatie, deleteVoorraadMutatie,
} from './voorraadService'

export {
  getWerkbonnen, getWerkbon, getWerkbonnenByProject, getWerkbonnenByOfferte, getWerkbonnenByKlant,
  createWerkbon, updateWerkbon, deleteWerkbon,
  getWerkbonRegels, createWerkbonRegel, updateWerkbonRegel, deleteWerkbonRegel,
  getWerkbonFotos, createWerkbonFoto, deleteWerkbonFoto,
  getWerkbonItems, createWerkbonItem, updateWerkbonItem, deleteWerkbonItem,
  getWerkbonAfbeeldingen, createWerkbonAfbeelding, deleteWerkbonAfbeelding,
} from './werkbonService'

export {
  generateBetaalToken, getFactuurByBetaalToken, markFactuurBekeken,
  getOfferteByPubliekToken, updateOfferteTracking, respondOpOfferte,
  getDefaultPortaalInstellingen, getPortaalInstellingen, updatePortaalInstellingen,
  getAllPortalen, getPortaalByProject, getPortaalByToken, createPortaal,
  verlengPortaal, deactiveerPortaal, getPortaalItems, createPortaalItem,
  updatePortaalItem, deletePortaalItem, createPortaalBestand, createPortaalReactie,
  getAppNotificaties, createAppNotificatie, markeerNotificatieGelezen,
  markeerAlleNotificatiesGelezen, updateNotificatieActie, getAllePortalen,
} from './portaalService'

export {
  getEvents, getEvent, createEvent, updateEvent, deleteEvent,
  getMontageAfspraken, createMontageAfspraak, updateMontageAfspraak, deleteMontageAfspraak,
  getMontageAfsprakenByProject, getMontageAfsprakenByKlant,
  getVerlof, getVerlofByMedewerker, createVerlof, updateVerlof, deleteVerlof,
  getBedrijfssluitingsdagen, createBedrijfssluitingsdag, deleteBedrijfssluitingsdag,
} from './planningService'

export {
  getEmails, getEmail, getEmailBody, createEmail, updateEmail, deleteEmail,
  cacheEmailsToSupabase, getCachedEmails,
  getGedeeldeEmails, getGedeeldeEmailsByToewijzing, updateEmailToewijzing,
  updateEmailTicketStatus, addInterneNotitie,
  createEmailOpvolging,
} from './emailService'

export {
  getDocumenten, getDocument, createDocument, updateDocument, deleteDocument,
  getDocumentenByProject, getDocumentenByKlant,
  getDocumentStyle, upsertDocumentStyle, uploadBriefpapier,
  uploadVervolgpapier,
} from './documentenService'

export {
  getKlanten, getKlant, createKlant, updateKlant, deleteKlant,
  getAllKlantLabels,
  getContactpersonenDB, getContactpersonenByKlant, createContactpersoonDB, updateContactpersoonDB, deleteContactpersoonDB,
  koppelContactAanKlant, ontkoppelContact,
  getKlantHistorie,
  getImportLogs, createImportLog, deleteImportLog, deleteAllImportLogs, opschonenAlleImportData,
  markeerAlsLosContact, bulkDeleteContactpersonen,
} from './klantService'

export {
  getFacturen, getFactuur, createFactuur, updateFactuur, deleteFactuur,
  getFactuurItems, createFactuurItem,
  getFacturenByKlant, getFacturenByProject,
  getVerlopenFacturen, updateFactuurStatus,
  getHerinneringTemplates, getDefaultHerinneringTemplates,
  createHerinneringTemplate, updateHerinneringTemplate, deleteHerinneringTemplate,
  generateFactuurNummer, generateCreditnotaNummer,
  createCreditnota, createVoorschotfactuur,
} from './factuurService'

export {
  getProjecten, getProject, getProjectenByKlant, createProject, updateProject, deleteProject,
  getTaken, getTaak, getTakenByProject, createTaak, uploadTaakBijlage, updateTaak, deleteTaak,
  getTijdregistratiesByProject,
  getProjectToewijzingen, getProjectToewijzingenVoorMedewerker, createProjectToewijzing, deleteProjectToewijzing,
  getProjectFotos, createProjectFoto, deleteProjectFoto,
  generateProjectNummer,
} from './projectService'

export {
  getProfile, uploadAvatar, updateProfile,
  getDefaultAppSettings, getAppSettings, updateAppSettings,
  createOrganisatie, getOrganisatie, updateOrganisatie,
  getMedewerkers, createMedewerker, updateMedewerker, deleteMedewerker,
  getNotificaties, createNotificatie, markNotificatieGelezen, markAlleNotificatiesGelezen,
  deleteNotificatie,
  getAuditLog, createAuditLogEntry,
} from './profielService'

export {
  getGrootboek, createGrootboekRekening, updateGrootboekRekening, deleteGrootboekRekening,
  getKostenplaatsen, createKostenplaats, updateKostenplaats, deleteKostenplaats,
  getBtwCodes, createBtwCode, updateBtwCode, deleteBtwCode,
  getKortingen, createKorting, updateKorting, deleteKorting,
  getLeveranciers, getLeverancier, createLeverancier, updateLeverancier, deleteLeverancier,
  getUitgaven, getUitgave, getUitgavenByProject, getUitgavenByLeverancier,
  createUitgave, updateUitgave, deleteUitgave, getUitgavenTotaalByProject,
  generateBestelbonNummer, getBestelbonnen, getBestelbon, getBestelbonnenByProject, getBestelbonnenByLeverancier,
  createBestelbon, updateBestelbon, deleteBestelbon,
  getBestelbonRegels, createBestelbonRegel, updateBestelbonRegel, deleteBestelbonRegel,
  getLeveringsbonnen, getLeveringsbon, getLeveringsbonnenByProject, getLeveringsbonnenByKlant,
  createLeveringsbon, updateLeveringsbon, deleteLeveringsbon,
  getLeveringsbonRegels, createLeveringsbonRegel, updateLeveringsbonRegel, deleteLeveringsbonRegel,
} from './boekhoudingService'

export {
  getSigningVisualisaties, getSigningVisualisatiesByOfferte, getSigningVisualisatiesByProject, getSigningVisualisatiesByKlant,
  createSigningVisualisatie, updateSigningVisualisatie, deleteSigningVisualisatie,
  getVisualizerInstellingen, saveVisualizerInstellingen,
  logVisualizerActie, getVisualizerLog, getVisualizerStats,
  getVisualizerCredits, gebruikCredit, voegCreditsToe, handmatigCreditsToewijzen, getCreditTransacties,
  DEMO_CREDITS,
  getForgieGebruik,
} from './visualizerService'

export {
  getKbCategories, createKbCategory, updateKbCategory, deleteKbCategory,
  getKbArticles, getKbArticle, createKbArticle, updateKbArticle, deleteKbArticle,
} from './kbService'

export {
  getDeals, getDeal, getDealsByKlant, getDealsByFase, getDealsByMedewerker,
  createDeal, updateDeal, deleteDeal,
  getDealActiviteiten, createDealActiviteit, deleteDealActiviteit,
  generateLeadToken,
  getLeadFormulieren, getLeadFormulier, getLeadFormulierByToken,
  createLeadFormulier, updateLeadFormulier, deleteLeadFormulier,
  getLeadInzendingen, getAllLeadInzendingen, getLeadInzendingenNieuw,
  createLeadInzending, updateLeadInzending,
  getInkoopOffertes, getInkoopOffertesByProject, getInkoopOffertesByOfferte,
  createInkoopOfferte, createInkoopRegel, updateInkoopRegel, deleteInkoopOfferte,
} from './crmService'

export {
  getBookingSlots, createBookingSlot, updateBookingSlot, deleteBookingSlot,
  getBookingAfspraken, getBookingAfspraakByToken, createBookingAfspraak, updateBookingAfspraak,
} from './bookingService'

export {
  getTijdregistraties, createTijdregistratie, updateTijdregistratie, deleteTijdregistratie,
  getTijdregistratiesByMedewerker,
} from './tijdregistratieService'

export {
  getAIChats, createAIChat, deleteAIChats,
} from './aiChatService'

export {
  getOpvolgSchemas, getDefaultOpvolgSchema, createOpvolgSchema, updateOpvolgSchema, deleteOpvolgSchema,
  upsertOpvolgStap, deleteOpvolgStap, ensureDefaultOpvolgSchema, getOpvolgLog,
} from './opvolgingService'

// ============ CONVERSIE FUNCTIES ============
// Deze blijven hier omdat ze cross-domain afhankelijkheden hebben

import { assertId, round2 } from './supabaseHelpers'
import { createFactuur, createFactuurItem, generateFactuurNummer } from './factuurService'
import { getOfferte, getOfferteItems, updateOfferte } from './offerteService'
import { getWerkbon, getWerkbonRegels, updateWerkbon } from './werkbonService'
import type { Factuur, FactuurItem, Werkbon } from '@/types'

export async function convertOfferteToFactuur(
  offerteId: string,
  userId: string,
  factuurPrefix: string = 'FAC'
): Promise<Factuur> {
  assertId(offerteId, 'offerte_id')
  const offerte = await getOfferte(offerteId)
  if (!offerte) throw new Error('Offerte niet gevonden')
  const nummer = await generateFactuurNummer(factuurPrefix)
  const items = await getOfferteItems(offerteId)
  const factuur = await createFactuur({
    user_id: userId,
    klant_id: offerte.klant_id,
    klant_naam: offerte.klant_naam,
    offerte_id: offerteId,
    project_id: offerte.project_id || '',
    nummer,
    titel: offerte.titel,
    status: 'concept',
    subtotaal: round2(offerte.subtotaal),
    btw_bedrag: round2(offerte.btw_bedrag),
    totaal: round2(offerte.totaal),
    betaald_bedrag: 0,
    factuurdatum: new Date().toISOString().split('T')[0],
    vervaldatum: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    notities: offerte.notities || '',
    voorwaarden: offerte.voorwaarden || '',
    bron_type: 'offerte',
    bron_offerte_id: offerteId,
    factuur_type: 'standaard',
    contactpersoon_id: offerte.contactpersoon_id,
    intro_tekst: offerte.intro_tekst,
    outro_tekst: offerte.outro_tekst,
  } as Omit<Factuur, 'id' | 'created_at' | 'updated_at'>)
  for (const item of items) {
    await createFactuurItem({
      user_id: userId,
      factuur_id: factuur.id,
      beschrijving: item.beschrijving,
      aantal: item.aantal,
      eenheidsprijs: round2(item.eenheidsprijs),
      btw_percentage: item.btw_percentage,
      korting_percentage: item.korting_percentage,
      totaal: round2(item.totaal),
      volgorde: item.volgorde,
    } as Omit<FactuurItem, 'id' | 'created_at'>)
  }
  await updateOfferte(offerteId, { status: 'gefactureerd', geconverteerd_naar_factuur_id: factuur.id })
  return factuur
}

export async function convertWerkbonToFactuur(
  werkbonId: string,
  userId: string,
  factuurPrefix: string = 'FAC'
): Promise<Factuur> {
  assertId(werkbonId, 'werkbon_id')
  const werkbon = await getWerkbon(werkbonId)
  if (!werkbon) throw new Error('Werkbon niet gevonden')
  const regels = await getWerkbonRegels(werkbonId)
  const nummer = await generateFactuurNummer(factuurPrefix)
  const factureerbaar = regels.filter((r) => r.factureerbaar)
  const subtotaal = round2(factureerbaar.reduce((sum, r) => sum + r.totaal, 0))
  const kmTotaal = round2((werkbon.kilometers || 0) * (werkbon.km_tarief || 0))
  const totaalSubtotaal = round2(subtotaal + kmTotaal)
  const btw_bedrag = round2(totaalSubtotaal * 0.21)
  const totaal = round2(totaalSubtotaal + btw_bedrag)
  const factuur = await createFactuur({
    user_id: userId,
    klant_id: werkbon.klant_id,
    project_id: werkbon.project_id,
    nummer,
    titel: `Factuur werkbon ${werkbon.werkbon_nummer}`,
    status: 'concept',
    subtotaal: totaalSubtotaal,
    btw_bedrag,
    totaal,
    betaald_bedrag: 0,
    factuurdatum: new Date().toISOString().split('T')[0],
    vervaldatum: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    notities: werkbon.omschrijving || '',
    voorwaarden: '',
    bron_type: 'project',
    bron_project_id: werkbon.project_id,
    werkbon_id: werkbonId,
    factuur_type: 'standaard',
    contactpersoon_id: werkbon.contactpersoon_id,
  } as Omit<Factuur, 'id' | 'created_at' | 'updated_at'>)
  let volgorde = 0
  for (const regel of factureerbaar) {
    await createFactuurItem({
      user_id: userId,
      factuur_id: factuur.id,
      beschrijving: regel.omschrijving,
      aantal: regel.aantal || 1,
      eenheidsprijs: round2(regel.type === 'arbeid' ? (regel.uurtarief || 0) : (regel.prijs_per_eenheid || 0)),
      btw_percentage: 21,
      korting_percentage: 0,
      totaal: round2(regel.totaal),
      volgorde: volgorde++,
    } as Omit<FactuurItem, 'id' | 'created_at'>)
  }
  if (kmTotaal > 0) {
    await createFactuurItem({
      user_id: userId,
      factuur_id: factuur.id,
      beschrijving: `Kilometervergoeding (${werkbon.kilometers} km x €${werkbon.km_tarief})`,
      aantal: werkbon.kilometers || 0,
      eenheidsprijs: werkbon.km_tarief || 0,
      btw_percentage: 21,
      korting_percentage: 0,
      totaal: round2(kmTotaal),
      volgorde: volgorde++,
    } as Omit<FactuurItem, 'id' | 'created_at'>)
  }
  await updateWerkbon(werkbonId, { status: 'gefactureerd' } as Partial<Werkbon>)
  return factuur
}

