import { Check, Circle } from "lucide-react"
import { useTranslation } from "react-i18next"

import { useFormField } from "@/components/ui/form"
import { cn } from "@/lib/utils"

export const MIN_PASSWORD_LENGTH = 8

type Props = {
  password: string
  id?: string
  /** Submitted while still unmet. */
  hasError?: boolean
}

/**
 * The live rule under a new password (Stripe, Vercel): „Alespoň 8 znaků“ with an empty circle,
 * which turns into a green check once met — the state is in the icon shape, not only its colour;
 * the text stays ink (Figma 27462:8826, 15316:10038). Submitted while unmet, the rule turns red.
 */
export function PasswordRule({ password, id, hasError = false }: Props) {
  const { t } = useTranslation("auth")
  const isMet = password.length >= MIN_PASSWORD_LENGTH
  const Icon = isMet ? Check : Circle

  return (
    <p
      id={id}
      className={cn(
        "flex items-center gap-2 text-sm",
        !isMet && hasError ? "text-field-error" : "text-foreground",
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "size-4",
          isMet && "text-status-success",
          !isMet && !hasError && "text-muted-foreground",
        )}
      />
      <span aria-hidden>{t("passwordRule.minLength")}</span>
      {/* One text node, so screen readers hear the rule and whether it is met as one phrase. */}
      <span className="sr-only">
        {`${t("passwordRule.minLength")} ${isMet ? t("passwordRule.met") : t("passwordRule.notMet")}`}
      </span>
    </p>
  )
}

/**
 * The rule inside a react-hook-form `FormItem`: it takes the field's description id, so
 * `FormControl` links it to the input together with the error message.
 */
export function FormPasswordRule(props: Omit<Props, "id">) {
  const { formDescriptionId } = useFormField()
  return (
    <PasswordRule
      id={formDescriptionId}
      {...props}
    />
  )
}
