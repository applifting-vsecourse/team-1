import type { Locale } from "@/core/email/locale"
import { changeMessages } from "@/core/email/change-messages"
import { ChangeLayout } from "@/core/email/templates/application-change-layout"
import type { Gender } from "@/shared/domain/gender"

export const confirmationWithdrawnSubject = (locale: Locale, eventName: string): string =>
  changeMessages[locale].WITHDRAWN.subject(eventName)

export interface ConfirmationWithdrawnProps {
  locale: Locale
  eventName: string
  organizationName: string
  /** First and last name of the participant. */
  name: string
  gender: Gender
  /** The changed term: its name, or its dates. */
  term: string
  confirmationUrl: string
}

// Figma: E09 · Odvolání potvrzení · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=19681-903
export function ConfirmationWithdrawn({
  locale,
  eventName,
  organizationName,
  name,
  term,
  confirmationUrl,
}: ConfirmationWithdrawnProps) {
  return (
    <ChangeLayout
      locale={locale}
      message={changeMessages[locale].WITHDRAWN}
      eventName={eventName}
      participant={name}
      termLabel={term}
      organizationName={organizationName}
      buttonUrl={confirmationUrl}
    />
  )
}

ConfirmationWithdrawn.PreviewProps = {
  locale: "cs",
  eventName: "Letní kemp Lipno 2027",
  organizationName: "Alpine Collective",
  name: "Adam Dvořák",
  gender: "MALE",
  term: "12.–18. 7. 2027",
  confirmationUrl: "https://team-1.vsepractical.applifting.dev/apply/confirmation/preview-2",
} satisfies ConfirmationWithdrawnProps

export default ConfirmationWithdrawn
