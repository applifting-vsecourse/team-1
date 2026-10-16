import { RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

type ErrorStateProps = {
  title: string
  error: Error
  /** Retry belongs here and only here — normal UI refetches on its own. */
  onRetry?: () => void
}

export function ErrorState({ title, error, onRetry }: ErrorStateProps) {
  const { t } = useTranslation()

  return (
    <Alert variant="destructive">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-3">
        <span>{error.message}</span>
        {onRetry ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
          >
            <RefreshCw className="size-4" />
            {t("state.retry")}
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  )
}
