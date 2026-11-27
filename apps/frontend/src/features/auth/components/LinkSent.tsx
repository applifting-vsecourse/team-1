import type { ReactNode } from "react"
import { TriangleAlert } from "lucide-react"
import { Trans, useTranslation } from "react-i18next"

import EmailSent from "@/assets/illustrations/email-sent.svg?react"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import { useCountdown } from "@/features/auth/hooks/useCountdown"
import { useRequestMagicLink } from "@/features/auth/hooks/useRequestMagicLink"
import { linkRequestError } from "@/features/auth/lib/link-request-error"

/** How long „Poslat znovu“ waits; the server allows 3 links a minute from one address. */
const RESEND_AFTER_SECONDS = 30

type Props = {
  email: string
  /** „Zpět na přihlášení“: a button back to the password in the same card, or a link to the sign-in. */
  back: ReactNode
}

/**
 * The sign-in link went out — or not: the server answers the same for any e-mail, so the sentence
 * stays conditional and never says whether an account exists. „Poslat znovu“ counts down first
 * (Notion, Linear).
 */
// Figma (Design system v2): Odkaz odeslán · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=18566-1535 (mobile 18566-1588)
export function LinkSent({ email, back }: Props) {
  const { t } = useTranslation("auth")
  const { t: tErrors } = useTranslation("errors")
  const countdown = useCountdown(RESEND_AFTER_SECONDS)
  const request = useRequestMagicLink()

  return (
    <>
      <div
        role="status"
        className="flex flex-col gap-4"
      >
        <EmailSent className="h-24 w-32" />
        <h1 className="text-2xl font-bold">{t("linkSent.title")}</h1>
        <p>
          <Trans
            t={t}
            i18nKey="linkSent.body"
            values={{ email }}
            components={{ strong: <strong className="font-semibold break-all" /> }}
          />
        </p>
      </div>
      {request.isError ? (
        <Alert variant="destructive">
          <TriangleAlert aria-hidden />
          <AlertTitle>{linkRequestError(request.error, t, tErrors)}</AlertTitle>
        </Alert>
      ) : null}
      <p className="flex flex-wrap items-center justify-center gap-x-1 border-t border-border pt-4 text-muted-foreground">
        {countdown.left > 0 ? (
          <span>{t("linkSent.resendIn", { seconds: countdown.left })}</span>
        ) : (
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-base font-normal text-link underline"
            disabled={request.isPending}
            onClick={() => request.mutate(email, { onSuccess: countdown.restart })}
          >
            {t("linkSent.resend")}
          </Button>
        )}
        <span aria-hidden>·</span>
        {back}
      </p>
    </>
  )
}
