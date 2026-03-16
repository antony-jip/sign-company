interface ChatMessage {
  id: string
  type: 'bubble' | 'rich_card' | 'reaction'
  source: 'bedrijf' | 'klant'
  timestamp: string
  text?: string
  isInternalNote?: boolean
  fotoUrl?: string
  senderName?: string
}

interface PortaalChatBubbleProps {
  message: ChatMessage
  isOwnMessage: boolean
  onImageClick?: (url: string) => void
}

export function PortaalChatBubble({ message, isOwnMessage, onImageClick }: PortaalChatBubbleProps) {
  const time = new Intl.DateTimeFormat('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(message.timestamp))

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[70%]">
        <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
          {message.senderName && <span>{message.senderName}</span>}
          <span>{time}</span>
        </div>

        <div
          className={[
            'rounded-lg px-3 py-2',
            isOwnMessage ? 'rounded-br-sm bg-[#f0f5f3]' : 'rounded-bl-sm bg-muted',
            message.isInternalNote
              ? 'border-l-[3px] border-amber-300 bg-amber-50 italic'
              : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {message.isInternalNote && (
            <div className="mb-1 text-xs text-amber-600">
              🔒 Interne notitie
            </div>
          )}

          {message.fotoUrl && (
            <img
              src={message.fotoUrl}
              alt=""
              className="max-w-[300px] cursor-pointer rounded"
              onClick={() => onImageClick?.(message.fotoUrl!)}
            />
          )}

          {message.text && (
            <p className="text-sm whitespace-pre-wrap">{message.text}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export type { ChatMessage }
