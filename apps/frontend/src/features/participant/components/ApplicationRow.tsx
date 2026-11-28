import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { formatDateRange } from "@/lib/date"

import type { MyApplication } from "@/features/participant/api/applications"
import { TermStatusBadge } from "@/features/participant/components/TermSummary"

type ApplicationRowProps = {
  application: MyApplication
  /** The number of new posts of the board (US-91); a route composes it, as features do not import each other. */
  boardBadge?: ReactNode
}

/**
 * One application in its event's card: who and which number, every term with its dates and status,
 * and „Zaplaceno“ once there is nothing left to pay (what is owed is in the to-do card above).
 * The whole row opens the detail.
 */
// Figma (Design system v2): Řádek přihlášky · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27646-34907 (360 px: 27681-33588)
export function ApplicationRow({ application, boardBadge }: ApplicationRowProps) {
  const { t } = useTranslation("participant")
  const name = `${application.firstName} ${application.lastName}`
  const { paymentStatus } = application
  const settled = paymentStatus === "PAID" || paymentStatus === "OVERPAID" ? paymentStatus : null

  return (
    <Link
      to={ROUTES.participant.application}
      params={{ applicationId: application.id }}
      className="flex items-start gap-4 px-4 py-3 transition-colors hover:bg-action-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring md:items-center"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-center md:gap-4">
        <div className="flex min-w-0 flex-col gap-2 md:flex-1 md:gap-0.5">
          <span
            className="line-clamp-2 font-semibold wrap-anywhere"
            title={name}
          >
            {name}
          </span>
          <span className="text-sm text-muted-foreground tabular-nums">{application.code}</span>
          <div className="pt-1 empty:hidden">{boardBadge}</div>
        </div>
        <ul className="flex flex-col gap-2 md:w-74 md:shrink-0">
          {application.terms.map((term) => (
            <li
              key={term.termId}
              className="flex items-center gap-2"
            >
              <span className="text-sm tabular-nums md:w-26 md:shrink-0">
                {formatDateRange(term.startsOn, term.endsOn)}
              </span>
              <TermStatusBadge term={term} />
            </li>
          ))}
        </ul>
        <span className="text-sm text-muted-foreground max-md:empty:hidden md:w-34 md:shrink-0 md:text-right">
          {settled ? t(`paymentStatus.${settled}`) : null}
        </span>
      </div>
      <ChevronRight
        aria-hidden
        className="mt-0.5 size-5 shrink-0 text-muted-foreground md:mt-0"
      />
    </Link>
  )
}
