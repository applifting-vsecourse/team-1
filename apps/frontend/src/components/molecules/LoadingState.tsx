import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

type LoadingStateProps = {
  /** Announced to screen readers; the spinner itself is decorative. */
  label?: string
}

export function LoadingState({ label }: LoadingStateProps) {
  const { t } = useTranslation()

  return (
    <div
      role="status"
      className="flex items-center justify-center py-8 text-muted-foreground"
    >
      <Loader2
        aria-hidden
        className="size-5 animate-spin"
      />
      <span className="sr-only">{label ?? t("state.loading")}</span>
    </div>
  )
}
