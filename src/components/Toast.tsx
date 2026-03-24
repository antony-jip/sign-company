'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ToastProps {
  message: string
  isVisible: boolean
  onClose: () => void
}

export default function Toast({ message, isVisible, onClose }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timeout = setTimeout(onClose, 2500)
      return () => clearTimeout(timeout)
    }
  }, [isVisible, onClose])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-petrol text-white px-5 py-3 rounded-xl shadow-lg font-mono text-sm"
        >
          {message}
          <span className="text-flame">.</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Hook for the easter egg
export function useEasterEgg() {
  const [clickCount, setClickCount] = useState(0)
  const [showToast, setShowToast] = useState(false)

  const handlePuntClick = () => {
    const newCount = clickCount + 1
    setClickCount(newCount)
    if (newCount >= 5) {
      setShowToast(true)
      setClickCount(0)
    }
  }

  const closeToast = () => setShowToast(false)

  return { handlePuntClick, showToast, closeToast }
}
