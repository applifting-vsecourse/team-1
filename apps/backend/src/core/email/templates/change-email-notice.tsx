import { AccountEmail } from "@/core/email/email-kit"
import type { Locale } from "@/core/email/locale"

const copy: Record<
  Locale,
  {
    subject: string
    preview: string
    heading: string
    body: (newEmail: string) => string
    alertTitle: string
    alertText: string
  }
> = {
  en: {
    subject: "Sign-in e-mail change requested in Togena",
    preview: "The e-mail address change has not yet been completed.",
    heading: "An e-mail change has been requested",
    body: (newEmail) =>
      `A change of the sign-in e-mail for your Togena account to ${newEmail} has been requested. The change takes effect only after the link sent to the new address is confirmed. Until then, continue using your current address.`,
    alertTitle: "If you did not request this change",
    alertText: "Change your Togena password and do not confirm the e-mail change.",
  },
  cs: {
    subject: "Žádost o změnu přihlašovacího e-mailu v Togeně",
    preview: "Změna adresy zatím není dokončená.",
    heading: "Byla vyžádána změna e-mailu",
    body: (newEmail) =>
      `U vašeho uživatelského účtu v Togeně byla vyžádána změna přihlašovacího e-mailu na ${newEmail}. Změna se provede až po potvrzení odkazu zaslaného na novou adresu. Do té doby se přihlašujete dosavadní adresou.`,
    alertTitle: "Pokud jste o změnu nežádali",
    alertText: "Změňte si heslo ke svému uživatelskému účtu v Togeně a změnu e-mailu nepotvrzujte.",
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
    <AccountEmail
      locale={locale}
      preview={text.preview}
      heading={text.heading}
      introduction={text.body(newEmail)}
      warningTitle={text.alertTitle}
      warning={text.alertText}
    />
  )
}

// Preview data for `pnpm backend email:dev`.
ChangeEmailNotice.PreviewProps = {
  locale: "cs",
  newEmail: "eva.nova@example.cz",
} satisfies ChangeEmailNoticeProps

export default ChangeEmailNotice
