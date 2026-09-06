import { useEffect, useState } from 'react'
import { meldKlantenGewijzigd } from '../EmailActionsPopover'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createKlant, getKlanten } from '@/services/klantService'
import type { Klant } from '@/types'
import { logger } from '@/utils/logger'
import { parseHandtekening, heeftGegevens } from '../handtekeningParser'

interface Props {
  open: boolean
  onSluiten: () => void
  afzenderNaam: string
  afzenderEmail: string
  /** Body van de mail (html of tekst) voor de handtekening-parser. */
  inhoud: string
  onAangemaakt: (klant: Klant) => void
}

const veldCls = 'w-full h-9 px-3 text-[13px] bg-background rounded-lg outline-none border border-transparent focus:border-petrol transition-colors placeholder:text-muted-foreground'

function bedrijfUitAdres(naam: string, email: string): string {
  const streep = naam.match(/\s[|–—-]\s*(.+)$/)
  if (streep) return streep[1].trim()
  const domein = email.split('@')[1]?.toLowerCase() || ''
  if (!domein || /^(gmail|hotmail|outlook|live|icloud|yahoo|ziggo|kpn|planet|hetnet|xs4all)\./.test(domein)) return ''
  const kern = domein.split('.')[0]
  return kern.charAt(0).toUpperCase() + kern.slice(1)
}

/**
 * Onbekende afzender als klant vastleggen. Eén parser: handtekeningParser.ts
 * vult het formulier voor, de gebruiker kijkt het na.
 */
export function KlantToevoegenDialog({ open, onSluiten, afzenderNaam, afzenderEmail, inhoud, onAangemaakt }: Props) {
  const [form, zetForm] = useState({ bedrijfsnaam: '', contactpersoon: '', functie: '', email: '', telefoon: '', mobiel: '', adres: '', postcode: '', stad: '', website: '', kvk: '' })
  const [voorgevuld, zetVoorgevuld] = useState(false)
  const [bezig, zetBezig] = useState(false)

  useEffect(() => {
    if (!open) return
    const naam = afzenderNaam.replace(/\s[|–—-]\s+.+$/, '').trim()
    let h: ReturnType<typeof parseHandtekening> | null = null
    try { h = inhoud ? parseHandtekening(inhoud, { naam, email: afzenderEmail }) : null } catch { h = null }
    const bruikbaar = !!h && heeftGegevens(h)
    zetVoorgevuld(bruikbaar)
    zetForm({
      bedrijfsnaam: h?.bedrijfsnaam || bedrijfUitAdres(afzenderNaam, afzenderEmail),
      contactpersoon: h?.naam || naam,
      functie: h?.functie || '',
      email: afzenderEmail,
      telefoon: h?.telefoon || '',
      mobiel: h?.mobiel || '',
      adres: h?.adres || '',
      postcode: h?.postcode || '',
      stad: h?.stad || '',
      website: h?.website || '',
      kvk: h?.kvk || '',
    })
  }, [open, afzenderNaam, afzenderEmail, inhoud])

  const zet = (veld: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => zetForm((f) => ({ ...f, [veld]: e.target.value }))

  const opslaan = async () => {
    if (!form.contactpersoon.trim() || !form.email.trim()) { toast.error('Naam en e-mail zijn verplicht'); return }
    zetBezig(true)
    try {
      const bestaand = (await getKlanten()).find((k) => k.email?.toLowerCase() === form.email.toLowerCase())
      if (bestaand) { meldKlantenGewijzigd(); toast.success('Klant bestond al, gekoppeld'); onAangemaakt(bestaand); onSluiten(); return }
      const domein = form.email.match(/@(.+)/)?.[1]?.toLowerCase()
      const klant = await createKlant({
        bedrijfsnaam: form.bedrijfsnaam, contactpersoon: form.contactpersoon,
        email: form.email, telefoon: form.telefoon || form.mobiel,
        adres: form.adres, postcode: form.postcode, stad: form.stad, land: 'Nederland',
        website: form.website || (domein ? `www.${domein}` : ''),
        debiteurennummer: '', kvk_nummer: form.kvk, btw_nummer: '', status: 'actief', tags: [], notities: '',
        contactpersonen: [{ id: crypto.randomUUID(), naam: form.contactpersoon, functie: form.functie, email: form.email, telefoon: form.mobiel || form.telefoon, is_primair: true }],
      })
      toast.success('Klant aangemaakt')
      meldKlantenGewijzigd()
      onAangemaakt(klant)
      onSluiten()
    } catch (err) {
      logger.error('Klant aanmaken mislukt:', err)
      toast.error('Klant aanmaken mislukt')
    } finally {
      zetBezig(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onSluiten() }}>
      <DialogContent className="max-w-[440px] rounded-2xl p-8">
        <DialogHeader>
          <DialogTitle className="font-heading text-[18px] font-bold tracking-[-0.01em]">Toevoegen als klant<span className="text-flame">.</span></DialogTitle>
        </DialogHeader>
        {voorgevuld && (
          <p className="flex items-center gap-1.5 text-[12px] text-[#3A7D52]"><Check className="h-3 w-3" /> Voorgevuld uit de handtekening. Kijk even na.</p>
        )}
        <div className="space-y-2.5 mt-2">
          <input value={form.bedrijfsnaam} onChange={zet('bedrijfsnaam')} placeholder="Bedrijfsnaam" className={veldCls} autoFocus />
          <div className="grid grid-cols-2 gap-2.5">
            <input value={form.contactpersoon} onChange={zet('contactpersoon')} placeholder="Contactpersoon" className={veldCls} />
            <input value={form.functie} onChange={zet('functie')} placeholder="Functie" className={veldCls} />
          </div>
          <input value={form.email} onChange={zet('email')} placeholder="E-mail" className={veldCls} />
          <div className="grid grid-cols-2 gap-2.5">
            <input value={form.telefoon} onChange={zet('telefoon')} placeholder="Telefoon" className={veldCls} />
            <input value={form.mobiel} onChange={zet('mobiel')} placeholder="Mobiel" className={veldCls} />
          </div>
          <input value={form.adres} onChange={zet('adres')} placeholder="Adres" className={veldCls} />
          <div className="grid grid-cols-[120px_1fr] gap-2.5">
            <input value={form.postcode} onChange={zet('postcode')} placeholder="Postcode" className={veldCls} />
            <input value={form.stad} onChange={zet('stad')} placeholder="Plaats" className={veldCls} />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <input value={form.website} onChange={zet('website')} placeholder="Website" className={veldCls} />
            <input value={form.kvk} onChange={zet('kvk')} placeholder="KvK" className={veldCls} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 mt-4">
          <button type="button" onClick={onSluiten} className="text-[13px] text-muted-foreground hover:text-foreground">Annuleren</button>
          <button type="button" onClick={opslaan} disabled={bezig} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-semibold text-white bg-flame hover:bg-[#D8421F] disabled:opacity-50 transition-colors">
            {bezig && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Klant aanmaken
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
