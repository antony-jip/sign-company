import React from 'react'

/**
 * Renders basic markdown formatting in Daan chat messages.
 * Supports: **bold**, *italic*, `code`
 */
export function renderForgieMarkdown(text: string): React.ReactNode {
  // Split text into lines to preserve whitespace-pre-wrap behavior
  const lines = text.split('\n')

  return (
    <>
      {lines.map((line, lineIdx) => (
        <React.Fragment key={lineIdx}>
          {lineIdx > 0 && '\n'}
          {parseLine(line)}
        </React.Fragment>
      ))}
    </>
  )
}

function parseLine(line: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  // Match **bold**, *italic*, and `code` patterns
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(line)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index))
    }

    if (match[2]) {
      // **bold**
      parts.push(<strong key={match.index}>{match[2]}</strong>)
    } else if (match[3]) {
      // *italic*
      parts.push(<em key={match.index}>{match[3]}</em>)
    } else if (match[4]) {
      // `code`
      parts.push(
        <code key={match.index} className="bg-muted px-1 py-0.5 rounded text-xs">
          {match[4]}
        </code>
      )
    }

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < line.length) {
    parts.push(line.slice(lastIndex))
  }

  return parts
}
