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
    body: 'Tekening als bijlage, offerte in een aparte mail, factuur in de derde. Je klant moet zelf bijhouden waar wat staat.',
    cost: 'Klanten die afhaken zonder te bellen',
  },
  {
    icon: Mail,
    title: 'Mail draait los van alles',
    body: 'Klantgesprekken zitten in de inbox van één persoon. Wat er gisteren is beloofd, ziet de rest van het team niet.',
    cost: 'Context kwijt, dubbele antwoorden',
  },
  {
    icon: FileText,
    title: 'Offerte verstuurd, en dan?',
    body: 'Verstuurd, en dan stilte. Je weet niet of ze gelezen is, dus je wacht en belt. Je klant is intussen verder.',
    cost: 'Deals die je nooit hebt zien afkoelen',
  },
  {
    icon: ClipboardList,
    title: 'Geen log per project',
    body: 'Wie reageerde waarop, en wanneer? Je scrolt door drie mailthreads en hoopt dat je niks mist.',
    cost: 'Gaten in je geheugen worden gaten in je service',
  },
]
