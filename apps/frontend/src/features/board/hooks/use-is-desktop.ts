import { useSyncExternalStore } from "react"

const DESKTOP_QUERY = "(min-width: 64rem)"

const subscribe = (onChange: () => void) => {
  const query = window.matchMedia?.(DESKTOP_QUERY)
  query?.addEventListener("change", onChange)
  return () => query?.removeEventListener("change", onChange)
}

/** The board shows the list and the detail side by side from `lg`; below it they are two screens. */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia?.(DESKTOP_QUERY).matches ?? false,
    () => false,
  )
}
