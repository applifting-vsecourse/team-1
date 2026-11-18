import { Locale } from "@/core/email/locale"
import { Button, Section, Text } from "react-email"
import { emailButton, EmailLayout, EmailLinkHelp } from "@/core/email/email-kit"
import * as React from "react"

// Every template keeps its copy for all locales side by side, so a missing
// translation is a type error, not a silent English e-mail.
const copy: Record<
  Locale,
  {
    subject: string
    preview: string
    heading: string
    body: (name: string) => string
    button: string
    fallback: string
    ignore: string
  }
> = {
  en: {
    subject: "Password reset",
    preview: "Reset your Togena password",
    heading: "Reset your password",
    body: (name) =>
      `Hi ${name}, we received a request to reset your Togena password. Click the button below to choose a new one.`,
    button: "Choose a new password",
    fallback: "If the button doesn't work, copy this link into your browser:",
    ignore:
      "If you didn't ask for a password reset, ignore this e-mail — your password stays the same.",
  },
  cs: {
    subject: "Obnova hesla",
    preview: "Obnova hesla do Togeny",
    heading: "Obnova hesla",
    body: (name) =>
      `Dobrý den, ${name}, dostali jsme žádost o obnovu hesla do Togeny. Nové heslo si nastavíte kliknutím na tlačítko níže.`,
    button: "Nastavit nové heslo",
    fallback: "Pokud tlačítko nefunguje, zkopírujte tento odkaz do prohlížeče:",
    ignore: "Pokud jste o obnovu hesla nežádali, tento e-mail ignorujte — heslo zůstane stejné.",
  },
}

export const resetPasswordSubject = (locale: Locale): string => copy[locale].subject

export interface ResetPasswordProps {
  username: string
  url: string
  locale: Locale
}

export const ResetPassword = ({ username, url, locale }: ResetPasswordProps): React.JSX.Element => {
  const text = copy[locale]
  return (
    <EmailLayout
      locale={locale}
      preview={text.preview}
      heading={text.heading}
      introduction={
        <Text className="text-ink text-base leading-6 mt-4">{text.body(username)}</Text>
      }
    >
      <Section className="my-6 text-center">
        <Button
          href={url}
          className={emailButton}
        >
          {text.button}
        </Button>
      </Section>
      <EmailLinkHelp
        url={url}
        fallback={text.fallback}
        warning={text.ignore}
      />
    </EmailLayout>
  )
}

// Preview data for `pnpm backend email:dev`.
ResetPassword.PreviewProps = {
  username: "Jana",
  url: "https://team-1.vsepractical.applifting.dev/reset-password?token=preview",
  locale: "cs",
} satisfies ResetPasswordProps

export default ResetPassword
