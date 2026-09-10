// Eén klus van mail tot betaald, in de echte datavormen van de app.
import { staticFile } from 'remotion'
import type { Klant, Contactpersoon, Project, Offerte, OfferteItem, Factuur, Notificatie, MontageAfspraak, Taak, Medewerker, WerkbonFoto } from '@/types'

export const nu = '2026-09-14T09:12:00.000Z'

export const contact: Contactpersoon = {
  id: 'c-1', naam: 'Pieter van der Berg', functie: 'Eigenaar', email: 'pieter@vanderberginterieur.nl', telefoon: '06 21 44 87 10', is_primair: true,
}

export const klant = {
  id: 'k-1', bedrijfsnaam: 'Van der Berg Interieur', contactpersoon: contact.naam, email: contact.email,
  telefoon: '0341 55 21 90', adres: 'Industrieweg 14', postcode: '3844 BC', stad: 'Harderwijk', land: 'Nederland',
  website: 'www.vanderberginterieur.nl', debiteurennummer: 'D-1042', kvk_nummer: '58213377', btw_nummer: '',
  status: 'actief', tags: [], notities: '', contactpersonen: [contact],
} as unknown as Klant

export const project = {
  id: 'p-1', klant_id: klant.id, klant_naam: klant.bedrijfsnaam, project_nummer: 'P-2026-0142',
  naam: 'Gevelreclame Van der Berg Interieur', beschrijving: 'LED-gevelletters en lichtbak aan de showroom, Industrieweg 14.',
  status: 'gepland', prioriteit: 'medium', budget: 4250, besteed: 0, voortgang: 0, team_leden: ['Kees'],
  start_datum: '2026-09-24', eind_datum: '2026-09-24', created_at: nu, updated_at: nu,
} as unknown as Project

export const mail = {
  id: 'm-1', van: 'Pieter van der Berg <pieter@vanderberginterieur.nl>', aan: 'info@signcompany.nl',
  onderwerp: 'Kunnen jullie onze gevel doen?', datum: nu, gelezen: false,
  inhoud: 'Hoi, we hebben net een nieuwe showroom aan de Industrieweg. Kunnen jullie onze gevel doen? Letters met licht, en een lichtbak boven de ingang. Groet, Pieter',
  is_aanvraag: true, aanvraag_zekerheid: 87,
  aanvraag_samenvatting: 'Gevelreclame voor nieuwe showroom: verlichte letters en een lichtbak boven de ingang.',
}

export const offerteItems: OfferteItem[] = [
  { id: 'oi-1', offerte_id: 'o-1', beschrijving: 'LED-gevelletters 60 cm, RVS, wit licht', aantal: 1, eenheidsprijs: 2450, btw_percentage: 21, korting_percentage: 0, totaal: 2450, volgorde: 1 },
  { id: 'oi-2', offerte_id: 'o-1', beschrijving: 'Lichtbak 240 x 80 cm, dubbelzijdig', aantal: 1, eenheidsprijs: 1150, btw_percentage: 21, korting_percentage: 0, totaal: 1150, volgorde: 2 },
  { id: 'oi-3', offerte_id: 'o-1', beschrijving: 'Montage met hoogwerker', aantal: 1, eenheidsprijs: 650, btw_percentage: 21, korting_percentage: 0, totaal: 650, volgorde: 3 },
] as OfferteItem[]

export const offerte = {
  id: 'o-1', klant_id: klant.id, klant_naam: klant.bedrijfsnaam, project_id: project.id,
  nummer: 'OFF-2026-0042', titel: 'Gevelreclame showroom', status: 'concept',
  subtotaal: 4250, btw_bedrag: 892.5, totaal: 5142.5, geldig_tot: '2026-10-14', notities: '', voorwaarden: '',
  created_at: nu, updated_at: nu, items: offerteItems,
} as unknown as Offerte

export const factuur = {
  id: 'f-1', klant_id: klant.id, klant_naam: klant.bedrijfsnaam, offerte_id: offerte.id, project_id: project.id,
  nummer: 'FAC-2026-0118', titel: 'Gevelreclame showroom', status: 'concept', subtotaal: 4250, btw_bedrag: 892.5, totaal: 5142.5,
  betaald_bedrag: 0, factuurdatum: '2026-09-25', vervaldatum: '2026-10-09',
} as unknown as Factuur

export const montage: MontageAfspraak = {
  id: 'ma-1', project_id: project.id, project_naam: project.naam, klant_id: klant.id, klant_naam: klant.bedrijfsnaam,
  titel: 'Montage gevelletters + lichtbak', beschrijving: '', datum: '2026-09-24', start_tijd: '08:00', eind_tijd: '12:00',
  locatie: 'Industrieweg 14, Harderwijk', monteurs: ['Kees'], status: 'gepland', materialen: [], notities: '', created_at: nu, updated_at: nu,
} as MontageAfspraak

export const medewerkers = [
  { id: 'mw-1', naam: 'Kees', rol: 'monteur' },
  { id: 'mw-2', naam: 'Sanne', rol: 'admin' },
] as unknown as Medewerker[]

export const taken: Taak[] = []

export const notificatieAkkoord: Notificatie = {
  id: 'n-1', type: 'offerte_geaccepteerd', titel: 'Offerte geaccepteerd',
  bericht: `${contact.naam} heeft offerte ${offerte.nummer} geaccepteerd`, link: '/offertes/o-1/detail', gelezen: false, created_at: nu,
}

export const notificatieBetaald: Notificatie = {
  id: 'n-2', type: 'betaling_ontvangen', titel: `Factuur ${factuur.nummer} betaald`,
  bericht: '€ 5.142,50 ontvangen via Mollie', link: '/facturen', gelezen: false, created_at: nu,
}

export const werkbonNummer = 'WB-2026-0097'

export const fotoNa: WerkbonFoto = {
  id: 'wf-1', werkbon_id: 'wb-1', type: 'na', url: staticFile('sfeer/gevel-avond.jpg'), created_at: nu,
}

export const portaalItemOfferte = {
  id: 'pi-1', type: 'offerte', titel: `Offerte ${offerte.nummer}`, omschrijving: offerte.titel, status: 'verstuurd',
  bedrag: offerte.totaal, bedrag_excl: offerte.subtotaal, offerte_publiek_token: 'tok', created_at: nu,
}

export const portaalItemFactuur = {
  id: 'pi-2', type: 'factuur', titel: `Factuur ${factuur.nummer}`, omschrijving: factuur.titel, status: 'verstuurd',
  bedrag: factuur.totaal, mollie_payment_url: 'https://mollie.com/checkout', factuur_id: factuur.id, created_at: nu,
}

export const portaalItemFoto = {
  id: 'pi-3', type: 'afbeelding', titel: 'Montage klaar', omschrijving: 'Letters en lichtbak hangen. Vanavond voor het eerst aan.',
  foto_url: staticFile('sfeer/gevel-avond.jpg'), created_at: nu,
}

export const portaalBedrijf = { naam: 'Sign Company', logo_url: '', telefoon: '0341 41 22 60', email: 'info@signcompany.nl', website: 'signcompany.nl' }

export const notificatieCheckGevraagd: Notificatie = {
  id: 'n-3', type: 'offerte_check_gevraagd', titel: 'Antony vraagt je een offerte te checken',
  bericht: `${offerte.nummer} · ${offerte.titel} · "Even kijken naar de montage-uren?"`, link: '/offertes/o-1/bewerken', gelezen: false, created_at: nu,
}

export const notificatieCheckAkkoord: Notificatie = {
  id: 'n-4', type: 'offerte_check_afgehandeld', titel: 'Sanne heeft je offerte gecheckt: akkoord',
  bericht: `${offerte.nummer} · ${offerte.titel}`, link: '/offertes/o-1/bewerken', gelezen: false, created_at: nu,
}

export const taakBellen = {
  id: 't-1', project_id: 'p-1', titel: 'Even telefonisch contact opnemen', beschrijving: 'Pieter bellen over de kleur van de letters.',
  status: 'todo', prioriteit: 'medium', toegewezen_aan: 'Sanne', toegewezen_aan_id: 'mw-2', deadline: '2026-09-16', geschatte_tijd: 15, created_at: nu, updated_at: nu,
} as unknown as Taak

export const notificatieTaak: Notificatie = {
  id: 'n-5', type: 'taak_toegewezen', titel: 'Antony heeft je een taak toegewezen',
  bericht: `${taakBellen.titel} · ${project.naam}`, link: '/taken', gelezen: false, created_at: nu,
}
