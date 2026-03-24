'use client'

import { useEffect, useState } from 'react'

interface TypeWriterProps {
  text: string
  className?: string
  delay?: number
  speed?: number
}

export default function TypeWriter({
  text,
  className = '',
  delay = 1500,
  speed = 80,
}: TypeWriterProps) {
  const [displayedText, setDisplayedText] = useState('')
  const [showCursor, setShowCursor] = useState(true)
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    const startTimeout = setTimeout(() => {
      setIsTyping(true)
      let i = 0
      const interval = setInterval(() => {
        if (i < text.length) {
          setDisplayedText(text.slice(0, i + 1))
          i++
        } else {
          clearInterval(interval)
          setIsTyping(false)
        }
      }, speed)
      return () => clearInterval(interval)
    }, delay)

    return () => clearTimeout(startTimeout)
  }, [text, delay, speed])

  // Blink cursor
  useEffect(() => {
    if (isTyping) {
      setShowCursor(true)
      return
    }
    const blink = setInterval(() => setShowCursor((v) => !v), 530)
    return () => clearInterval(blink)
  }, [isTyping])

  // Find the last dot for Flame coloring
  const lastDotIndex = displayedText.lastIndexOf('.')

  return (
    <span className={`font-mono ${className}`}>
      {lastDotIndex >= 0 ? (
        <>
          {displayedText.slice(0, lastDotIndex)}
          <span className="text-flame">.</span>
          {displayedText.slice(lastDotIndex + 1)}
        </>
      ) : (
        displayedText
      )}
      <span
        className={`inline-block w-[2px] h-[1em] bg-flame ml-[1px] align-middle transition-opacity duration-100 ${
          showCursor ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </span>
  )
}
