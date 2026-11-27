import { useSyncExternalStore } from "react"

// Tailwind `lg`: from here the price sits in a panel next to the form, below it in a bar at the bottom.
const WIDE_QUERY = "(min-width: 64rem)"

const subscribe = (onChange: () => void) => {
  const query = window.matchMedia?.(WIDE_QUERY)
  query?.addEventListener("change", onChange)
  return () => query?.removeEventListener("change", onChange)
}

/** Without `matchMedia` (tests) the form keeps the side panel. */
export function useIsWideLayout(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia?.(WIDE_QUERY).matches ?? true,
    () => true,
  )
}
