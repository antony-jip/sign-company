type Props = {
  left: number
  top: number
  width: number
  height: number
}

export function SelectionRectangle({ left, top, width, height }: Props) {
  return (
    <div
      className="fixed pointer-events-none z-50 rounded-sm"
      style={{
        left,
        top,
        width,
        height,
        backgroundColor: 'rgba(26,83,92,0.08)',
        border: '1px solid #1A535C',
      }}
    />
  )
}
