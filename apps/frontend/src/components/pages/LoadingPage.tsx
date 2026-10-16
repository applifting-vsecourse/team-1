import { Loader2 } from "lucide-react"

export function LoadingPage() {
  return (
    <div
      role="status"
      className="grid min-h-svh place-content-center"
    >
      <Loader2
        aria-hidden
        className="size-8 animate-spin text-muted-foreground"
      />
      <span className="sr-only">Načítání…</span>
    </div>
  )
}
