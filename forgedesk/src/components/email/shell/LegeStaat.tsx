import type { MailMap } from '@/lib/mail/types'
import type { LegeStaatTekst } from './mapConfig'

interface Props {
  tekst: LegeStaatTekst
  onSprong: (map: MailMap) => void
  mailboxGekoppeld: boolean | null
  onKoppelen: () => void
}

/** Tekst plus tekstlinks, geen illustratie. */
export function LegeStaat({ tekst, onSprong, mailboxGekoppeld, onKoppelen }: Props) {
  if (mailboxGekoppeld === false) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <h3 className="font-heading text-[16px] font-bold text-foreground tracking-[-0.01em] mb-1.5">Koppel je mailbox<span className="text-flame">.</span></h3>
        <p className="text-[13px] text-foreground/70 max-w-[280px] leading-relaxed">Verbind je zakelijke mailbox en behandel klantmail, offertes en leads gewoon hier in doen.</p>
        <button type="button" onClick={onKoppelen} className="mt-4 text-sm text-flame hover:underline">Mailbox koppelen</button>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <h3 className="font-heading text-[16px] font-bold text-foreground tracking-[-0.01em] mb-1.5">
        {tekst.titel}<span className="text-flame">.</span>
      </h3>
      {tekst.regels.length > 0 && (
        <p className="text-[13px] text-foreground/70 leading-relaxed">
          {tekst.regels.map((r, i) => (
            <span key={r.tekst}>
              {i > 0 && <span className="text-muted-foreground/60"> · </span>}
              {r.sprong ? (
                <button type="button" onClick={() => onSprong(r.sprong!)} className="text-petrol dark:text-[#7FB5BF] hover:underline underline-offset-2">{r.tekst}</button>
              ) : r.tekst}
            </span>
          ))}
        </p>
      )}
      {tekst.uitleg && <p className="text-[13px] text-foreground/60 max-w-[280px] leading-relaxed mt-0.5">{tekst.uitleg}</p>}
    </div>
  )
}
