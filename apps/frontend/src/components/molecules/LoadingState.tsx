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
      className="mx-auto flex w-full max-w-50 flex-col items-center gap-3 p-4 text-center"
    >
      <span
        aria-hidden="true"
        className="submit-mark text-primary [--loading-mark-size:3.5rem]"
      >
        <span />
      </span>
      <span className="text-sm font-medium">{label ?? t("state.loading")}</span>
    </div>
  )
}
