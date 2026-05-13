import { useEffect, useMemo, useState } from 'react'
import { prefersReducedMotion } from '../lib/motion'

type ConfettiBurstProps = {
  fireKey: number
}

const colors = ['#1F1D1A', '#6F6A63', '#DED8CF', '#B8A56E', '#8A6F5A']

function ConfettiBurst({ fireKey }: ConfettiBurstProps) {
  const [isVisible, setIsVisible] = useState(false)
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, index) => ({
        color: colors[index % colors.length],
        delay: `${(index % 7) * 18}ms`,
        left: `${18 + ((index * 17) % 64)}%`,
        rotate: `${(index * 41) % 180}deg`,
        x: `${((index % 2 === 0 ? 1 : -1) * (24 + (index % 6) * 10))}px`,
      })),
    [],
  )

  useEffect(() => {
    if (fireKey === 0 || prefersReducedMotion()) {
      return
    }

    setIsVisible(true)
    const timeoutId = window.setTimeout(() => setIsVisible(false), 950)

    return () => window.clearTimeout(timeoutId)
  }, [fireKey])

  if (!isVisible) {
    return null
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-20 z-[60] flex justify-center overflow-hidden"
    >
      <div className="relative h-40 w-full max-w-2xl">
        {pieces.map((piece, index) => (
          <span
            className="absolute top-2 h-2.5 w-1.5 rounded-sm opacity-0"
            key={`${fireKey}-${index}`}
            style={{
              animation: 'closelist-confetti 850ms ease-out forwards',
              animationDelay: piece.delay,
              backgroundColor: piece.color,
              left: piece.left,
              '--confetti-x': piece.x,
              '--confetti-rotate': piece.rotate,
            } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  )
}

export default ConfettiBurst
