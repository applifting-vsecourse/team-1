import { Locale } from "@/core/email/locale"
import { Button, Section, Text } from "react-email"
import { emailButton, EmailLayout, EmailLinkHelp } from "@/core/email/email-kit"
import * as React from "react"

// Copy for all locales side by side — a missing translation is a type error.
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
    subject: "Your Togena sign-in link",
    preview: "Sign in to your application with one click",
    heading: "Your sign-in link",
    body: "Hi, use the button below to open your application in Togena. The link works once and is valid for 7 days.",
    button: "Open my application",
    fallback: "If the button doesn't work, copy this link into your browser:",
    ignore: "If you didn't ask for this link, ignore this e-mail — nobody can sign in without it.",
  },
  cs: {
    subject: "Váš přihlašovací odkaz do Togeny",
    preview: "Přihlaste se ke své přihlášce jedním kliknutím",
    heading: "Váš přihlašovací odkaz",
    body: "Dobrý den, tlačítkem níže otevřete svou přihlášku v Togeně. Odkaz jde použít jednou a platí 7 dní.",
    button: "Otevřít moji přihlášku",
    fallback: "Pokud tlačítko nefunguje, zkopírujte tento odkaz do prohlížeče:",
    ignore: "Pokud jste si odkaz nevyžádali, tento e-mail ignorujte — bez něj se nikdo nepřihlásí.",
  },
}

export const magicLinkSubject = (locale: Locale): string => copy[locale].subject

export interface MagicLinkProps {
  url: string
  locale: Locale
}

// Figma: E17 · Přihlašovací odkaz · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=19681-1461
export const MagicLink = ({ url, locale }: MagicLinkProps): React.JSX.Element => {
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
MagicLink.PreviewProps = {
  url: "https://team-1.vsepractical.applifting.dev/participant/magic-link?token=preview",
  locale: "cs",
} satisfies MagicLinkProps

export default MagicLink
