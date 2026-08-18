import React from 'react'
import { Link } from 'react-router-dom'

/**
 * Renders basic markdown formatting in Daan chat messages.
 * Supports: [label](/route) links, **bold**, *italic*, `code`
 *
 * Internal routes (href starts with "/") render as a React Router Link so
 * navigation stays within the SPA. onNavigate lets a caller react to a click,
 * e.g. the chat widget closing itself so the destination is visible.
 */
export function renderForgieMarkdown(text: string, onNavigate?: () => void): React.ReactNode {
  // Split text into lines to preserve whitespace-pre-wrap behavior
  const lines = text.split('\n')

  return (
    <>
      {lines.map((line, lineIdx) => (
        <React.Fragment key={lineIdx}>
          {lineIdx > 0 && '\n'}
          {parseLine(line, onNavigate)}
        </React.Fragment>
      ))}
    </>
  )
}

const LINK_CLASS = 'text-petrol dark:text-white underline underline-offset-2 hover:opacity-80 font-medium'

function parseLine(line: string, onNavigate?: () => void): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  // Match [label](href), **bold**, *italic*, and `code` patterns
  const regex = /(\[([^\]]+)\]\(([^)]+)\)|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(line)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index))
    }

    if (match[3] !== undefined) {
      // [label](href)
      const label = match[2]
      const href = match[3]
      if (/^https?:\/\//i.test(href)) {
        parts.push(
          <a key={match.index} href={href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
            {label}
          </a>
        )
      } else {
        parts.push(
          <Link key={match.index} to={href} onClick={onNavigate} className={LINK_CLASS}>
            {label}
          </Link>
        )
      }
    } else if (match[4]) {
      // **bold**
      parts.push(<strong key={match.index}>{match[4]}</strong>)
    } else if (match[5]) {
      // *italic*
      parts.push(<em key={match.index}>{match[5]}</em>)
    } else if (match[6]) {
      // `code`
      parts.push(
        <code key={match.index} className="bg-muted px-1 py-0.5 rounded text-xs">
          {match[6]}
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
