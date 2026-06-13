import Image from 'next/image'
import Link from 'next/link'
import { STOFFEN } from '@/lib/stoffen'

/** Compacte stoffen-vergelijking op de productpagina, naast de FAQ. */
export default function StoffenStrip() {
  return (
    <div className="mt-10">
      <div className="flex items-baseline justify-between">
        <p className="label-caps reg-mark pl-4 text-ink/50">De stof</p>
        <Link href="/stoffen" className="text-xs text-accent-dark hover:underline">
          Vergelijk de stoffen →
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {STOFFEN.map((stof) => (
          <Link key={stof.key} href="/stoffen" className="group block">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[3px] border border-ink/15 bg-black/5">
              <Image
                src={stof.img}
                alt={stof.alt}
                fill
                sizes="(max-width:768px) 50vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {stof.populair && (
                <span className="absolute left-2 top-2 rounded-full bg-ink/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-canvas">
                  Populair
                </span>
              )}
            </div>
            <p className="mt-2 flex items-baseline justify-between gap-2">
              <span className="font-semibold">{stof.naam}</span>
              <span className="text-xs text-ink/55">{stof.ondertitel}</span>
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
