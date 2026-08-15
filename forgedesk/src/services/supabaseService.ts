export {
  getOffertes, zoekOffertes, getOfferte, getOffertesByProject, getOffertesByKlant,
  getMateriaalSuggesties,
  createOfferte, updateOfferte, deleteOfferte, OfferteConflictError,
  getOfferteItems, getOfferteItemsVoorOffertes, createOfferteItem, updateOfferteItem, deleteOfferteItem,
  syncOfferteItems, getRecentOfferteItemSuggesties,
  getNextOfferteNummer, generateOfferteNummer,
  getOfferteVersies, createOfferteVersie,
  getOfferteTemplates, createOfferteTemplate, updateOfferteTemplate, deleteOfferteTemplate,
  getCalculatieProducten, createCalculatieProduct, updateCalculatieProduct, deleteCalculatieProduct,
  getCalculatieTemplates, createCalculatieTemplate, updateCalculatieTemplate, deleteCalculatieTemplate,
  getTekeningGoedkeuringen,
  createTekeningGoedkeuring,
} from './offerteService'

export {
  getVoorraadArtikelen, getVoorraadArtikel, getVoorraadArtikelenBijMinimum,
  createVoorraadArtikel, updateVoorraadArtikel, deleteVoorraadArtikel,
  getVoorraadMutaties, getVoorraadMutatiesByProject,
  createVoorraadMutatie, deleteVoorraadMutatie,
} from './voorraadService'

export {
  getWerkbonnen, getWerkbon, getWerkbonnenByProject, getWerkbonnenByKlant,
  createWerkbon, updateWerkbon, deleteWerkbon,
  getWerkbonFotos, createWerkbonFoto, deleteWerkbonFoto,
  getWerkbonItems, createWerkbonItem, updateWerkbonItem, deleteWerkbonItem,
  getWerkbonAfbeeldingen, createWerkbonAfbeelding, updateWerkbonAfbeelding, deleteWerkbonAfbeelding,
} from './werkbonService'

export {
  generateBetaalToken,
  getDefaultPortaalInstellingen, getPortaalInstellingen, updatePortaalInstellingen,
  getAllPortalen, getPortaalByProject, createPortaal,
  getPortaalItems, createPortaalItem, createPortaalBestand,
} from './portaalService'

export {
  getEvents,
  getMontageAfspraken, getMontageAfspraak, createMontageAfspraak, updateMontageAfspraak, deleteMontageAfspraak,
  getMontageAfsprakenByProject,
  getVerlof, createVerlof, updateVerlof, deleteVerlof,
} from './planningService'

export { heeftMailkoppeling } from './gmailService'

export {
  getEmails, getEmail, getEmailBody, searchEmailsFTS, updateEmail, deleteEmail,
  getEmailTemplates, createEmailTemplate, updateEmailTemplate, deleteEmailTemplate,
  type EmailTemplate,
} from './emailService'

export {
  getDocumenten, createDocument, deleteDocument,
  getDocumentenByProject, getDocumentenByKlant,
  getDocumentStyle, upsertDocumentStyle, uploadBriefpapier,
  uploadVervolgpapier,
} from './documentenService'

export {
  getKlanten, zoekKlanten, getKlant, createKlant, updateKlant, deleteKlant,
  getAllKlantLabels,
  getContactpersonenDB, getContactpersonenByKlant, getContactpersonenByLeverancier,
  createContactpersoonDB, updateContactpersoonDB, deleteContactpersoonDB,
  getKlantIdByContactEmail,
  koppelContactAanKlant,
  getKlantHistorie,
  getImportLogs, createImportLog, deleteImportLog, deleteAllImportLogs, opschonenAlleImportData,
  markeerAlsLosContact, bulkDeleteContactpersonen,
} from './klantService'

export {
  getDaanGeheugenByKlant, bevestigDaanGeheugen, wijsDaanGeheugenAf, updateDaanGeheugenInhoud,
  getDaanVoorstellen, getDaanRondes, getDaanGeheugenAlgemeen, getDaanBriefingVanVandaag,
} from './daanGeheugenService'
export type { DaanGeheugenRegel, DaanVoorstel, DaanRonde, DaanBriefing, DaanBriefingPunt } from './daanGeheugenService'
export {
  getConventies, createConventie, updateConventie, deleteConventie, MAX_ACTIEVE_CONVENTIES,
} from './conventieService'
export type { Conventie } from './conventieService'

export {
  getFacturen, getFactuur, createFactuur, updateFactuur, deleteFactuur, markeerFactuurVerzonden,
  updateFactuurWithNummerRetry, getStandaardFacturenVoorOfferte, getVoorschottenVoorOfferte, FactuurConflictError,
  getFactuurItems, createFactuurItem, replaceFactuurItems,
  getFacturenByKlant, getFacturenByProject,
  getVerlopenFacturen, updateFactuurStatus,
  getHerinneringTemplates, getDefaultHerinneringTemplates,
  createHerinneringTemplate, updateHerinneringTemplate, deleteHerinneringTemplate,
  generateFactuurNummer, generateCreditnotaNummer,
  createCreditnota, createVoorschotfactuur,
} from './factuurService'

export {
  getProjecten, zoekProjecten, getProject, getProjectenByKlant, getProjectCountsByKlant, createProject, updateProject, deleteProject,
  getProjectKoppelingen, deleteProjectMetKoppelingen, ProjectHeeftFacturenError,
  getTaken, getTakenByProject, createTaak, uploadTaakBijlage, updateTaak, deleteTaak,
  getTijdregistratiesByProject,
  getProjectToewijzingen, createProjectToewijzing, deleteProjectToewijzing,
  getProjectFotos, createProjectFoto, deleteProjectFoto,
  generateProjectNummer,
} from './projectService'

export {
  getProfile, getProfielenVoorTeam, uploadAvatar, updateProfile,
  getDefaultAppSettings, getAppSettings, updateAppSettings,
  createOrganisatie, getOrganisatie, updateOrganisatie,
  getMedewerkers, createMedewerker, updateMedewerker, deleteMedewerker,
  getNotificaties, markNotificatieGelezen, markAlleNotificatiesGelezen,
  deleteNotificatie,
  getAuditLog, createAuditLogEntry, getAuditLogForProject,
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
  getVisualizerChats, upsertVisualizerChat, deleteVisualizerChat,
} from './visualizerService'

export {
  getKbCategories, createKbCategory, updateKbCategory, deleteKbCategory,
  getKbArticles, createKbArticle, updateKbArticle, deleteKbArticle,
} from './kbService'

export {
  getDeals, getDeal, getDealsByKlant,
  createDeal, updateDeal, deleteDeal,
  getDealActiviteiten, createDealActiviteit,
  generateLeadToken,
  getLeadFormulieren, getLeadFormulier, getLeadFormulierByToken,
  createLeadFormulier, updateLeadFormulier, deleteLeadFormulier,
  getAllLeadInzendingen,
  createLeadInzending, updateLeadInzending,
  getInkoopOffertes, getInkoopOffertesByProject, getInkoopOffertesByOfferte,
  createInkoopOfferte, createInkoopRegel, updateInkoopRegel, deleteInkoopOfferte,
} from './crmService'

export {
  getBookingSlots, createBookingSlot, updateBookingSlot, deleteBookingSlot,
  getBookingAfspraken, getBookingAfspraakByToken, createBookingAfspraak, updateBookingAfspraak,
} from './bookingService'

export {
  getWebsiteAanvragen, updateWebsiteAanvraag,
} from './websiteAanvragenService'

export {
  getChatGesprekken, getChatBerichten, stuurTeamBericht, markeerChatGelezen,
  sluitChatGesprek, getChatAanwezigheid, zetChatBeschikbaar, chatHeartbeat,
} from './websiteChatService'

export {
  getTijdregistraties, createTijdregistratie, updateTijdregistratie, deleteTijdregistratie,
  getTijdregistratiesByMedewerker,
} from './tijdregistratieService'

export {
  getOpvolgSchemas, getDefaultOpvolgSchema, createOpvolgSchema, updateOpvolgSchema, deleteOpvolgSchema,
  upsertOpvolgStap, deleteOpvolgStap, ensureDefaultOpvolgSchema,
} from './opvolgingService'
