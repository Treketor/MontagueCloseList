import { useState } from 'react'
import { isStandaloneMode } from '../lib/pwa'

const storageKey = 'closelist_hide_home_screen_hint'

function getDismissedState() {
  try {
    return window.localStorage.getItem(storageKey) === 'true'
  } catch {
    return false
  }
}

function HomeScreenHint() {
  const [isHidden, setIsHidden] = useState(() => {
    return isStandaloneMode() || getDismissedState()
  })

  function handleHide() {
    try {
      window.localStorage.setItem(storageKey, 'true')
    } catch {
      // Dismiss for this session if storage is unavailable.
    }
    setIsHidden(true)
  }

  if (isHidden) {
    return null
  }

  return (
    <section className="rounded-2xl border border-[#DED8CF] bg-[#FFFCF7] p-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <p className="text-base font-semibold leading-relaxed text-[#6F6A63]">
          For iPad use: open in Safari, tap Share, then Add to Home Screen.
        </p>
        <button
          className="min-h-11 rounded-xl border border-[#DED8CF] bg-[#FFFCF7] px-5 text-base font-bold text-[#1F1D1A] active:bg-[#EFE8DD] focus:outline-none focus:ring-2 focus:ring-[#1F1D1A] focus:ring-offset-2 focus:ring-offset-[#FFFCF7]"
          onClick={handleHide}
          type="button"
        >
          Hide
        </button>
      </div>
    </section>
  )
}

export default HomeScreenHint
