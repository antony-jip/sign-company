import { PortaalFeedItem } from './PortaalFeedItem'

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

interface PortaalFeedProps {
  items: FeedItemData[]
  token: string
  klantNaam: string
  bedrijfNaam?: string
  kanOfferteGoedkeuren?: boolean
  kanTekeningGoedkeuren?: boolean
  isPublic: boolean
  onReactie: () => void
  onImageClick?: (url: string) => void
}

export function PortaalFeed({
  items,
  token,
  klantNaam,
  bedrijfNaam,
  kanOfferteGoedkeuren = true,
  kanTekeningGoedkeuren = true,
  isPublic,
  onReactie,
  onImageClick,
}: PortaalFeedProps) {
  // Sort: chronological (oldest first for public, newest first for internal)
  const sorted = [...items].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime()
    const dateB = new Date(b.created_at).getTime()
    return isPublic ? dateA - dateB : dateB - dateA
  })

  if (sorted.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm" style={{ color: '#A0A098' }}>
          {isPublic
            ? 'Er zijn nog geen items gedeeld.'
            : 'Nog geen items in het portaal. Voeg een item toe via de knop hierboven.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sorted.map((item) => (
        <PortaalFeedItem
          key={item.id}
          item={item}
          token={token}
          klantNaam={klantNaam}
          bedrijfNaam={bedrijfNaam}
          kanOfferteGoedkeuren={kanOfferteGoedkeuren}
          kanTekeningGoedkeuren={kanTekeningGoedkeuren}
          onReactie={onReactie}
          onImageClick={onImageClick}
          isPublic={isPublic}
        />
      ))}
    </div>
  )
}
