// Netwerkloze stand-ins voor de app-services. Alles resolvet direct.
const leeg = async () => []
const niets = async () => undefined
const nul = async () => null
export const supabase = null
export const isSupabaseConfigured = () => false
export default supabase
export const getKlanten = leeg
export const getProjecten = leeg
export const getOfferteItems = leeg
export const getAppSettings = nul
export const createKlant = nul
export const updateKlant = nul
export const createProject = nul
export const generateProjectNummer = async () => 'P-2026-0142'
export const createWerkbon = nul
export const createWerkbonItem = nul
export const createWerkbonAfbeelding = nul
export const updateMontageAfspraak = niets
export const koppelEmailAanProject = niets
export const getProjectVoorThread = nul
export const verbergAanvraag = niets
export const isAIConfigured = () => true
export const chatCompletion = async () => ''
