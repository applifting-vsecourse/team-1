import { useId, useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ChevronRight, CircleCheck, TriangleAlert, UserRoundX } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import {
  roomAssignmentsQueryOptions,
  type AssignmentParticipant,
  type RoomWish,
} from "@/features/events/api/room-assignments"
import { participantName } from "@/features/events/components/room-assignment-labels"

const statuses = ["impossible", "unfulfilled", "fulfilled"] as const
const filters = ["all", "unfulfilled", "impossible", "fulfilled"] as const
const icons = { impossible: UserRoundX, unfulfilled: TriangleAlert, fulfilled: CircleCheck }
type WishRow = { participant: AssignmentParticipant; roomName: string | null; wish: RoomWish }

const rowLayout =
  "lg:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(max-content,1.25fr)_auto] lg:gap-4"

function WishStatus({ status }: { status: RoomWish["status"] }) {
  const { t } = useTranslation("events")
  const Icon = icons[status]
  return (
    <Badge
      variant={
        status === "fulfilled" ? "success" : status === "unfulfilled" ? "warning" : "neutral"
      }
      className={cn(
        "[&>svg]:size-4",
        status === "impossible" && "border-border bg-card text-muted-foreground",
      )}
    >
      <Icon aria-hidden />
      {t(`roomWishes.${status}`)}
    </Badge>
  )
}

// Figma (Design system v2): #651 · Nesplněná přání https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27282-155564 (mobile 27282-156085)
// Figma (Design system v2): #631 Varianta C · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27223-118059 · mobile 27223-118712
export function RoomWishesOverview({
  eventId,
  termId,
  children,
}: {
  eventId: string
  termId: string
  children: (action: ReactNode) => ReactNode
}) {
  const { t } = useTranslation("events")
  const { data, isError } = useQuery(roomAssignmentsQueryOptions(eventId, termId))
  const [filter, setFilter] = useState<(typeof filters)[number]>("all")
  const [isOpen, setIsOpen] = useState(false)
  const panelId = useId()

  const participants = [
    ...(data?.rooms ?? []).flatMap((room) =>
      room.participants.map((participant) => ({ participant, roomName: room.name })),
    ),
    ...(data?.unassigned ?? []).map((participant) => ({ participant, roomName: null })),
  ]
  const byStatus: Record<RoomWish["status"], WishRow[]> = {
    impossible: [],
    unfulfilled: [],
    fulfilled: [],
  }
  for (const entry of participants) {
    for (const wish of entry.participant.wishes) byStatus[wish.status].push({ ...entry, wish })
  }
  const allRows = statuses.flatMap((status) => byStatus[status])

  const rows = filter === "all" ? allRows : byStatus[filter]
  const canOpen = Boolean(data) && !isError && allRows.length > 0

  const panel = (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="space-y-3 p-4">
        <h3 className="text-xl font-semibold">{t("roomWishes.title")}</h3>
        <div className="flex flex-wrap gap-2">
          {filters.map((value) => (
            <Button
              key={value}
              type="button"
              variant="outline"
              size="sm"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={cn(
                "border-border",
                filter === value && "bg-accent text-accent-foreground",
              )}
            >
              {t("roomWishes.filterCount", {
                label: t(`roomWishes.${value}`),
                count: value === "all" ? allRows.length : byStatus[value].length,
              })}
            </Button>
          ))}
        </div>
      </div>
      <div
        className={cn("hidden bg-muted px-4 py-3 text-sm text-muted-foreground lg:grid", rowLayout)}
      >
        <span>{t("roomWishes.participant")}</span>
        <span>{t("roomWishes.wish")}</span>
        <span>{t("roomWishes.status")}</span>
        <span
          aria-hidden
          className="w-8"
        />
      </div>
      {rows.length === 0 ? (
        <p className="border-t p-4 text-sm text-muted-foreground">{t("roomWishes.none")}</p>
      ) : (
        <ul>
          {rows.map(({ participant, roomName, wish }) => (
            <li
              key={`${participant.applicationTermId}:${wish.name}`}
              className={cn(
                "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-y-1 border-t px-4 py-3",
                rowLayout,
              )}
            >
              <div className="min-w-0 break-words">
                <p className="font-medium lg:text-sm">{participantName(participant)}</p>
                {roomName && <p className="text-sm text-muted-foreground">{roomName}</p>}
              </div>
              <div className="col-span-2 row-start-2 min-w-0 text-sm break-words lg:col-span-1 lg:col-start-2 lg:row-start-1">
                <span className="lg:hidden">{t("roomWishes.wishName", { name: wish.name })}</span>
                <span className="hidden lg:inline">{wish.name}</span>
                {wish.roomName && <p className="text-muted-foreground">{wish.roomName}</p>}
              </div>
              <div className="col-span-2 row-start-3 pt-1 lg:col-span-1 lg:col-start-3 lg:row-start-1 lg:pt-0">
                <WishStatus status={wish.status} />
              </div>
              <Button
                asChild
                variant="ghost"
                size="icon-sm"
                className="col-start-2 row-start-1 self-start text-muted-foreground lg:col-start-4 lg:self-center"
              >
                <Link
                  to={ROUTES.organizer.application}
                  params={{ eventId, applicationId: participant.applicationId }}
                  aria-label={t("roomWishes.openApplication", {
                    name: participantName(participant),
                  })}
                >
                  <ChevronRight aria-hidden />
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
  return (
    <>
      {children(
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="w-55 max-w-full"
          disabled={!canOpen}
          aria-expanded={isOpen && canOpen}
          aria-controls={panelId}
          onClick={() => {
            if (!isOpen) setFilter("all")
            setIsOpen(!isOpen)
          }}
        >
          {data && !isError
            ? t("roomWishes.showUnfulfilled", {
                count: byStatus.unfulfilled.length + byStatus.impossible.length,
              })
            : t("roomWishes.showUnfulfilledWithoutCount")}
        </Button>,
      )}
      <div
        id={panelId}
        hidden={!isOpen || !canOpen}
        className="print:hidden"
      >
        {isOpen ? panel : null}
      </div>
    </>
  )
}
