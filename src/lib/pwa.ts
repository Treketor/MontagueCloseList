type NavigatorWithStandalone = Navigator & {
  standalone?: boolean
}

export function isStandaloneMode() {
  const isDisplayModeStandalone = window.matchMedia(
    '(display-mode: standalone)',
  ).matches
  const isIosStandalone = Boolean(
    (window.navigator as NavigatorWithStandalone).standalone,
  )

  return isDisplayModeStandalone || isIosStandalone
}
