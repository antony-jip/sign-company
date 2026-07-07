import {
  Mail,
  MessageCircle,
  Receipt,
  Phone,
  FileText,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react'

// Eén bron voor de maandagochtend-notificaties en de vier pijnpunten:
// gerenderd door HoeHetWerktContent (volledig) en de homepage-reframe
// (verkort).

export type Notification = {
  icon: LucideIcon
  from: string
  text: string
  when: string
}

export const morningNotifications: Notification[] = [
  { icon: Mail, from: 'Jansen Bouw', text: 'Heb je mijn offerte al bekeken?', when: '08:03' },
  { icon: MessageCircle, from: 'Mark (monteur)', text: 'Waar staat de werkbon voor vandaag?', when: '08:08' },
  { icon: Receipt, from: 'Accountant', text: 'Kun je de facturen van vorige week aanleveren?', when: '08:11' },
  { icon: Phone, from: 'Onbekend', text: 'Gemist: nieuwe aanvraag gevelreclame', when: '08:14' },
  { icon: Mail, from: 'De Vries BV', text: 'Offerte-akkoord, maar met welke versie?', when: '08:15' },
]

export type Pain = {
  icon: LucideIcon
  title: string
  body: string
  cost: string
}

export const pains: Pain[] = [
  {
    icon: MessageCircle,
    title: 'Geen klantportaal',
    body: 'Tekening als bijlage, offerte in een aparte mail, factuur in de derde. Je klant moet zelf bijhouden wat er waar staat.',
    cost: 'Klanten die afhaken zonder te bellen',
  },
  {
    icon: Mail,
    title: 'Mail draait los van alles',
    body: 'Outlook apart. Klantgesprekken in threads die je team niet ziet. Wat is er gisteren beloofd? Dat zit in de inbox van één persoon.',
    cost: 'Context kwijt, dubbele antwoorden',
  },
  {
    icon: FileText,
    title: 'Offerte verstuurd, en dan?',
    body: 'Geen opvolging. Geen weten of ze is gelezen. Je wacht, je belt, je mailt een herinnering. Je klant is intussen verder gegaan.',
    cost: 'Deals die je nooit hebt zien afkoelen',
  },
  {
    icon: ClipboardList,
    title: 'Geen log per project',
    body: 'Wat is er in dit project gebeurd? Wie reageerde waarop, wanneer? Je scrolt door drie mail-threads en hoopt dat je niks mist.',
    cost: 'Gaten in je geheugen worden gaten in je service',
  },
]
