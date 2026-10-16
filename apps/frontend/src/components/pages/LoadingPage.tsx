import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

export function LoadingPage() {
  const { t } = useTranslation()

  return (
    <div
      role="status"
      className="grid min-h-svh place-content-center"
    >
      <Loader2
        aria-hidden
        className="size-8 animate-spin text-muted-foreground"
      />
      <span className="sr-only">{t("state.loading")}</span>
    </div>
  )
}
