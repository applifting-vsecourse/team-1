import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"

import { CardFooterLinks } from "@/features/auth/components/CardFooterLinks"
import { LinkSent } from "@/features/auth/components/LinkSent"
import { RequestMagicLinkForm } from "@/features/auth/components/RequestMagicLinkForm"
import { SignInWithRedirect } from "@/features/auth/components/SignInWithRedirect"

type Mode = {
  kind: "password" | "link" | "sent"
  email: string
  /** Reached by a switch inside the card (not on page load): focus moves to the new state. */
  isSwitched?: boolean
}

/**
 * The participant sign-in card (US-02): the password, or — after „Nemáte heslo?“ — a sign-in link
 * in the same card (Cal.com), then the sent state. The e-mail carries over between the modes.
 * Each switch replaces what the visitor was on, so focus follows: the e-mail field of the link
 * request, the heading of the sent state (`LinkSent`) and of the password sign-in.
 */
// Figma (Design system v2): US-02 / Přihlášení přihlašovatele · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15315-2 (odkazem 18566-1444, odesláno 18566-1535)
export function ParticipantSignIn({ from }: { from?: string }) {
  const { t } = useTranslation("auth")
  const [mode, setMode] = useState<Mode>({ kind: "password", email: "" })
  const headingRef = useRef<HTMLHeadingElement>(null)
  const switchTo = (kind: Mode["kind"], email: string) => setMode({ kind, email, isSwitched: true })

  useEffect(() => {
    if (mode.kind === "password" && mode.isSwitched) headingRef.current?.focus()
  }, [mode])

  if (mode.kind === "sent") {
    return (
      <LinkSent
        email={mode.email}
        back={
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-base font-normal text-link underline"
            onClick={() => switchTo("password", mode.email)}
          >
            {t("linkSent.back")}
          </Button>
        }
      />
    )
  }

  return (
    <>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-2xl font-bold outline-none"
      >
        {t("participantLogin.title")}
      </h1>
      {mode.kind === "password" ? (
        <SignInWithRedirect
          from={from}
          accountType="PARTICIPANT"
          fallback={ROUTES.participant.applications}
          defaultEmail={mode.email}
          onRequestLink={(email) => switchTo("link", email)}
        />
      ) : (
        <RequestMagicLinkForm
          defaultEmail={mode.email}
          submitLabel={t("participantLogin.sendLink")}
          shouldFocusEmail
          onSent={(email) => switchTo("sent", email)}
          onUsePassword={(email) => switchTo("password", email)}
        />
      )}
      <CardFooterLinks
        question={t("participantLogin.organizerQuestion")}
        links={[{ to: ROUTES.organizer.login, label: t("participantLogin.organizerLink") }]}
      />
    </>
  )
}
