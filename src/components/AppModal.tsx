import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

type AppModalProps = {
  children: ReactNode
  description?: string
  isOpen: boolean
  onClose: () => void
  size?: 'sm' | 'md' | 'lg'
  title: string
}

const sizeClass = {
  sm: 'max-w-lg',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
}

function AppModal({
  children,
  description,
  isOpen,
  onClose,
  size = 'md',
  title,
}: AppModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-[#1F1D1A]/35 p-4 motion-reduce:animate-none"
      onMouseDown={onClose}
      role="presentation"
    >
      <section
        aria-modal="true"
        className={[
          'flex max-h-[82dvh] w-full flex-col overflow-hidden rounded-2xl border border-[#DED8CF] bg-[#FFFCF7] text-[#1F1D1A]',
          'animate-rise-in motion-reduce:animate-none',
          sizeClass[size],
        ].join(' ')}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#DED8CF] p-5">
          <div>
            <h2 className="text-2xl font-extrabold leading-tight">{title}</h2>
            {description ? (
              <p className="mt-1 text-base font-semibold text-[#6F6A63]">
                {description}
              </p>
            ) : null}
          </div>
          <button
            aria-label="Close"
            className="interactive-press inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[#DED8CF] bg-[#F7F4EF] text-[#1F1D1A] active:bg-[#EFE8DD] focus:outline-none focus:ring-2 focus:ring-[#1F1D1A] focus:ring-offset-2 focus:ring-offset-[#FFFCF7]"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </section>
    </div>,
    document.body,
  )
}

export default AppModal
