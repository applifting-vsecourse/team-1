import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { EmptyState } from "@/components/molecules/EmptyState"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { PageHeader } from "@/components/molecules/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  roomModeSchema,
  roomsQueryOptions,
  setRoomMode,
  type Room,
} from "@/features/events/api/rooms"
import { DeleteRoomDialog } from "@/features/events/components/DeleteRoomDialog"
import { RoomDialog } from "@/features/events/components/RoomDialog"

// Figma (Design system): O18a / O18b · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12358-1789
// Shared-room variant · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12358-3883
export function RoomsPage({ eventId }: { eventId: string }) {
  const { t } = useTranslation("events")
  const client = useQueryClient()
  const query = useQuery(roomsQueryOptions(eventId))
  const [editor, setEditor] = useState<Room | "new" | null>(null)
  const [deleting, setDeleting] = useState<Room | null>(null)
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ["events", eventId] })
  }
  const mode = useMutation({
    mutationFn: (value: string) => setRoomMode(eventId, roomModeSchema.parse(value)),
    onSuccess: refresh,
  })
  const event = query.data
  if (!event) {
    return query.isError ? (
      <ErrorState
        title={t("rooms.loadFailed")}
        error={query.error}
        onRetry={() => {
          void query.refetch()
        }}
      />
    ) : (
      <LoadingState />
    )
  }
  const isGendered = event.roomMode === "GENDERED"
  const metrics = isGendered
    ? [
        {
          label: t("rooms.femaleRooms"),
          value: t("rooms.beds", { count: event.capacity.FEMALE }),
          helper: t("rooms.roomCount", {
            count: event.rooms.filter((room) => room.gender === "FEMALE").length,
          }),
        },
        {
          label: t("rooms.maleRooms"),
          value: t("rooms.beds", { count: event.capacity.MALE }),
          helper: t("rooms.roomCount", {
            count: event.rooms.filter((room) => room.gender === "MALE").length,
          }),
        },
        { label: t("rooms.totalRooms"), value: event.rooms.length, helper: t("rooms.sameTerms") },
      ]
    : [
        {
          label: t("rooms.totalCapacity"),
          value: t("rooms.beds", { count: event.capacity.total }),
          helper: t("rooms.roomCount", { count: event.rooms.length }),
        },
        {
          label: t("rooms.numberRooms"),
          value: event.rooms.length,
          helper: t("rooms.sharedRooms"),
        },
        {
          label: t("rooms.appliesTo"),
          value: t("rooms.termCount", { count: event.termCount }),
          helper: t("rooms.sameRooms"),
        },
      ]
  return (
    <div className="flex flex-col gap-6">
      <Seo title={t("rooms.title")} />
      <p className="text-xs text-muted-foreground">
        {t("list.title")} / {event.organizationName} / {event.eventName} / {t("rooms.breadcrumb")}
      </p>
      <PageHeader
        title={t("rooms.title")}
        description={t("rooms.description")}
        actions={
          <Button
            size="lg"
            disabled={mode.isPending}
            onClick={() => setEditor("new")}
          >
            {t("rooms.add")}
          </Button>
        }
      />
      {query.isError ? (
        <ErrorState
          title={t("rooms.loadFailed")}
          error={query.error}
          onRetry={() => {
            void query.refetch()
          }}
        />
      ) : null}
      <Card>
        <CardContent className="flex flex-col gap-2">
          <Label htmlFor="room-mode">{t("rooms.mode")}</Label>
          <Select
            value={event.roomMode}
            disabled={mode.isPending}
            onValueChange={(value) => mode.mutate(value)}
          >
            <SelectTrigger
              id="room-mode"
              className="w-full sm:max-w-130"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GENDERED">{t("rooms.genderedMode")}</SelectItem>
              <SelectItem value="SHARED">{t("rooms.sharedMode")}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{t("rooms.modeHint")}</p>
          {mode.isError ? (
            <ErrorState
              title={t("rooms.saveFailed")}
              error={mode.error}
            />
          ) : null}
        </CardContent>
      </Card>
      <div className="grid gap-6 md:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardContent className="flex flex-col gap-2">
              <h2 className="text-xs font-medium text-muted-foreground">{metric.label}</h2>
              <p className="text-4xl font-bold tracking-tight">{metric.value}</p>
              <p className="text-sm text-muted-foreground">{metric.helper}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>{t("rooms.listTitle")}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {event.rooms.length ? (
            <>
              <div
                className={`hidden gap-4 px-4 text-xs text-muted-foreground lg:grid ${isGendered ? "grid-cols-[minmax(0,1fr)_10rem_10rem_16rem]" : "grid-cols-[minmax(0,1fr)_10rem_16rem]"}`}
              >
                <span>{t("rooms.nameColumn")}</span>
                <span>{t("rooms.capacityColumn")}</span>
                {isGendered ? <span>{t("rooms.genderColumn")}</span> : null}
                <span>{t("rooms.actionsColumn")}</span>
              </div>
              <ul className="flex flex-col gap-4">
                {event.rooms.map((room) => (
                  <li
                    key={room.id}
                    className={`flex flex-col items-stretch gap-4 rounded-md border p-4 text-sm sm:grid sm:grid-cols-2 sm:items-center ${isGendered ? "lg:grid-cols-[minmax(0,1fr)_10rem_10rem_16rem]" : "lg:grid-cols-[minmax(0,1fr)_10rem_16rem]"}`}
                  >
                    <span className="break-words">{room.name}</span>
                    <span className="text-muted-foreground">
                      {t("rooms.beds", { count: room.capacity })}
                    </span>
                    {isGendered && room.gender ? (
                      <span className="text-muted-foreground">
                        {t(room.gender === "FEMALE" ? "rooms.female" : "rooms.male")}
                      </span>
                    ) : null}
                    <div className="flex flex-wrap gap-4">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => setEditor(room)}
                      >
                        {t("rooms.editAction")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="lg"
                        onClick={() => setDeleting(room)}
                      >
                        {t("rooms.deleteAction")}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                {t("rooms.shown", { count: event.rooms.length })}
              </p>
            </>
          ) : (
            <EmptyState message={t("rooms.empty")} />
          )}
        </CardContent>
      </Card>
      <div>
        <Button
          asChild
          variant="outline"
          size="lg"
        >
          <Link
            to={ROUTES.organizer.eventTerms}
            params={{ eventId }}
          >
            {t("rooms.showTerms")}
          </Link>
        </Button>
      </div>
      {editor ? (
        <RoomDialog
          key={editor === "new" ? "new" : editor.id}
          event={event}
          room={editor === "new" ? undefined : editor}
          onClose={() => setEditor(null)}
          onSaved={refresh}
          onDelete={(room) => {
            setEditor(null)
            setDeleting(room)
          }}
        />
      ) : null}
      {deleting ? (
        <DeleteRoomDialog
          event={event}
          room={deleting}
          onClose={() => setDeleting(null)}
          onSaved={refresh}
        />
      ) : null}
    </div>
  )
}
