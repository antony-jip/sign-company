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

  // Internal notes have special styling
  if (message.isInternalNote) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[65%] md:max-w-[65%] max-[768px]:max-w-[85%]">
          <div className="mb-1 flex items-center justify-end gap-2 text-xs text-muted-foreground">
            <span>Jij</span>
            <span>{time}</span>
          </div>
          <div className="rounded-2xl rounded-br-md border-l-[3px] border-[#F5C4B4] bg-[#FDE8E2]/80 px-4 py-2.5 shadow-sm">
            <div className="mb-1 flex items-center gap-1 text-xs font-medium text-[#C03A18]">
              Intern
            </div>
            <p className="text-sm italic whitespace-pre-wrap text-foreground">{message.text}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[65%] md:max-w-[65%] max-[768px]:max-w-[85%]">
        <div className={`mb-1 flex items-center gap-2 text-xs text-muted-foreground ${isOwnMessage ? 'justify-end' : ''}`}>
          <span>{isOwnMessage ? 'Jij' : (message.senderName || 'Klant')}</span>
          <span>{time}</span>
        </div>

        <div
          className={
            isOwnMessage
              ? 'rounded-2xl rounded-br-md bg-[#E8F2EC] px-4 py-2.5 shadow-sm'
              : 'rounded-2xl rounded-bl-md border border-border bg-white px-4 py-2.5'
          }
        >
          {message.fotoUrl && (
            <img
              src={message.fotoUrl}
              alt=""
              className="max-w-[300px] cursor-pointer rounded-lg"
              onClick={() => onImageClick?.(message.fotoUrl!)}
            />
          )}

          {message.text && (
            <p className="text-sm whitespace-pre-wrap text-foreground">{message.text}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export type { ChatMessage }
