import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

import { roomAssignmentsQueryOptions } from "@/features/events/api/room-assignments"
import { participantName } from "@/features/events/components/room-assignment-labels"

/** Who sleeps in which room and whom they wished to room with, each wish marked fulfilled or not (US-146). */
// Figma (Design system): US-146 Organizátor · splnění přání u účastníka · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=24910-14381 (mobile 24910-14511)
export function RoomWishesOverview({ eventId, termId }: { eventId: string; termId: string }) {
  const { t } = useTranslation("events")
  const { data } = useQuery(roomAssignmentsQueryOptions(eventId, termId))
  const rooms = (data?.rooms ?? []).filter((room) => room.participants.length > 0)
  // Nobody is placed yet (the assignment card carries the loading and error states), so no wish
  // can be compared with a room.
  if (rooms.length === 0) return null
  return (
    <Card className="gap-4 p-4 sm:p-6">
      <h3 className="text-xl font-semibold">{t("roomWishes.title")}</h3>
      <ul className="flex flex-col gap-6">
        {rooms.map((room) => (
          <li
            key={room.id}
            className="flex flex-col"
          >
            <h4 className="pb-3 text-lg font-semibold">{room.name}</h4>
            <ul>
              {room.participants.map((participant) => (
                <li
                  key={participant.applicationTermId}
                  className="flex flex-col gap-2 border-t py-3"
                >
                  <span className="font-medium">{participantName(participant)}</span>
                  {participant.wishes.length === 0 ? (
                    <span className="text-sm text-muted-foreground">{t("roomWishes.none")}</span>
                  ) : (
                    <>
                      <span className="text-sm font-medium">{t("roomWishes.list")}</span>
                      <ul className="flex flex-col gap-2">
                        {participant.wishes.map((wish) => (
                          <li
                            key={wish.name}
                            className="flex items-center justify-between gap-3 text-sm"
                          >
                            <span className="min-w-0 break-words">{wish.name}</span>
                            <Badge variant={wish.fulfilled ? "success" : "warning"}>
                              {t(
                                wish.fulfilled ? "roomWishes.fulfilled" : "roomWishes.unfulfilled",
                              )}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </Card>
  )
}
