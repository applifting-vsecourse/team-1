import { useState, type ReactNode } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { BedSingle, Pencil, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { CardGrid } from "@/components/molecules/CardGrid"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { SectionHeader } from "@/components/molecules/SectionHeader"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { notify } from "@/lib/notify"
import { roomCapacityIncreaseKey, type RoomCapacityIncrease } from "@/lib/room-capacity-increase"
import { termDatesLine } from "@/lib/term-label"
import { cn } from "@/lib/utils"

import { eventKeys } from "@/features/events/api/events"
import {
  roomModeSchema,
  roomsQueryOptions,
  type Room,
  type RoomMode,
} from "@/features/events/api/rooms"
import { BulkRoomsDialog } from "@/features/events/components/BulkRoomsDialog"
import { CopyRoomsDialog } from "@/features/events/components/CopyRoomsDialog"
import { DeleteRoomDialog } from "@/features/events/components/DeleteRoomDialog"
import { RoomAssignmentsCard } from "@/features/events/components/RoomAssignmentsCard"
import { RoomDialog } from "@/features/events/components/RoomDialog"
import { RoomExtraBedsDialog } from "@/features/events/components/RoomExtraBedsDialog"
import { RoomModeDialog } from "@/features/events/components/RoomModeDialog"
import { RoomProposal } from "@/features/events/components/RoomProposal"
import { RoomsOverview } from "@/features/events/components/RoomsOverview"
import { RoomsPublicationCard } from "@/features/events/components/RoomsPublicationCard"
import { RoomWishesOverview } from "@/features/events/components/RoomWishesOverview"

/** The two views of the accommodation: who is placed how (US-35) and the printable overview (US-36). */
export type RoomsView = "assignment" | "overview"

/** What the page needs to know about every active term; the route reads it from the occupancy. */
export type AccommodationTerm = {
  id: string
  name: string | null
  startsOn: string
  endsOn: string
  roomMode: RoomMode
  roomCount: number
  byGender: { FEMALE: { free: number }; MALE: { free: number } } | null
}

// Rooms of one term of an event under the event header: the term, its room mode, capacity metrics
// and the room table with edit / delete icon buttons in each row.
// Each room also shows its extra beds (přistýlky) and an icon button with a count badge that opens their dialog (US-80, #530).
// The list of rooms is the room assignment of US-35 (RoomAssignmentsCard); the room actions stay here.
// Figma v2: US-14 Ubytování · Pokoje podle pohlaví · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15577-2448 (mobile 15577-2548); společné pokoje 15434-1143 (mobile 15434-1235)
// Figma (Design system): #530 Ikona přistýlky · podle pohlaví · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=26056-112911 (mobile 26064-113690)
// Figma (Design system): #530 Ikona přistýlky · společné pokoje · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=26060-113154 (mobile 26064-114034)
// Figma (Design system): #530 Ikona přistýlky · tooltip a fokus · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=26060-113550
export function RoomsPage({
  eventId,
  termId,
  view = "assignment",
  terms,
  onSelectTerm,
  onSelectView = () => undefined,
}: {
  eventId: string
  termId?: string
  view?: RoomsView
  terms: AccommodationTerm[]
  onSelectTerm: (termId: string) => void
  onSelectView?: (view: RoomsView) => void
}) {
  const { t } = useTranslation("events")
  const client = useQueryClient()
  const selected = terms.find((item) => item.id === termId) ?? terms[0]
  const query = useQuery({
    ...roomsQueryOptions(eventId, selected?.id ?? ""),
    enabled: selected !== undefined,
  })
  const [editor, setEditor] = useState<Room | "new" | null>(null)
  const [deleting, setDeleting] = useState<Room | null>(null)
  const [extraBedsRoom, setExtraBedsRoom] = useState<Room | null>(null)
  const [pendingMode, setPendingMode] = useState<RoomMode | null>(null)
  const [isCopying, setIsCopying] = useState(false)
  const [isBulk, setIsBulk] = useState(false)
  const refresh = async () => {
    if (selected) client.removeQueries({ queryKey: roomCapacityIncreaseKey(eventId, selected.id) })
    await Promise.all([
      client.invalidateQueries({ queryKey: ["events", eventId] }),
      client.invalidateQueries({ queryKey: eventKeys.detail(eventId) }),
      client.invalidateQueries({ queryKey: eventKeys.all() }),
    ])
  }
  if (!selected) {
    return (
      <div className="flex flex-col gap-6">
        <Seo title={t("rooms.title")} />
        <SectionHeader
          title={t("rooms.title")}
          description={t("rooms.description")}
        />
        <p className="text-sm text-muted-foreground">{t("rooms.noTerms")}</p>
      </div>
    )
  }
  const term = query.data
  if (!term) {
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
  const previousIds = new Set(term.rooms.map((room) => room.id))
  const refreshedTerm = () => client.getQueryData(roomsQueryOptions(eventId, term.termId).queryKey)
  const isGendered = term.roomMode === "GENDERED"
  const extraBedsButton = (room: Room) => {
    const label = room.extraBeds
      ? t("rooms.extraBedsEditRoom", { count: room.extraBeds, name: room.name })
      : t("rooms.extraBedsAddRoom", { name: room.name })
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="max-w-full"
            aria-label={label}
            onClick={() => setExtraBedsRoom(room)}
          >
            <BedSingle aria-hidden />
            {room.extraBeds
              ? t("rooms.editExtraBedsShort", { count: room.extraBeds })
              : t("rooms.addExtraBedShort")}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    )
  }
  const metrics: { label: string; value: string | number; helper: string | null; free?: number }[] =
    isGendered
      ? [
          {
            label: t("rooms.femaleRooms"),
            value: t("rooms.beds", { count: term.capacity.FEMALE }),
            helper: t("rooms.roomCount", {
              count: term.rooms.filter((room) => room.gender === "FEMALE").length,
            }),
            free: selected.byGender?.FEMALE.free,
          },
          {
            label: t("rooms.maleRooms"),
            value: t("rooms.beds", { count: term.capacity.MALE }),
            helper: t("rooms.roomCount", {
              count: term.rooms.filter((room) => room.gender === "MALE").length,
            }),
            free: selected.byGender?.MALE.free,
          },
          { label: t("rooms.totalRooms"), value: term.rooms.length, helper: null },
        ]
      : [
          {
            label: t("rooms.totalCapacity"),
            value: t("rooms.beds", { count: term.capacity.total }),
            helper: t("rooms.roomCount", { count: term.rooms.length }),
          },
          {
            label: t("rooms.numberRooms"),
            value: term.rooms.length,
            helper: t("rooms.sharedRooms"),
          },
        ]
  const termSelect = (
    <div className="flex flex-col gap-2">
      <Label htmlFor="accommodation-term">{t("rooms.termLabel")}</Label>
      <Select
        value={selected.id}
        onValueChange={onSelectTerm}
      >
        <SelectTrigger
          id="accommodation-term"
          className="w-full bg-card"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {terms.map((item) => (
            <SelectItem
              key={item.id}
              value={item.id}
            >
              {termDatesLine(item)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
  // The view picker sits left of the term picker, in both views.
  const renderSelectors = (extra?: ReactNode) => (
    <div className="grid w-full gap-4 sm:max-w-xl sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor="accommodation-view">{t("roomOverview.views")}</Label>
        <Select
          value={view}
          onValueChange={(next) => onSelectView(next === "overview" ? "overview" : "assignment")}
        >
          <SelectTrigger
            id="accommodation-view"
            className="w-full bg-card"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="assignment">{t("roomOverview.viewAssignment")}</SelectItem>
            <SelectItem value="overview">{t("roomOverview.viewOverview")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {termSelect}
      {extra}
    </div>
  )
  const selectors = renderSelectors()
  return (
    <div className="flex flex-col gap-6">
      <Seo title={t("rooms.title")} />
      <SectionHeader
        title={t("rooms.title")}
        description={view === "assignment" ? t("rooms.description") : undefined}
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
      {view === "overview" ? (
        <RoomsOverview
          term={term}
          selectors={selectors}
          onShowAssignment={() => onSelectView("assignment")}
        />
      ) : (
        <>
          {/* Controls left, the publication switch in the otherwise empty right half. */}
          <CardGrid className="lg:grid-cols-1 xl:grid-cols-2">
            <div className="flex flex-col gap-6">
              {renderSelectors(
                <div className="flex flex-col gap-2">
                  <Label htmlFor="room-mode">{t("rooms.mode")}</Label>
                  <Select
                    value={term.roomMode}
                    onValueChange={(value) => {
                      const targetMode = roomModeSchema.parse(value)
                      if (targetMode !== term.roomMode) setPendingMode(targetMode)
                    }}
                  >
                    <SelectTrigger
                      id="room-mode"
                      className="w-full bg-card"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GENDERED">{t("rooms.genderedMode")}</SelectItem>
                      <SelectItem value="SHARED">{t("rooms.sharedMode")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{t("rooms.modeHint")}</p>
                </div>,
              )}
              {term.rooms.length === 0 && terms.length > 1 ? (
                <Alert>
                  <AlertTitle>{t("rooms.unavailableTitle")}</AlertTitle>
                  <AlertDescription>{t("rooms.unavailableHint")}</AlertDescription>
                </Alert>
              ) : null}
            </div>
            <RoomsPublicationCard
              term={term}
              onChanged={refresh}
            />
          </CardGrid>
          <div className={cn("grid grid-cols-2 gap-2 md:gap-4", isGendered && "md:grid-cols-3")}>
            {metrics.map((metric) => (
              <Card
                key={metric.label}
                className="gap-1 py-2 md:py-4"
              >
                <CardContent className="flex flex-col gap-1 px-3 md:px-4">
                  <h3 className="text-sm text-muted-foreground">{metric.label}</h3>
                  <p className="text-2xl font-semibold tracking-tight">{metric.value}</p>
                  {metric.helper ? (
                    <p className="text-sm text-muted-foreground">{metric.helper}</p>
                  ) : null}
                  {metric.free !== undefined ? (
                    <Badge
                      variant={metric.free <= 0 ? "secondary" : "success"}
                      className="self-start"
                    >
                      {t(metric.free <= 0 ? "rooms.exhausted" : "rooms.available")}
                    </Badge>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
          <RoomProposal
            key={term.termId}
            term={term}
          >
            {({ action, notices }) => (
              <Card>
                <CardHeader className="flex flex-col gap-3 max-md:order-last max-sm:items-stretch sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <CardTitle>
                    <h3>{t("roomAssignments.cardTitle")}</h3>
                  </CardTitle>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <Button
                      asChild
                      variant="ghost"
                      size="lg"
                      className="text-link max-sm:w-full"
                    >
                      <Link
                        to={ROUTES.organizer.eventTerms}
                        params={{ eventId }}
                      >
                        {t("rooms.showTerms")}
                      </Link>
                    </Button>
                    {terms.length > 1 ? (
                      <Button
                        variant="outline"
                        size="lg"
                        className="max-sm:w-full"
                        onClick={() => setIsCopying(true)}
                      >
                        {t("rooms.copy.open")}
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      size="lg"
                      className="max-sm:w-full"
                      onClick={() => setIsBulk(true)}
                    >
                      {t("rooms.bulk.open")}
                    </Button>
                    {action}
                    <Button
                      size="lg"
                      className="max-sm:w-full"
                      onClick={() => setEditor("new")}
                    >
                      {t("rooms.add")}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-4 md:px-6">
                  {notices}
                  <TooltipProvider>
                    <RoomAssignmentsCard
                      term={term}
                      onAddRoom={() => setEditor("new")}
                      roomActions={(roomId) => {
                        const room = term.rooms.find((item) => item.id === roomId)
                        if (!room) return null
                        return (
                          <>
                            {extraBedsButton(room)}
                            <Button
                              variant="ghost"
                              size="icon-lg"
                              aria-label={t("rooms.editRoom", { name: room.name })}
                              onClick={() => setEditor(room)}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-lg"
                              aria-label={t("rooms.deleteRoom", { name: room.name })}
                              onClick={() => setDeleting(room)}
                            >
                              <Trash2 />
                            </Button>
                          </>
                        )
                      }}
                    />
                  </TooltipProvider>
                </CardContent>
              </Card>
            )}
          </RoomProposal>
          <RoomWishesOverview
            eventId={term.eventId}
            termId={term.termId}
          />
        </>
      )}
      {pendingMode ? (
        <RoomModeDialog
          term={term}
          targetMode={pendingMode}
          onClose={() => setPendingMode(null)}
          onSaved={refresh}
        />
      ) : null}
      {isCopying ? (
        <CopyRoomsDialog
          target={term}
          sourceTerms={terms.filter((item) => item.id !== selected.id)}
          onClose={() => setIsCopying(false)}
          onCopied={async (sourceNames) => {
            await refresh()
            const added = refreshedTerm()?.rooms.filter((room) => !previousIds.has(room.id)) ?? []
            const names = new Set(sourceNames)
            const isVerified =
              added.length === names.size && added.every((room) => names.has(room.name))
            notify.success(
              isVerified
                ? t("rooms.copy.doneCount", { count: added.length })
                : t("rooms.copy.done"),
            )
          }}
        />
      ) : null}
      {isBulk ? (
        <BulkRoomsDialog
          term={term}
          onClose={() => setIsBulk(false)}
          onSaved={refresh}
        />
      ) : null}
      {editor ? (
        <RoomDialog
          key={editor === "new" ? "new" : editor.id}
          term={term}
          room={editor === "new" ? undefined : editor}
          onClose={() => setEditor(null)}
          onSaved={async (addedName) => {
            await refresh()
            const current = refreshedTerm()
            const added = current?.rooms.find(
              (room) => room.name === addedName && !previousIds.has(room.id),
            )
            if (current?.roomMode !== "GENDERED" || !added?.gender) return
            // The banner shows the new room's beds and the capacity the server returned; nothing is derived here.
            client.setQueryData<RoomCapacityIncrease>(
              roomCapacityIncreaseKey(eventId, term.termId),
              {
                gender: added.gender,
                addedBeds: added.beds,
                capacity: current.capacity,
              },
            )
          }}
          onDelete={(room) => {
            setEditor(null)
            setDeleting(room)
          }}
        />
      ) : null}
      {extraBedsRoom ? (
        <RoomExtraBedsDialog
          key={extraBedsRoom.id}
          term={term}
          room={extraBedsRoom}
          onClose={() => setExtraBedsRoom(null)}
          onSaved={refresh}
        />
      ) : null}
      {deleting ? (
        <DeleteRoomDialog
          term={term}
          room={deleting}
          onClose={() => setDeleting(null)}
          onSaved={refresh}
        />
      ) : null}
    </div>
  )
}
