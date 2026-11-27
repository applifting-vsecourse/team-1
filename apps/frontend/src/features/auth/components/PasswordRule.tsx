import { Check } from "lucide-react"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

export const MIN_PASSWORD_LENGTH = 8

/**
 * The live rule under a new password (Stripe, Vercel): „Alespoň 8 znaků“ turns green once met,
 * instead of a hint above and an error after submitting.
 */
export function PasswordRule({
  password,
  id,
  hasError = false,
}: {
  password: string
  id?: string
  /** Submitted while still unmet. */
  hasError?: boolean
}) {
  const { t } = useTranslation("auth")
  const isMet = password.length >= MIN_PASSWORD_LENGTH

  return (
    <p
      id={id}
      className={cn(
        "flex items-center gap-2 text-sm",
        isMet ? "text-status-success" : hasError ? "text-field-error" : "text-muted-foreground",
      )}
    >
      <Check
        aria-hidden
        className="size-4"
      />
      <span aria-hidden>{t("passwordRule.minLength")}</span>
      {/* One text node, so screen readers hear the rule and whether it is met as one phrase. */}
      <span className="sr-only">
        {`${t("passwordRule.minLength")} ${isMet ? t("passwordRule.met") : t("passwordRule.notMet")}`}
      </span>
    </p>
  )
}
