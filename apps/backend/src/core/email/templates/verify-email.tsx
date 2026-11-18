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
    body: string
    button: string
    fallback: string
    ignore: string
  }
> = {
  en: {
    subject: "Verify your e-mail address",
    preview: "Verify your e-mail for Togena",
    heading: "Welcome to Togena",
    body: "Tap the button below to verify your e-mail address and finish setting up your account.",
    button: "Verify e-mail",
    fallback: "If the button doesn't work, copy this link into your browser:",
    ignore: "If you didn't create a Togena account, you can ignore this e-mail.",
  },
  cs: {
    subject: "Ověření e-mailové adresy",
    preview: "Ověřte svůj e-mail pro Togenu",
    heading: "Vítejte v Togeně",
    body: "Kliknutím na tlačítko níže ověříte svou e-mailovou adresu a dokončíte založení účtu.",
    button: "Ověřit e-mail",
    fallback: "Pokud tlačítko nefunguje, zkopírujte tento odkaz do prohlížeče:",
    ignore: "Pokud jste si účet v Togeně nezakládali, tento e-mail ignorujte.",
  },
}

export const verifyEmailSubject = (locale: Locale): string => copy[locale].subject

export interface VerifyEmailProps {
  url: string
  locale: Locale
}

export const VerifyEmail = ({ url, locale }: VerifyEmailProps): React.JSX.Element => {
  const text = copy[locale]
  return (
    <EmailLayout
      locale={locale}
      preview={text.preview}
      heading={text.heading}
      introduction={<Text className="text-ink text-base leading-6 mt-4">{text.body}</Text>}
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
VerifyEmail.PreviewProps = {
  url: "https://team-1.vsepractical.applifting.dev/api/auth/verify-email?token=preview",
  locale: "cs",
} satisfies VerifyEmailProps

export default VerifyEmail
