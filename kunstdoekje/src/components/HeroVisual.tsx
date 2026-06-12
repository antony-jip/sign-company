'use client'

import Image from 'next/image'
import { useState } from 'react'

const KLEUREN = [
  { key: 'zwart', label: 'Zwart frame', cls: 'bg-[#1a1a1a]' },
  { key: 'zilver', label: 'Zilver frame', cls: 'bg-gradient-to-br from-[#a8a8a8] to-[#d4d4d4]' },
  { key: 'wit', label: 'Wit frame', cls: 'bg-white' },
]

/** Hero-beeld als ingelijst werk: inktkader, gouden drukschaduw, galerijplaquette. */
export default function HeroVisual() {
  const [actief, setActief] = useState('zwart')

  return (
    <div className="relative flex justify-center lg:justify-end">
      <div className="w-full max-w-[520px]">
        <div className="rounded-[3px] border border-ink/60 bg-paper p-3 shadow-hard-gold sm:p-4">
          <div className="relative aspect-[3/4] overflow-hidden">
            <Image
              src="/home/hero.jpg"
              alt="Kunstdoekje wissellijst met fluwelen kunstdoek in modern interieur"
              fill
              priority
              sizes="(max-width:1024px) 100vw, 520px"
              className="object-cover"
            />
          </div>
          {/* Plaquette */}
          <div className="plaquette mt-3">
            <span>Nº 0001 — Velvet</span>
            <span className="flex items-center gap-2 normal-case tracking-normal">
              {KLEUREN.map((k) => (
                <button
                  key={k.key}
                  type="button"
                  aria-label={k.label}
                  onClick={() => setActief(k.key)}
                  className={`h-4 w-4 border border-ink/40 transition ${k.cls} ${
                    actief === k.key ? 'ring-2 ring-accent ring-offset-1 ring-offset-paper' : 'opacity-60 hover:opacity-100'
                  }`}
                />
              ))}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
