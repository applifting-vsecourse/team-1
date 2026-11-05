import { Locale } from "@/core/email/locale"
import { Body, Container, Head, Heading, Html, Preview, Tailwind, Text } from "react-email"
import * as React from "react"

const copy: Record<
  Locale,
  {
    subject: string
    pending: string
    rejected: string
    pendingBody: (name: string, event: string) => string
    rejectedBody: (name: string, event: string) => string
    reason: (reason: string) => string
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
    <Html lang={locale}>
      <Head />
      <Preview>{heading}</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans py-10">
          <Container className="bg-white rounded-lg mx-auto p-8 max-w-xl">
            <Heading className="text-2xl font-bold text-gray-900 m-0">{heading}</Heading>
            <Text className="text-gray-700 text-base leading-6 mt-4">
              {status === "PENDING"
                ? text.pendingBody(participantName, eventName)
                : text.rejectedBody(participantName, eventName)}
            </Text>
            {reason ? (
              <Text className="text-gray-700 text-base leading-6">{text.reason(reason)}</Text>
            ) : null}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

export default ChangeRequestStatus
