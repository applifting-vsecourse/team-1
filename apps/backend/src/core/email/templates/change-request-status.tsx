import { Locale } from "@/core/email/locale"
import * as React from "react"
import { EmailFooter, EmailHeading, EmailLogo, EmailNote, EmailShell, EmailText } from "./email-kit"

// E-mails CHANGE_REQUEST_RECEIVED (PENDING) and CHANGE_REQUEST_REJECTED (REJECTED), US-114.
// Figma: no frame yet (docs/emaily/KATALOG.md), so the shared building blocks of email-kit are used.
const copy: Record<
  Locale,
  {
    subject: string
    pending: string
    rejected: string
    pendingBody: (name: string, event: string) => string
    rejectedBody: (name: string, event: string) => string
    reason: (reason: string) => string
    footer: string[]
  }
> = {
  en: {
    subject: "Application change request",
    pending: "Your request is awaiting approval",
    rejected: "Your request was declined",
    pendingBody: (name, event) =>
      `The change requested for ${name} at ${event} is awaiting the organiser's decision. The existing application remains valid.`,
    rejectedBody: (name, event) =>
      `The organiser declined the change requested for ${name} at ${event}. The existing application remains valid.`,
    reason: (reason) => `Reason: ${reason}`,
    footer: [
      "Togena",
      "Questions about your application, attendance or payment: organizator@togena.com",
    ],
  },
  cs: {
    subject: "Žádost o změnu přihlášky",
    pending: "Vaše žádost čeká na schválení",
    rejected: "Vaše žádost byla zamítnuta",
    pendingBody: (name, event) =>
      `Žádost o změnu přihlášky účastníka ${name} na akci ${event} čeká na rozhodnutí organizátora. Původní přihláška zůstává platná.`,
    rejectedBody: (name, event) =>
      `Organizátor zamítl žádost o změnu přihlášky účastníka ${name} na akci ${event}. Původní přihláška zůstává platná.`,
    reason: (reason) => `Důvod: ${reason}`,
    footer: ["Togena", "Dotazy k přihlášce, účasti nebo platbě: organizator@togena.com"],
  },
}

export const changeRequestStatusSubject = (locale: Locale): string => copy[locale].subject

export type ChangeRequestStatusProps = {
  locale: Locale
  status: "PENDING" | "REJECTED"
  participantName: string
  eventName: string
  reason?: string | null
}

export function ChangeRequestStatus({
  locale,
  status,
  participantName,
  eventName,
  reason,
}: ChangeRequestStatusProps): React.JSX.Element {
  const text = copy[locale]
  const heading = status === "PENDING" ? text.pending : text.rejected
  return (
    <EmailShell
      locale={locale}
      preview={heading}
    >
      <EmailLogo />
      <EmailHeading>{heading}</EmailHeading>
      <EmailText>
        {status === "PENDING"
          ? text.pendingBody(participantName, eventName)
          : text.rejectedBody(participantName, eventName)}
      </EmailText>
      {reason ? <EmailNote>{text.reason(reason)}</EmailNote> : null}
      <EmailFooter lines={text.footer} />
    </EmailShell>
  )
}

// Preview data for `pnpm backend email:dev`.
ChangeRequestStatus.PreviewProps = {
  locale: "cs",
  status: "REJECTED",
  participantName: "Adam Dvořák",
  eventName: "Letní kemp Lipno 2027",
  reason: "Termín je již plně obsazen.",
} satisfies ChangeRequestStatusProps

export default ChangeRequestStatus
