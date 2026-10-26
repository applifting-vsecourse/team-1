import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { EmptyState } from "@/components/molecules/EmptyState"
import { Button } from "@/components/ui/button"

/** The event has no term or no rooms yet, so it shows no capacity and takes no applications; says what is missing. */
export function UnfinishedEvent({
  eventId,
  hasTerms,
  hasRooms,
}: {
  eventId: string
  hasTerms: boolean
  hasRooms: boolean
}) {
  const { t } = useTranslation("eventOverview")
  const message = !hasTerms
    ? hasRooms
      ? t("capacity.unfinishedNoTerm")
      : t("capacity.unfinishedNoBoth")
    : t("capacity.unfinishedNoRoom")

  return (
    <div className="flex flex-col items-center gap-1 py-8">
      <h2 className="text-lg font-semibold tracking-tight">{t("capacity.unfinishedTitle")}</h2>
      <EmptyState
        message={message}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            {hasTerms ? null : (
              <Button
                asChild
                size="lg"
              >
                <Link
                  to={ROUTES.organizer.eventTerms}
                  params={{ eventId }}
                >
                  {t("capacity.addTerm")}
                </Link>
              </Button>
            )}
            {hasRooms ? null : (
              <Button
                asChild
                size="lg"
                variant={hasTerms ? "default" : "outline"}
              >
                <Link
                  to={ROUTES.organizer.eventRooms}
                  params={{ eventId }}
                >
                  {t("capacity.addRoom")}
                </Link>
              </Button>
            )}
          </div>
        }
      />
    </div>
  )
}
