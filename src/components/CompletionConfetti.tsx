import { useEffect, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { prefersReducedMotion } from '../lib/motion'

type CompletionConfettiProps = {
  fireKey: number
}

const pieces = [
  { left: 46, top: 18, x: -130, y: 160, r: -110, delay: 0, color: '#1F1D1A', w: 8, h: 14 },
  { left: 50, top: 17, x: -88, y: 135, r: 95, delay: 35, color: '#B8A56E', w: 9, h: 9 },
  { left: 53, top: 18, x: -46, y: 170, r: 135, delay: 15, color: '#6F6A63', w: 7, h: 13 },
  { left: 48, top: 20, x: -16, y: 145, r: -80, delay: 65, color: '#DED8CF', w: 10, h: 10 },
  { left: 52, top: 19, x: 24, y: 165, r: 120, delay: 20, color: '#1F1D1A', w: 7, h: 14 },
  { left: 55, top: 18, x: 68, y: 138, r: -140, delay: 50, color: '#B8A56E', w: 9, h: 9 },
  { left: 49, top: 21, x: 106, y: 178, r: 160, delay: 5, color: '#6F6A63', w: 8, h: 13 },
  { left: 51, top: 20, x: 142, y: 150, r: -90, delay: 70, color: '#DED8CF', w: 10, h: 10 },
  { left: 45, top: 22, x: -112, y: 220, r: 150, delay: 105, color: '#B8A56E', w: 8, h: 12 },
  { left: 55, top: 22, x: 116, y: 215, r: -150, delay: 115, color: '#1F1D1A', w: 8, h: 12 },
  { left: 47, top: 19, x: -162, y: 118, r: 80, delay: 80, color: '#DED8CF', w: 9, h: 9 },
  { left: 54, top: 19, x: 166, y: 122, r: -85, delay: 90, color: '#6F6A63', w: 9, h: 9 },
]

function CompletionConfetti({ fireKey }: CompletionConfettiProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!fireKey || prefersReducedMotion()) {
      return
    }

    setIsVisible(true)
    const timeoutId = window.setTimeout(() => setIsVisible(false), 950)

    return () => window.clearTimeout(timeoutId)
  }, [fireKey])

  if (!isVisible) {
    return null
  }

  return createPortal(
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
      {pieces.map((piece, index) => (
        <span
          className="closelist-confetti-piece absolute"
          key={`${fireKey}-${index}`}
          style={
            {
              '--confetti-x': `${piece.x}px`,
              '--confetti-y': `${piece.y}px`,
              '--confetti-r': `${piece.r}deg`,
              animationDelay: `${piece.delay}ms`,
              backgroundColor: piece.color,
              borderRadius: piece.w === piece.h ? '999px' : '3px',
              height: `${piece.h}px`,
              left: `${piece.left}%`,
              top: `${piece.top}%`,
              width: `${piece.w}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>,
    document.body,
  )
}

export default CompletionConfetti
