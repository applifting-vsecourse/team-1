import { AccountEmail } from "@/core/email/email-kit"
import type { Locale } from "@/core/email/locale"

const copy: Record<
  Locale,
  {
    subject: string
    preview: string
    heading: string
    body: string
    validity: string
    alertTitle: string
    alertText: string
    button: string
  }
> = {
  en: {
    subject: "Your sign-in link for Togena",
    preview: "Use the link in this e-mail to sign in.",
    heading: "Sign in to Togena",
    body: "A sign-in link for Togena was requested for this e-mail address. Use the button below to sign in. Do not forward this link to anyone.",
    validity:
      "The link is valid for 7 days and can only be used once. If it no longer works, you can request a new one on the Togena sign-in page.",
    alertTitle: "If you did not request this link",
    alertText: "Do not use it.",
    button: "Sign in to Togena",
  },
  cs: {
    subject: "Odkaz pro přihlášení do Togeny",
    preview: "Přihlaste se pomocí odkazu v tomto e-mailu.",
    heading: "Přihlášení do Togeny",
    body: "O přihlášení do Togeny bylo požádáno pro tuto e-mailovou adresu. Přihlaste se tlačítkem níže. Odkaz nikomu nepřeposílejte.",
    validity:
      "Odkaz platí 7 dní a lze jej použít pouze jednou. Pokud už nefunguje, na přihlašovací stránce Togeny si můžete nechat poslat nový.",
    alertTitle: "Pokud jste o přihlášení nežádali",
    alertText: "Odkaz nepoužívejte.",
    button: "Přihlásit se do Togeny",
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
    <AccountEmail
      locale={locale}
      preview={text.preview}
      heading={text.heading}
      introduction={text.body}
      action={{ url, label: text.button, validity: text.validity }}
      warningTitle={text.alertTitle}
      warning={text.alertText}
    />
  )
}

// Preview data for `pnpm backend email:dev`.
MagicLink.PreviewProps = {
  url: "https://team-1.vsepractical.applifting.dev/participant/magic-link?token=preview",
  locale: "cs",
} satisfies MagicLinkProps

export default MagicLink
