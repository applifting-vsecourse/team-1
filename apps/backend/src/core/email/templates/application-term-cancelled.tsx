import type { Locale } from "@/core/email/locale"
import { changeMessages } from "@/core/email/change-messages"
import { ChangeLayout } from "@/core/email/templates/application-change-layout"
import type { Gender } from "@/shared/domain/gender"

export const termCancelledSubject = (locale: Locale, eventName: string): string =>
  changeMessages[locale].TERM_CANCELLED.subject(eventName)

export interface TermCancelledProps {
  locale: Locale
  eventName: string
  organizationName: string
  /** First and last name of the participant. */
  name: string
  gender: Gender
  /** The cancelled term: its name, or its dates. */
  term: string
  confirmationUrl: string
}

// Figma: E12 · Zrušení termínu · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=19681-1067
export function TermCancelled({
  locale,
  eventName,
  organizationName,
  name,
  term,
  confirmationUrl,
}: TermCancelledProps) {
  return (
    <ChangeLayout
      locale={locale}
      message={changeMessages[locale].TERM_CANCELLED}
      eventName={eventName}
      participant={name}
      termLabel={term}
      organizationName={organizationName}
      buttonUrl={confirmationUrl}
      note={
        locale === "cs"
          ? "Případné platby za zrušený termín se vrací. Další postup vám sdělí organizace."
          : "Any payments already made for the cancelled term are to be refunded. The organisation will let you know the next steps."
      }
    />
  )
}

TermCancelled.PreviewProps = {
  locale: "cs",
  eventName: "Letní kemp Lipno 2027",
  organizationName: "Alpine Collective",
  name: "Adam Dvořák",
  gender: "MALE",
  term: "12.–18. 7. 2027",
  confirmationUrl: "https://team-1.vsepractical.applifting.dev/apply/confirmation/preview-2",
} satisfies TermCancelledProps

export default TermCancelled
