import { useState } from "react"
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query"
import { Loader2, TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { SectionHeader } from "@/components/molecules/SectionHeader"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { termDatesLine } from "@/lib/term-label"

import { eventKeys } from "@/features/events/api/events"
import { roomsQueryOptions, setExtraBeds } from "@/features/events/api/rooms"
import type { AccommodationTerm } from "@/features/events/components/RoomsPage"

// Extra beds (přistýlky) of one room in one term; the other terms keep their own number.
// The term select jumps to the room of the same name in another term (rooms belong to one term).
// Figma (Design system): Přistýlky v pokoji · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19786-36832 (mobile 19786-36991)
export function RoomExtraBedsPage({
  eventId,
  termId,
  roomId,
  terms,
  onSelectRoom,
}: {
  eventId: string
  termId: string
  roomId: string
  terms: AccommodationTerm[]
  onSelectRoom: (termId: string, roomId: string) => void
}) {
  const { t } = useTranslation("events")
  const client = useQueryClient()
  const queries = useQueries({
    queries: terms.map((term) => roomsQueryOptions(eventId, term.id)),
  })
  const index = terms.findIndex((term) => term.id === termId)
  const current = queries[index]
  const room = current?.data?.rooms.find((item) => item.id === roomId)
  const [draft, setDraft] = useState<{ roomId: string; value: string } | null>(null)
  const value = draft?.roomId === roomId ? draft.value : String(room?.extraBeds ?? 0)
  const mutation = useMutation({
    mutationFn: (extraBeds: number) => setExtraBeds(eventId, termId, roomId, extraBeds),
    onSuccess: async () => {
      setDraft(null)
      await Promise.all([
        client.invalidateQueries({ queryKey: ["events", eventId] }),
        client.invalidateQueries({ queryKey: eventKeys.detail(eventId) }),
        client.invalidateQueries({ queryKey: eventKeys.all() }),
      ])
    },
  })

  if (!current?.data || !room) {
    return current?.isError ? (
      <ErrorState
        title={t("rooms.loadFailed")}
        error={current.error}
        onRetry={() => {
          void current.refetch()
        }}
      />
    ) : (
      <LoadingState />
    )
  }
  const term = current.data
  const extraBeds = Number(value)
  // The room of the same name in another term, if that term has one.
  const roomIn = (index: number) =>
    queries[index]?.data?.rooms.find((item) => item.name.toLowerCase() === room.name.toLowerCase())

  return (
    <div className="flex flex-col gap-6">
      <Seo title={t("rooms.extraBedsTitle")} />
      <SectionHeader
        title={t("rooms.extraBedsTitle")}
        description={t("rooms.extraBedsContext", { event: term.eventName, room: room.name })}
      />
      <div className="flex flex-col gap-2">
        <Label htmlFor="extra-beds-term">{t("rooms.termLabel")}</Label>
        <Select
          value={termId}
          onValueChange={(next) => {
            const target = roomIn(terms.findIndex((item) => item.id === next))
            if (target) onSelectRoom(next, target.id)
          }}
        >
          <SelectTrigger
            id="extra-beds-term"
            className="w-full bg-card"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {terms.map((item, itemIndex) => (
              <SelectItem
                key={item.id}
                value={item.id}
                disabled={!roomIn(itemIndex)}
              >
                {termDatesLine(item)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <form
        className="flex flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault()
          if (mutation.isPending) return
          mutation.mutate(extraBeds)
        }}
      >
        <Card>
          <CardContent className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold">{room.name}</h2>
            <p>
              {[
                t("rooms.extraBedsBase", { count: room.capacity }),
                t("rooms.extraBedsCount", { count: room.extraBeds }),
                t("rooms.extraBedsTotal", { count: room.beds }),
              ].join(" · ")}
            </p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="extra-beds">{t("rooms.extraBedsLabel")}</Label>
              <Input
                id="extra-beds"
                type="number"
                inputMode="numeric"
                min={0}
                max={2147483647}
                step={1}
                required
                value={value}
                onChange={(event) => setDraft({ roomId, value: event.target.value })}
              />
            </div>
          </CardContent>
        </Card>
        <Alert>
          <TriangleAlert />
          <AlertTitle>{t("rooms.extraBedsNoteTitle")}</AlertTitle>
          <AlertDescription>{t("rooms.extraBedsNoteBody")}</AlertDescription>
        </Alert>
        {mutation.isError ? (
          <ErrorState
            title={t("rooms.saveFailed")}
            error={mutation.error}
          />
        ) : null}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <Loader2 className="animate-spin" /> : null}
          {t("rooms.extraBedsSave")}
        </Button>
      </form>
    </div>
  )
}
