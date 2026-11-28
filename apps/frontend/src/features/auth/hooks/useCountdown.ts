import { useEffect, useState } from "react"

/**
 * Whole seconds left of `seconds`, counted from a deadline (a tab in the background still ends
 * on time); `restart` starts again from the top.
 */
export function useCountdown(seconds: number) {
  const [endsAt, setEndsAt] = useState(() => Date.now() + seconds * 1000)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= endsAt) window.clearInterval(timer)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [endsAt])

  return {
    left: Math.max(0, Math.ceil((endsAt - now) / 1000)),
    restart: () => {
      const current = Date.now()
      setNow(current)
      setEndsAt(current + seconds * 1000)
    },
  }
}
