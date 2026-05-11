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
    <section className="rounded-md border border-neutral-800 p-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <p className="text-lg leading-relaxed text-neutral-300">
          For iPad use: open in Safari, tap Share, then Add to Home Screen.
        </p>
        <button
          className="min-h-12 rounded-md border border-neutral-700 px-5 text-lg font-semibold text-white active:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
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
