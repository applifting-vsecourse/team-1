import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { Clock, EllipsisVertical, MapPin, Users } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { type TransportSummary } from "@/features/transport/api/transport"
import { DeleteTransportDialog } from "@/features/transport/components/DeleteTransportDialog"
import { departureText } from "@/features/transport/lib/departure"

function Fact({ icon: Icon, children }: { icon: typeof Clock; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Icon
        aria-hidden
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
      />
      <span>{children}</span>
    </li>
  )
}

// One way of transport: the facts as a list with icons, one main action (participants) and the
// rest (edit, delete) in a menu.
// Design proposal (US-402), based on Figma (Design system): #65 Doprava · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-12467
export function TransportCard({
  eventId,
  transport,
}: {
  eventId: string
  transport: TransportSummary
}) {
  const { t } = useTranslation("transport")
  const [isDeleting, setIsDeleting] = useState(false)
  return (
    <Card className="gap-4 p-4">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-lg font-semibold">{transport.name}</h4>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("actions")}
              className="-mt-1 -mr-2"
            >
              <EllipsisVertical aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link
                to={ROUTES.organizer.eventTransportEdit}
                params={{ eventId, transportId: transport.id }}
              >
                {t("edit")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => {
                setIsDeleting(true)
              }}
            >
              {t("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ul className="flex flex-col gap-2 text-sm">
        <Fact icon={Clock}>
          {t("departure", { when: departureText(transport.departureAt, t("at")) })}
        </Fact>
        <Fact icon={MapPin}>{transport.departurePlace}</Fact>
        <Fact icon={Users}>{t("participants", { count: transport.participantsCount })}</Fact>
      </ul>
      <Button
        asChild
        variant="outline"
        size="lg"
      >
        <Link
          to={ROUTES.organizer.eventTransportParticipants}
          params={{ eventId, transportId: transport.id }}
        >
          {t("showParticipants")}
        </Link>
      </Button>
      {isDeleting ? (
        <DeleteTransportDialog
          eventId={eventId}
          transport={transport}
          onClose={() => {
            setIsDeleting(false)
          }}
        />
      ) : null}
    </Card>
  )
}
