import Link from 'next/link'

/* Eén renderer voor de antwoord-strings in src/data/faq.ts, gedeeld door de
   homepage en /veelgestelde-vragen. Ondersteunt **vet** en [tekst](/pad).
   Meer markdown zit er bewust niet in: de antwoorden zijn korte alinea's. */

const LINK = /\[([^\]]+)\]\(([^)]+)\)/g

function metLinks(tekst: string, sleutel: string) {
  const stukken: React.ReactNode[] = []
  let laatste = 0
  let m: RegExpExecArray | null
  LINK.lastIndex = 0
  while ((m = LINK.exec(tekst)) !== null) {
    if (m.index > laatste) stukken.push(tekst.slice(laatste, m.index))
    stukken.push(
      <Link
        key={`${sleutel}-${m.index}`}
        href={m[2]}
        className="font-semibold text-petrol underline underline-offset-2 decoration-petrol/30 hover:text-flame hover:decoration-flame/40 transition-colors"
      >
        {m[1]}
      </Link>,
    )
    laatste = m.index + m[0].length
  }
  if (laatste < tekst.length) stukken.push(tekst.slice(laatste))
  return stukken
}

export default function FaqAnswer({ text }: { text: string }) {
  const delen = text.split('**')
  return (
    <p className="text-[15px] leading-[1.65] text-muted max-w-2xl pb-6">
      {delen.map((deel, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-ink">
            {metLinks(deel, `b${i}`)}
          </strong>
        ) : (
          <span key={i}>{metLinks(deel, `t${i}`)}</span>
        ),
      )}
    </p>
  )
}
