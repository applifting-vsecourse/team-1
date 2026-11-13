import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { BedDouble } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { formatDateRange } from "@/lib/date"

import {
  substituteProposalsQueryOptions,
  type SubstituteProposal,
} from "@/features/event-overview/api/substitutes"

/**
 * US-31: the organizer's notice in the event administration. A bed was freed or added in a term and
 * a substitute is proposed: one banner per term with the first substitute of each bed group and the
 * way to the substitutes of the term, where the proposal is confirmed in one step. Shown in both
 * evaluation modes; nothing is shown without a proposal. No bell, no e-mail (US-86).
 */
// No Figma frame: PM decision of 13. 11. 2026 (https://github.com/applifting-vsecourse/team-1/pull/470#issuecomment-6858495554); built from the kit's Alert.
export function FreedBedBanner({ eventId }: { eventId: string }) {
  const { data } = useQuery(substituteProposalsQueryOptions(eventId))
  if (!data || data.length === 0) return null
  const terms = Map.groupBy(data, (proposal) => proposal.termId)
  return (
    <>
      {[...terms.entries()].map(([termId, proposals]) => (
        <TermBanner
          key={termId}
          eventId={eventId}
          proposals={proposals}
        />
      ))}
    </>
  )
}

function TermBanner({ eventId, proposals }: { eventId: string; proposals: SubstituteProposal[] }) {
  const { t } = useTranslation("eventOverview")
  const [first] = proposals
  const range = formatDateRange(first!.startsOn, first!.endsOn, { shouldShowYear: true })
  return (
    <Alert className="border-status-info bg-status-info-bg">
      <BedDouble aria-hidden="true" />
      <AlertTitle className="line-clamp-none">{t("freedBeds.title", { range })}</AlertTitle>
      <AlertDescription>
        <ul className="flex flex-col gap-1">
          {proposals.map(({ group, substitute }) => (
            <li key={substitute.applicationId}>
              {t(
                substitute.gender === "FEMALE"
                  ? "freedBeds.proposalFemale"
                  : "freedBeds.proposalMale",
                {
                  name: `${substitute.firstName} ${substitute.lastName}`,
                  bed: t(`freedBeds.bed${group}`),
                },
              )}
            </li>
          ))}
        </ul>
        <Button
          asChild
          size="lg"
          className="mt-3 w-full md:w-auto"
        >
          <Link
            to={ROUTES.organizer.eventApplications}
            params={{ eventId }}
            search={{ status: "WAITLISTED", term: first!.termId }}
          >
            {t("freedBeds.confirm")}
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  )
}
