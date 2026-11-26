import { Link } from "@tanstack/react-router"
import { BedDouble, Bus, ChevronRight, HeartPulse } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"

/**
 * The organizer writes for the participant what the participant can write (D-191); they open it
 * with these buttons in the application (D-203).
 */
// Figma (Design system v2): #786–790 / Detail přihlášky · zápis za účastníka · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27488-123765 (360 px: node-id=27488-123928)
export function OnBehalfLinks({
  eventId,
  applicationId,
}: {
  eventId: string
  applicationId: string
}) {
  const { t } = useTranslation("eventOverview")
  const links = [
    [ROUTES.organizer.applicationTransport, Bus, t("payment.transportLink")],
    [ROUTES.organizer.applicationArrangements, BedDouble, t("payment.arrangementsLink")],
    [ROUTES.organizer.applicationHealth, HeartPulse, t("payment.health")],
  ] as const

  return (
    <nav
      aria-label={t("payment.onBehalf")}
      className="grid gap-2 sm:grid-cols-3"
    >
      {links.map(([to, Icon, label]) => (
        <Button
          key={to}
          asChild
          variant="outline"
          size="lg"
          className="justify-start gap-3 bg-card whitespace-normal"
        >
          <Link
            to={to}
            params={{ eventId, applicationId }}
            // The transport opens as a dialog above the application: the page stays where it is.
            resetScroll={to !== ROUTES.organizer.applicationTransport}
          >
            <span
              aria-hidden
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-primary"
            >
              <Icon />
            </span>
            <span className="min-w-0 flex-1 text-left">{label}</span>
            <ChevronRight aria-hidden />
          </Link>
        </Button>
      ))}
    </nav>
  )
}
