import { AccountEmail } from "@/core/email/email-kit"
import type { Locale } from "@/core/email/locale"

const copy: Record<
  Locale,
  {
    subject: string
    preview: string
    heading: string
    body: string
    alertTitle: string
    alertText: string
    button: string
  }
> = {
  en: {
    subject: "Reset your Togena password",
    preview: "Use the link in this e-mail to choose a new password.",
    heading: "Choose a new password",
    body: "We have received a request to reset the password for your Togena account. Use the button below to choose a new password. The link is valid for 1 hour.",
    alertTitle: "If you did not request a password reset",
    alertText: "Ignore this e-mail. This e-mail does not change your password.",
    button: "Choose a new password",
  },
  cs: {
    subject: "Obnova hesla do Togeny",
    preview: "Nastavte si nové heslo pomocí odkazu v tomto e-mailu.",
    heading: "Nastavení nového hesla",
    body: "Obdrželi jsme žádost o obnovu hesla k vašemu uživatelskému účtu v Togeně. Nové heslo si nastavíte tlačítkem níže. Odkaz platí 1 hodinu.",
    alertTitle: "Pokud jste o obnovu nežádali",
    alertText: "Tento e-mail ignorujte. Vaše heslo se tímto e-mailem nemění.",
    button: "Nastavit nové heslo",
  },
}

export const resetPasswordSubject = (locale: Locale): string => copy[locale].subject

export interface ResetPasswordProps {
  username: string
  url: string
  locale: Locale
}

// Figma: E18 · Obnova hesla · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=19681-1519
export const ResetPassword = ({ url, locale }: ResetPasswordProps): React.JSX.Element => {
  const text = copy[locale]
  return (
    <AccountEmail
      locale={locale}
      preview={text.preview}
      heading={text.heading}
      introduction={text.body}
      action={{ url, label: text.button }}
      warningTitle={text.alertTitle}
      warning={text.alertText}
    />
  )
}

// Preview data for `pnpm backend email:dev`.
ResetPassword.PreviewProps = {
  username: "Jana",
  url: "https://team-1.vsepractical.applifting.dev/reset-password?token=preview",
  locale: "cs",
} satisfies ResetPasswordProps

export default ResetPassword
