import { Locale } from "@/core/email/locale"
import { Button, Section, Text } from "react-email"
import { emailButton, EmailLayout } from "@/core/email/email-kit"
import * as React from "react"

// Every template keeps its copy for all locales side by side, so a missing
// translation is a type error, not a silent English e-mail.
const copy: Record<
  Locale,
  {
    subject: string
    heading: string
    to: string
    body: (currentEmail: string, newEmail: string) => string
    button: string
    ignore: string
  }
> = {
  en: {
    subject: "Confirm your e-mail change",
    heading: "Confirm your e-mail change",
    to: "To",
    body: (currentEmail, newEmail) =>
      `After you confirm, your sign-in e-mail changes from ${currentEmail} to ${newEmail}.`,
    button: "Confirm e-mail change",
    ignore: "If you didn't ask for this change, don't use the link.",
  },
  cs: {
    subject: "Potvrďte změnu e-mailu",
    heading: "Potvrďte změnu e-mailu",
    to: "Komu",
    body: (currentEmail, newEmail) =>
      `Po potvrzení se přihlašovací e-mail změní z ${currentEmail} na ${newEmail}.`,
    button: "Potvrdit změnu e-mailu",
    ignore: "Pokud jste o změnu nežádali, odkaz nepoužívejte.",
  },
}

export const changeEmailSubject = (locale: Locale): string => copy[locale].subject

export interface ChangeEmailProps {
  url: string
  locale: Locale
  currentEmail: string
  newEmail: string
}

// Figma: E19 · Ověření nové adresy · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=19681-1573
export const ChangeEmail = ({
  url,
  locale,
  currentEmail,
  newEmail,
}: ChangeEmailProps): React.JSX.Element => {
  const text = copy[locale]
  return (
    <EmailLayout
      locale={locale}
      preview={text.heading}
      heading={text.heading}
      introduction={
        <Text className="text-ink text-sm leading-5 mt-4">
          {text.to}: {newEmail}
        </Text>
      }
    >
      <Text className="text-ink text-base leading-6">{text.body(currentEmail, newEmail)}</Text>
      <Section className="text-center my-8">
        <Button
          href={url}
          className={emailButton}
        >
          {text.button}
        </Button>
      </Section>
      <Text className="text-ink text-sm leading-5">{text.ignore}</Text>
    </EmailLayout>
  )
}

// Preview data for `pnpm backend email:dev`.
ChangeEmail.PreviewProps = {
  url: "https://team-1.vsepractical.applifting.dev/api/auth/verify-email?token=preview",
  locale: "cs",
  currentEmail: "eva.mala@example.cz",
  newEmail: "eva.nova@example.cz",
} satisfies ChangeEmailProps

export default ChangeEmail
