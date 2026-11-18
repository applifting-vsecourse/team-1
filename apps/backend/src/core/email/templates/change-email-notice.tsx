import { Locale } from "@/core/email/locale"
import { Text } from "react-email"
import { EmailLayout } from "@/core/email/email-kit"
import * as React from "react"

// Every template keeps its copy for all locales side by side, so a missing
// translation is a type error, not a silent English e-mail.
// Sent to the OLD address when a change of the sign-in e-mail is requested (US-125, security).
const copy: Record<
  Locale,
  {
    subject: string
    heading: string
    body: (newEmail: string) => string
    ignore: string
  }
> = {
  en: {
    subject: "A change of your sign-in e-mail was requested",
    heading: "A change of your sign-in e-mail was requested",
    body: (newEmail) =>
      `Someone asked to change the sign-in e-mail of your Togena account to ${newEmail}. The change takes effect only after the link sent to that address is confirmed; until then you keep signing in with this e-mail.`,
    ignore: "If it wasn't you, change your password and don't confirm anything.",
  },
  cs: {
    subject: "Byla požádána změna přihlašovacího e-mailu",
    heading: "Byla požádána změna přihlašovacího e-mailu",
    body: (newEmail) =>
      `Někdo požádal o změnu přihlašovacího e-mailu vašeho účtu v Togeně na ${newEmail}. Změna začne platit až po potvrzení odkazu zaslaného na tuto adresu; do té doby se přihlašujete tímto e-mailem.`,
    ignore: "Pokud jste to nebyli vy, změňte si heslo a nic nepotvrzujte.",
  },
}

export const changeEmailNoticeSubject = (locale: Locale): string => copy[locale].subject

export interface ChangeEmailNoticeProps {
  locale: Locale
  newEmail: string
}

// Figma: E20 · Upozornění na změnu adresy · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=19681-1629
export const ChangeEmailNotice = ({
  locale,
  newEmail,
}: ChangeEmailNoticeProps): React.JSX.Element => {
  const text = copy[locale]
  return (
    <EmailLayout
      locale={locale}
      preview={text.heading}
      heading={text.heading}
      introduction={
        <Text className="text-ink text-base leading-6 mt-4">{text.body(newEmail)}</Text>
      }
    >
      <Text className="text-ink text-sm leading-5">{text.ignore}</Text>
    </EmailLayout>
  )
}

// Preview data for `pnpm backend email:dev`.
ChangeEmailNotice.PreviewProps = {
  locale: "cs",
  newEmail: "eva.nova@example.cz",
} satisfies ChangeEmailNoticeProps

export default ChangeEmailNotice
