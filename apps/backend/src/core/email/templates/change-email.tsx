import { AccountEmail } from "@/core/email/email-kit"
import type { Locale } from "@/core/email/locale"

const copy: Record<
  Locale,
  {
    subject: string
    preview: string
    heading: string
    body: (currentEmail: string, newEmail: string) => string
    validity: string
    alertTitle: string
    alertText: string
    button: string
  }
> = {
  en: {
    subject: "Confirm your e-mail change in Togena",
    preview: "Your sign-in e-mail change is awaiting confirmation.",
    heading: "Confirm your e-mail change",
    body: (currentEmail, newEmail) =>
      `Once confirmed, the sign-in e-mail for your Togena account will change from ${currentEmail} to ${newEmail}. Until then, your current address remains in use.`,
    validity:
      "The link is valid for 1 hour. If it expires, sign in using your current e-mail address and request the e-mail change again in your account settings.",
    alertTitle: "If you did not request this change",
    alertText: "Do not use the link.",
    button: "Confirm e-mail change",
  },
  cs: {
    subject: "Potvrďte změnu e-mailu v Togeně",
    preview: "Změna přihlašovací adresy čeká na vaše potvrzení.",
    heading: "Potvrzení změny e-mailu",
    body: (currentEmail, newEmail) =>
      `Po potvrzení se přihlašovací e-mail vašeho uživatelského účtu v Togeně změní z ${currentEmail} na ${newEmail}. Do té doby platí dosavadní adresa.`,
    validity:
      "Odkaz platí 1 hodinu. Pokud vyprší, přihlaste se dosavadní adresou a změnu e-mailu zadejte znovu v nastavení uživatelského účtu.",
    alertTitle: "Pokud jste o změnu nežádali",
    alertText: "Odkaz nepoužívejte.",
    button: "Potvrdit změnu e-mailu",
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
    <AccountEmail
      locale={locale}
      preview={text.preview}
      heading={text.heading}
      introduction={text.body(currentEmail, newEmail)}
      action={{ url, label: text.button, validity: text.validity }}
      warningTitle={text.alertTitle}
      warning={text.alertText}
    />
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
