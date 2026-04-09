import { useState } from 'react'
import { PortaalFeedItemOfferte } from './PortaalFeedItemOfferte'
import { PortaalFeedItemFactuur } from './PortaalFeedItemFactuur'
import { PortaalFeedItemTekening } from './PortaalFeedItemTekening'
import { PortaalFeedItemAfbeelding } from './PortaalFeedItemAfbeelding'
import { PortaalFeedItemBericht } from './PortaalFeedItemBericht'
import { PortaalKlantReactie } from './PortaalKlantReactie'
import { PortaalReactieFormInline } from './PortaalReactieFormInline'

interface FeedItemData {
  id: string
  type: string
  titel: string
  omschrijving?: string | null
  label?: string | null
  status: string
  bekeken_op?: string | null
  mollie_payment_url?: string | null
  bedrag?: number | null
  factuur_id?: string | null
  offerte_id?: string | null
  volgorde?: number
  created_at: string
  bericht_type?: string | null
  bericht_tekst?: string | null
  foto_url?: string | null
  afzender?: string | null
  offerte_publiek_token?: string | null
  bestanden?: { id: string; url: string; bestandsnaam: string; mime_type?: string | null; grootte?: number | null; thumbnail_url?: string | null }[]
  reacties?: { id: string; type: string; bericht?: string | null; klant_naam?: string | null; foto_url?: string | null; created_at: string }[]
}

interface PortaalFeedItemProps {
  item: FeedItemData
  token: string
  klantNaam: string
  bedrijfNaam?: string
  kanOfferteGoedkeuren: boolean
  kanTekeningGoedkeuren: boolean
  onReactie: () => void
  onImageClick?: (url: string) => void
  isPublic: boolean
}

export function PortaalFeedItem({
  item,
  token,
  klantNaam,
  bedrijfNaam,
  kanOfferteGoedkeuren,
  kanTekeningGoedkeuren,
  onReactie,
  onImageClick,
  isPublic,
}: PortaalFeedItemProps) {
  const [showReactieForm, setShowReactieForm] = useState(false)

  // Skip internal notes in public view
  if (isPublic && item.bericht_type === 'notitie_intern') return null

  const itemType = item.type === 'bericht' || item.bericht_type === 'tekst' || item.bericht_type === 'foto'
    ? 'bericht'
    : item.type === 'opdrachtbevestiging'
      ? 'offerte'
      : item.type

  const handleVragenStellen = () => setShowReactieForm(true)

  return (
    <div className="space-y-2">
      {/* Item card */}
      {itemType === 'offerte' && (
        <PortaalFeedItemOfferte
          item={item}
          token={token}
          klantNaam={klantNaam}
          kanGoedkeuren={kanOfferteGoedkeuren}
          onReactie={onReactie}
          onVragenStellen={handleVragenStellen}
        />
      )}
      {itemType === 'factuur' && (
        <PortaalFeedItemFactuur
          item={item}
          token={token}
          onVragenStellen={handleVragenStellen}
        />
      )}
      {itemType === 'tekening' && (
        <PortaalFeedItemTekening
          item={item}
          token={token}
          klantNaam={klantNaam}
          kanGoedkeuren={kanTekeningGoedkeuren}
          onReactie={onReactie}
          onVragenStellen={handleVragenStellen}
          onImageClick={onImageClick}
        />
      )}
      {itemType === 'afbeelding' && (
        <PortaalFeedItemAfbeelding
          item={item}
          onVragenStellen={handleVragenStellen}
          onImageClick={onImageClick}
        />
      )}
      {itemType === 'bericht' && (
        <PortaalFeedItemBericht
          item={item}
          bedrijfNaam={bedrijfNaam}
          onVragenStellen={handleVragenStellen}
          onImageClick={onImageClick}
        />
      )}

      {/* Internal note indicator */}
      {!isPublic && item.bericht_type === 'notitie_intern' && (
        <div
          className="rounded-[10px] px-4 py-3"
          style={{ backgroundColor: '#FFFBEB', border: '0.5px solid #FDE68A' }}
        >
          <p className="text-xs font-medium" style={{ color: '#92400E' }}>
            Interne notitie (niet zichtbaar voor klant)
          </p>
          {item.bericht_tekst && (
            <p className="mt-1 text-sm whitespace-pre-wrap" style={{ color: '#78350F' }}>
              {item.bericht_tekst}
            </p>
          )}
        </div>
      )}

      {/* Reacties */}
      {item.reacties && item.reacties.length > 0 && (
        <div className="space-y-2">
          {item.reacties.map((r) => (
            <PortaalKlantReactie
              key={r.id}
              type={r.type as 'goedkeuring' | 'revisie' | 'bericht'}
              bericht={r.bericht}
              klantNaam={r.klant_naam}
              fotoUrl={r.foto_url}
              createdAt={r.created_at}
              onImageClick={onImageClick}
            />
          ))}
        </div>
      )}

      {/* Inline reactie form */}
      {showReactieForm && isPublic && (
        <PortaalReactieFormInline
          token={token}
          itemId={item.id}
          itemTitel={item.titel}
          klantNaam={klantNaam}
          onClose={() => setShowReactieForm(false)}
          onReactie={() => {
            setShowReactieForm(false)
            onReactie()
          }}
        />
      )}
    </div>
  )
}
