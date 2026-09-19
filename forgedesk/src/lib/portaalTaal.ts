/**
 * De vaste teksten van de klantpagina's in het Nederlands en het Frans. De
 * klant kiest niets: de taal staat op de klantkaart (klanten.taal) en komt
 * mee in de publieke offerte. Wat de verkoper zelf schrijft (intro, posten,
 * voorwaarden) blijft in zijn eigen taal.
 */
export type KlantTaal = 'nl' | 'fr'

export function klantTaal(ruw: unknown): KlantTaal {
  return ruw === 'fr' ? 'fr' : 'nl'
}

export interface PortaalTeksten {
  locale: string
  sluiten: string
  optie: string
  groterBekijken: (naam: string) => string
  tekeningBekijken: string
  bijlage: (naam: string) => string
  uitvoeringVan: (titel: string) => string
  uitvoering: string
  meerdereMogelijk: string
  altijdInbegrepen: string
  inbegrepen: string
  nietInbegrepen: string
  nietGekozen: string
  minstensEen: string
  toegevoegd: string
  toevoegen: string
  vraagOverPost: string
  korting: string
  kortingPct: (pct: number, bedrag: string) => string
  offerte: string
  offerteNummer: (nummer: string) => string
  offerteVoor: (klant: string) => string
  geldigTot: string
  laatsteDag: string
  nogDagen: (n: number) => string
  keuzeHint: (n: number) => string
  bij: string
  nieuweVersieStandaard: string
  overPost: (titel: string) => string
  fout: string
  foutOpnieuw: string
  verstuurdTerug: string
  pdfMislukt: string
  linkWerktNiet: string
  linkWerktNietTekst: string
  komtTerug: (voornaam: string) => string
  danKomtTerug: (voornaam: string) => string
  akkoordOntvangen: string
  op: (datum: string) => string
  door: (naam: string) => string
  geaccepteerd: string
  bedanktVertrouwen: string
  akkoordOntvangenVan: (bedrijf: string) => string
  contactPlanning: (voornaam: string) => string
  bevestigingOnderweg: string
  naarPortaal: string
  verzoekVerstuurd: string
  aangepasteOfferteTerug: (komtTerug: string) => string
  verlopen: string
  verlopenGeldigTot: string
  nieuweVersieVerstuurd: (datum: string, komtTerug: string) => string
  vraagNieuweVersie: (danKomtTerug: string) => string
  nieuweOfferteAanvragen: string
  afgesloten: string
  afgeslotenTekst: string
  nogNietHelemaal: string
  vraagAanpassing: string
  jeKeuze: string
  exclBtw: string
  inclSuffix: (bedrag: string) => string
  jeNaam: string
  naamPlaceholder: string
  jeHandtekening: string
  akkoordUitleg: (bedrijf: string, metKeuze: boolean) => string
  akkoordOndertekenen: string
  bevestigingPerMail: string
  akkoordGeven: string
  akkoordPersoonlijk: (naam: string) => string
  vragenOverOfferte: string
  helptGraag: (naam: string) => string
  bedrijfHelpt: (bedrijf: string) => string
  terugNaarPortaal: string
  portaal: string
  pdfDownloaden: string
  downloadPdf: string
  subtotaalExcl: string
  subtotaalNaKorting: string
  btwOver: (pct: number, basis: string) => string
  afrondingskorting: string
  totaalExcl: string
  totaalIncl: string
  voorwaarden: string
  ondernemingsnummer: (land: string | undefined) => string
  aanpassingAanvragen: string
  verlopenNieuweVersie: (komtTerug: string) => string
  laatWetenAnders: (komtTerug: string) => string
  jeBericht: string
  berichtPlaceholder: string
  nogPaarWoorden: string
  versturen: string
  bellen: string
  mailen: string
  tekenHier: string
  opnieuw: string
  standaardAkkoordIntro: string
  standaardBedanktKop: string
  standaardBedanktTekst: string
}

const NL: PortaalTeksten = {
  locale: 'nl-NL',
  sluiten: 'Sluiten',
  optie: 'Optie',
  groterBekijken: (naam) => `${naam} groter bekijken`,
  tekeningBekijken: 'Tekening bekijken',
  bijlage: (naam) => `Bijlage: ${naam}`,
  uitvoeringVan: (titel) => `Uitvoering van ${titel}`,
  uitvoering: 'Uitvoering',
  meerdereMogelijk: 'Meerdere mogelijk',
  altijdInbegrepen: 'Altijd inbegrepen',
  inbegrepen: 'Inbegrepen',
  nietInbegrepen: 'Niet inbegrepen',
  nietGekozen: 'Niet gekozen',
  minstensEen: 'Minstens één uitvoering blijft aan.',
  toegevoegd: 'Toegevoegd aan je offerte',
  toevoegen: 'Toevoegen aan je offerte',
  vraagOverPost: 'Vraag of wijziging over deze post',
  korting: 'Korting',
  kortingPct: (pct, bedrag) => `${pct}% (-${bedrag})`,
  offerte: 'Offerte',
  offerteNummer: (nummer) => `Offerte ${nummer}`,
  offerteVoor: (klant) => `Offerte voor ${klant}`,
  geldigTot: 'Geldig tot',
  laatsteDag: ' (vandaag de laatste dag)',
  nogDagen: (n) => ` (nog ${n} ${n === 1 ? 'dag' : 'dagen'})`,
  keuzeHint: (n) => n === 1
    ? 'Bij één post kun je zelf kiezen wat je wilt; het totaal rekent direct mee.'
    : `Bij ${n} posten kun je zelf kiezen wat je wilt; het totaal rekent direct mee.`,
  bij: 'bij',
  nieuweVersieStandaard: 'Graag ontvang ik een nieuwe versie van deze offerte.',
  overPost: (titel) => `Over "${titel}": `,
  fout: 'Er ging iets mis',
  foutOpnieuw: 'Er ging iets mis. Probeer het opnieuw.',
  verstuurdTerug: 'Verstuurd. We komen bij je terug.',
  pdfMislukt: 'PDF downloaden mislukt',
  linkWerktNiet: 'Deze link werkt niet meer',
  linkWerktNietTekst: 'De link naar deze offerte is niet geldig of verlopen. Neem contact op met het bedrijf dat je de offerte stuurde, dan ontvang je een nieuwe link.',
  komtTerug: (voornaam) => (voornaam ? `${voornaam} komt bij je terug` : 'We komen bij je terug'),
  danKomtTerug: (voornaam) => (voornaam ? `komt ${voornaam} bij je terug` : 'komen we bij je terug'),
  akkoordOntvangen: 'Akkoord ontvangen',
  op: (datum) => `Op ${datum}`,
  door: (naam) => ` door ${naam}`,
  geaccepteerd: 'Deze offerte is geaccepteerd',
  bedanktVertrouwen: '. Bedankt voor je vertrouwen.',
  akkoordOntvangenVan: (bedrijf) => (bedrijf ? `${bedrijf} heeft je akkoord ontvangen.` : 'We hebben je akkoord ontvangen.'),
  contactPlanning: (voornaam) => (voornaam ? `${voornaam} neemt contact met je op over de planning.` : 'We nemen contact met je op over de planning.'),
  bevestigingOnderweg: 'Een bevestiging is onderweg naar ',
  naarPortaal: 'Naar je projectportaal',
  verzoekVerstuurd: 'Verzoek verstuurd',
  aangepasteOfferteTerug: (komtTerug) => `${komtTerug} met een aangepaste offerte.`,
  verlopen: 'Verlopen',
  verlopenGeldigTot: 'Deze offerte was geldig tot ',
  nieuweVersieVerstuurd: (datum, komtTerug) => `. Je aanvraag voor een nieuwe versie is verstuurd op ${datum}. ${komtTerug}.`,
  vraagNieuweVersie: (danKomtTerug) => `. Vraag een nieuwe versie aan, dan ${danKomtTerug}.`,
  nieuweOfferteAanvragen: 'Nieuwe offerte aanvragen',
  afgesloten: 'Afgesloten',
  afgeslotenTekst: 'Deze offerte is gesloten. Wil je toch verder? Neem contact op, dan kijken we samen naar een nieuwe versie.',
  nogNietHelemaal: 'Nog niet helemaal wat je zoekt?',
  vraagAanpassing: 'Vraag een aanpassing aan',
  jeKeuze: 'Je keuze',
  exclBtw: 'excl. btw',
  inclSuffix: (bedrag) => ` · ${bedrag} incl.`,
  jeNaam: 'Je naam',
  naamPlaceholder: 'Voor- en achternaam',
  jeHandtekening: 'Je handtekening',
  akkoordUitleg: (bedrijf, metKeuze) => `Met je naam en handtekening geef je akkoord op deze offerte${bedrijf ? ` van ${bedrijf}` : ''}${metKeuze ? ', met je keuze hierboven' : ''}.`,
  akkoordOndertekenen: 'Akkoord en ondertekenen',
  bevestigingPerMail: 'Je ontvangt direct een bevestiging per mail.',
  akkoordGeven: 'Akkoord geven',
  akkoordPersoonlijk: (naam) => `Akkoord geef je aan ${naam} persoonlijk, per mail of telefoon.`,
  vragenOverOfferte: 'Vragen over deze offerte?',
  helptGraag: (naam) => `${naam}, helpt je graag verder.`,
  bedrijfHelpt: (bedrijf) => (bedrijf ? `${bedrijf} helpt u graag verder.` : 'We helpen u graag verder.'),
  terugNaarPortaal: 'Terug naar portaal',
  portaal: 'Portaal',
  pdfDownloaden: 'PDF downloaden',
  downloadPdf: 'Download PDF',
  subtotaalExcl: 'Subtotaal excl. btw',
  subtotaalNaKorting: 'Subtotaal na korting',
  btwOver: (pct, basis) => `Btw ${pct}% over ${basis}`,
  afrondingskorting: 'Afrondingskorting',
  totaalExcl: 'Totaal excl. btw',
  totaalIncl: 'Totaal incl. btw',
  voorwaarden: 'Voorwaarden',
  ondernemingsnummer: (land) => (land === 'BE' ? 'Ondernemingsnr.' : 'KvK'),
  aanpassingAanvragen: 'Aanpassing aanvragen',
  verlopenNieuweVersie: (komtTerug) => `Deze offerte is verlopen. ${komtTerug} met een nieuwe versie.`,
  laatWetenAnders: (komtTerug) => `Laat weten wat je anders wilt. ${komtTerug} met een aangepaste offerte.`,
  jeBericht: 'Je bericht',
  berichtPlaceholder: 'Bijvoorbeeld: kan de lichtbak 20 cm breder?',
  nogPaarWoorden: 'Nog een paar woorden, dan kunnen we je goed helpen.',
  versturen: 'Versturen',
  bellen: 'Bellen',
  mailen: 'Mailen',
  tekenHier: 'Teken hier je handtekening',
  opnieuw: 'Opnieuw',
  standaardAkkoordIntro: 'Naam en handtekening, dan gaan we voor je aan de slag.',
  standaardBedanktKop: 'Bedankt voor je opdracht',
  standaardBedanktTekst: 'Zodra we je opdracht verwerkt hebben, krijg je van ons een opdrachtbevestiging.',
}

const FR: PortaalTeksten = {
  locale: 'fr-BE',
  sluiten: 'Fermer',
  optie: 'Option',
  groterBekijken: (naam) => `Agrandir ${naam}`,
  tekeningBekijken: 'Voir le dessin',
  bijlage: (naam) => `Annexe : ${naam}`,
  uitvoeringVan: (titel) => `Exécution de ${titel}`,
  uitvoering: 'Exécution',
  meerdereMogelijk: 'Plusieurs choix possibles',
  altijdInbegrepen: 'Toujours inclus',
  inbegrepen: 'Inclus',
  nietInbegrepen: 'Non inclus',
  nietGekozen: 'Non retenu',
  minstensEen: 'Au moins une exécution reste cochée.',
  toegevoegd: 'Ajouté à votre devis',
  toevoegen: 'Ajouter à votre devis',
  vraagOverPost: 'Question ou modification sur ce poste',
  korting: 'Remise',
  kortingPct: (pct, bedrag) => `${pct} % (-${bedrag})`,
  offerte: 'Devis',
  offerteNummer: (nummer) => `Devis ${nummer}`,
  offerteVoor: (klant) => `Devis pour ${klant}`,
  geldigTot: "Valable jusqu'au",
  laatsteDag: " (dernier jour aujourd'hui)",
  nogDagen: (n) => ` (encore ${n} ${n === 1 ? 'jour' : 'jours'})`,
  keuzeHint: (n) => n === 1
    ? 'Pour un poste, vous choisissez vous-même ce que vous souhaitez ; le total se met à jour directement.'
    : `Pour ${n} postes, vous choisissez vous-même ce que vous souhaitez ; le total se met à jour directement.`,
  bij: 'chez',
  nieuweVersieStandaard: 'Je souhaite recevoir une nouvelle version de ce devis.',
  overPost: (titel) => `Concernant « ${titel} » : `,
  fout: 'Une erreur est survenue',
  foutOpnieuw: 'Une erreur est survenue. Veuillez réessayer.',
  verstuurdTerug: 'Envoyé. Nous revenons vers vous.',
  pdfMislukt: 'Le téléchargement du PDF a échoué',
  linkWerktNiet: 'Ce lien ne fonctionne plus',
  linkWerktNietTekst: "Le lien vers ce devis n'est pas valide ou a expiré. Contactez l'entreprise qui vous a envoyé le devis pour recevoir un nouveau lien.",
  komtTerug: (voornaam) => (voornaam ? `${voornaam} revient vers vous` : 'Nous revenons vers vous'),
  danKomtTerug: (voornaam) => (voornaam ? `${voornaam} revient vers vous` : 'nous revenons vers vous'),
  akkoordOntvangen: 'Accord reçu',
  op: (datum) => `Le ${datum}`,
  door: (naam) => ` par ${naam}`,
  geaccepteerd: 'Ce devis a été accepté',
  bedanktVertrouwen: '. Merci de votre confiance.',
  akkoordOntvangenVan: (bedrijf) => (bedrijf ? `${bedrijf} a bien reçu votre accord.` : 'Nous avons bien reçu votre accord.'),
  contactPlanning: (voornaam) => (voornaam ? `${voornaam} vous contactera pour le planning.` : 'Nous vous contacterons pour le planning.'),
  bevestigingOnderweg: 'Une confirmation est en route vers ',
  naarPortaal: 'Vers votre portail projet',
  verzoekVerstuurd: 'Demande envoyée',
  aangepasteOfferteTerug: (komtTerug) => `${komtTerug} avec un devis adapté.`,
  verlopen: 'Expiré',
  verlopenGeldigTot: "Ce devis était valable jusqu'au ",
  nieuweVersieVerstuurd: (datum, komtTerug) => `. Votre demande de nouvelle version a été envoyée le ${datum}. ${komtTerug}.`,
  vraagNieuweVersie: (danKomtTerug) => `. Demandez une nouvelle version et ${danKomtTerug}.`,
  nieuweOfferteAanvragen: 'Demander un nouveau devis',
  afgesloten: 'Clôturé',
  afgeslotenTekst: 'Ce devis est clôturé. Vous souhaitez tout de même continuer ? Contactez-nous et nous examinerons ensemble une nouvelle version.',
  nogNietHelemaal: 'Pas tout à fait ce que vous cherchez ?',
  vraagAanpassing: 'Demander une modification',
  jeKeuze: 'Votre choix',
  exclBtw: 'HTVA',
  inclSuffix: (bedrag) => ` · ${bedrag} TVAC`,
  jeNaam: 'Votre nom',
  naamPlaceholder: 'Prénom et nom',
  jeHandtekening: 'Votre signature',
  akkoordUitleg: (bedrijf, metKeuze) => `Par votre nom et votre signature, vous acceptez ce devis${bedrijf ? ` de ${bedrijf}` : ''}${metKeuze ? ', avec votre choix ci-dessus' : ''}.`,
  akkoordOndertekenen: 'Accepter et signer',
  bevestigingPerMail: 'Vous recevez immédiatement une confirmation par e-mail.',
  akkoordGeven: 'Donner votre accord',
  akkoordPersoonlijk: (naam) => `Vous donnez votre accord à ${naam} directement, par e-mail ou par téléphone.`,
  vragenOverOfferte: 'Des questions sur ce devis ?',
  helptGraag: (naam) => `${naam} se fera un plaisir de vous aider.`,
  bedrijfHelpt: (bedrijf) => (bedrijf ? `${bedrijf} se fera un plaisir de vous aider.` : 'Nous nous ferons un plaisir de vous aider.'),
  terugNaarPortaal: 'Retour au portail',
  portaal: 'Portail',
  pdfDownloaden: 'Télécharger le PDF',
  downloadPdf: 'Télécharger le PDF',
  subtotaalExcl: 'Sous-total HTVA',
  subtotaalNaKorting: 'Sous-total après remise',
  btwOver: (pct, basis) => `TVA ${pct} % sur ${basis}`,
  afrondingskorting: "Remise d'arrondi",
  totaalExcl: 'Total HTVA',
  totaalIncl: 'Total TVAC',
  voorwaarden: 'Conditions',
  ondernemingsnummer: (land) => (land === 'BE' ? "N° d'entreprise" : 'KvK'),
  aanpassingAanvragen: 'Demander une modification',
  verlopenNieuweVersie: (komtTerug) => `Ce devis est expiré. ${komtTerug} avec une nouvelle version.`,
  laatWetenAnders: (komtTerug) => `Dites-nous ce que vous souhaitez changer. ${komtTerug} avec un devis adapté.`,
  jeBericht: 'Votre message',
  berichtPlaceholder: 'Par exemple : le caisson lumineux peut-il être 20 cm plus large ?',
  nogPaarWoorden: 'Encore quelques mots pour que nous puissions bien vous aider.',
  versturen: 'Envoyer',
  bellen: 'Appeler',
  mailen: 'Envoyer un e-mail',
  tekenHier: 'Signez ici',
  opnieuw: 'Recommencer',
  standaardAkkoordIntro: 'Votre nom et votre signature, et nous nous mettons au travail pour vous.',
  standaardBedanktKop: 'Merci pour votre commande',
  standaardBedanktTekst: 'Dès que nous aurons traité votre commande, vous recevrez une confirmation de commande.',
}

export function portaalTeksten(taal: KlantTaal): PortaalTeksten {
  return taal === 'fr' ? FR : NL
}
