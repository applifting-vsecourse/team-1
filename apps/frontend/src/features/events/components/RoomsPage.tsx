import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, ArrowRight, Pencil, TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { SectionHeader } from "@/components/molecules/SectionHeader"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDateRange } from "@/lib/date"
import { cn } from "@/lib/utils"

import { eventKeys } from "@/features/events/api/events"
import { roomsQueryOptions, type Room, type RoomMode } from "@/features/events/api/rooms"
import { DeleteRoomDialog } from "@/features/events/components/DeleteRoomDialog"
import { RoomDialog } from "@/features/events/components/RoomDialog"
import { RoomModeDialog } from "@/features/events/components/RoomModeDialog"

const PAGE_SIZES = [5, 10, 20]

/** What the page needs to know about every active term; the route reads it from the occupancy. */
export type AccommodationTerm = {
  id: string
  name: string
  startsOn: string
  endsOn: string
  roomMode: RoomMode
  roomCount: number
  capacity: number
  byGender: {
    FEMALE: { capacity: number; confirmed: number; free: number }
    MALE: { capacity: number; confirmed: number; free: number }
  } | null
}

// Accommodation of an event: capacity overview by term, then the rooms and the room mode of the
// selected term.
// Figma (Design system): Ubytování · Přehled kapacit po termínech · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15708-4197
// Mobile · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15708-4278
// New term without rooms · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15708-4332
// Capacity groups · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15564-2356
export function RoomsPage({
  eventId,
  termId,
  terms,
  onSelectTerm,
}: {
  eventId: string
  termId?: string
  terms: AccommodationTerm[]
  onSelectTerm: (termId: string) => void
}) {
  const { t } = useTranslation("events")
  const client = useQueryClient()
  const selected = terms.find((term) => term.id === termId) ?? terms[0]
  const query = useQuery({
    ...roomsQueryOptions(eventId, selected?.id ?? ""),
    enabled: selected !== undefined,
  })
  const [editor, setEditor] = useState<Room | "new" | null>(null)
  const [deleting, setDeleting] = useState<Room | null>(null)
  const [isChangingMode, setIsChangingMode] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const refresh = async () => {
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
  const rooms = term?.rooms ?? []
  const pageCount = Math.max(1, Math.ceil(rooms.length / pageSize))
  const current = Math.min(page, pageCount)
  const visible = rooms.slice((current - 1) * pageSize, current * pageSize)
  const period = (item: { startsOn: string; endsOn: string }) =>
    formatDateRange(item.startsOn, item.endsOn, { shouldShowYear: true })
  const modeName = (mode: RoomMode) => t(mode === "GENDERED" ? "rooms.byGender" : "rooms.shared")
  const capacityText = (item: AccommodationTerm) =>
    item.byGender
      ? t("rooms.genderedCapacity", {
          female: item.byGender.FEMALE.capacity,
          male: item.byGender.MALE.capacity,
        })
      : t("rooms.bedCount", { count: item.capacity })
  const roomKind = (room: Room) =>
    t(
      room.gender === "FEMALE"
        ? "rooms.femaleRoom"
        : room.gender === "MALE"
          ? "rooms.maleRoom"
          : "rooms.sharedRoom",
    )

  return (
    <div className="flex flex-col gap-6">
      <Seo title={t("rooms.title")} />
      <SectionHeader
        title={t("rooms.title")}
        description={t("rooms.description")}
      />
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-6">
        <div className="flex flex-col gap-2 md:w-82">
          <Label htmlFor="accommodation-term">{t("rooms.termLabel")}</Label>
          <Select
            value={selected.id}
            onValueChange={(value) => {
              setPage(1)
              onSelectTerm(value)
            }}
          >
            <SelectTrigger
              id="accommodation-term"
              className="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {terms.map((item) => (
                <SelectItem
                  key={item.id}
                  value={item.id}
                >
                  {period(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-1 items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">{t("rooms.modeLabel")}</span>
            <span>{modeName(selected.roomMode)}</span>
          </div>
          <Button
            variant="ghost"
            size="lg"
            disabled={!term}
            onClick={() => setIsChangingMode(true)}
          >
            {t("rooms.changeMode")}
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        {terms.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <CardTitle>
                <h3 className="text-2xl tabular-nums">{period(item)}</h3>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Info
                label={t("rooms.modeLabel")}
                value={modeName(item.roomMode)}
              />
              <Info
                label={t("rooms.capacityLabel")}
                value={capacityText(item)}
              />
              <Button
                size="lg"
                className="self-start max-md:w-full"
                onClick={() => {
                  setPage(1)
                  onSelectTerm(item.id)
                }}
              >
                {t("rooms.manage")}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      {query.isError ? (
        <ErrorState
          title={t("rooms.loadFailed")}
          error={query.error}
          onRetry={() => {
            void query.refetch()
          }}
        />
      ) : !term ? (
        <LoadingState />
      ) : (
        <>
          {selected.byGender ? <GenderGroups byGender={selected.byGender} /> : null}
          <Card>
            <CardHeader>
              <CardTitle>
                <h3 className="text-2xl">{t("rooms.listTitle")}</h3>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {rooms.length ? (
                <>
                  <ul className="grid gap-4 md:grid-cols-2">
                    {visible.map((room) => (
                      <li
                        key={room.id}
                        className="flex flex-col gap-2 rounded-lg border p-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xl font-medium break-words">{room.name}</span>
                          <Button
                            variant="ghost"
                            size="icon-lg"
                            aria-label={t("rooms.editRoom", { name: room.name })}
                            onClick={() => setEditor(room)}
                          >
                            <Pencil />
                          </Button>
                        </div>
                        <span>
                          {t("rooms.roomCapacity", {
                            beds: t("rooms.bedCount", { count: room.capacity }),
                          })}
                        </span>
                        <span className="text-sm text-muted-foreground">{roomKind(room)}</span>
                      </li>
                    ))}
                  </ul>
                  {!selected.byGender ? (
                    <Info
                      label={t("rooms.termCapacity")}
                      value={t("rooms.bedCount", { count: term.capacity.total })}
                    />
                  ) : null}
                  <Button
                    variant="ghost"
                    size="lg"
                    className="self-center"
                    onClick={() => setEditor("new")}
                  >
                    {t("rooms.add")}
                  </Button>
                  <div
                    className={cn(
                      "flex flex-col items-center gap-4 md:flex-row md:justify-between",
                      rooms.length <= PAGE_SIZES[0]! && "hidden",
                    )}
                  >
                    <span className="text-sm text-muted-foreground">
                      {t("rooms.range", {
                        from: (current - 1) * pageSize + 1,
                        to: Math.min(current * pageSize, rooms.length),
                        total: rooms.length,
                      })}
                    </span>
                    <Pagination className="mx-0 w-auto">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationLink
                            href="#"
                            aria-label={t("rooms.previousPage")}
                            aria-disabled={current === 1}
                            onClick={(event) => {
                              event.preventDefault()
                              setPage(Math.max(1, current - 1))
                            }}
                          >
                            <ArrowLeft />
                          </PaginationLink>
                        </PaginationItem>
                        {pageNumbers(current, pageCount).map((entry, index) =>
                          entry === null ? (
                            <PaginationItem key={`gap-${index}`}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          ) : (
                            <PaginationItem key={entry}>
                              <PaginationLink
                                href="#"
                                isActive={entry === current}
                                aria-label={t("rooms.pageNumber", { page: entry })}
                                onClick={(event) => {
                                  event.preventDefault()
                                  setPage(entry)
                                }}
                              >
                                {entry}
                              </PaginationLink>
                            </PaginationItem>
                          ),
                        )}
                        <PaginationItem>
                          <PaginationLink
                            href="#"
                            aria-label={t("rooms.nextPage")}
                            aria-disabled={current === pageCount}
                            onClick={(event) => {
                              event.preventDefault()
                              setPage(Math.min(pageCount, current + 1))
                            }}
                          >
                            <ArrowRight />
                          </PaginationLink>
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(value) => {
                        setPageSize(Number(value))
                        setPage(1)
                      }}
                    >
                      <SelectTrigger
                        size="sm"
                        className="max-md:hidden"
                        aria-label={t("rooms.perPageLabel")}
                      >
                        <SelectValue>{t("rooms.perPage", { count: pageSize })}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZES.map((size) => (
                          <SelectItem
                            key={size}
                            value={String(size)}
                          >
                            {t("rooms.perPage", { count: size })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <h4 className="text-2xl font-semibold">{t("rooms.emptyTitle")}</h4>
                  <p className="text-muted-foreground">{t("rooms.emptyBody")}</p>
                  <Button
                    size="lg"
                    onClick={() => setEditor("new")}
                  >
                    {t("rooms.add")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          {selected.roomCount === 0 ? (
            <Alert className="border-border bg-status-success-bg">
              <TriangleAlert />
              <AlertTitle>{t("rooms.unavailableTitle")}</AlertTitle>
              <AlertDescription>{t("rooms.unavailableBody")}</AlertDescription>
            </Alert>
          ) : null}
        </>
      )}
      {isChangingMode && term ? (
        <RoomModeDialog
          term={term}
          onClose={() => setIsChangingMode(false)}
          onSaved={refresh}
        />
      ) : null}
      {editor && term ? (
        <RoomDialog
          key={editor === "new" ? "new" : editor.id}
          term={term}
          room={editor === "new" ? undefined : editor}
          onClose={() => setEditor(null)}
          onSaved={refresh}
          onDelete={(room) => {
            setEditor(null)
            setDeleting(room)
          }}
        />
      ) : null}
      {deleting && term ? (
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-base">{value}</span>
    </div>
  )
}

/** Capacity groups of a gendered term: women's and men's beds are separate pools. */
// Figma (Design system): Oddělené skupiny kapacity · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15564-2356
function GenderGroups({ byGender }: { byGender: NonNullable<AccommodationTerm["byGender"]> }) {
  const { t } = useTranslation("events")
  const groups = [
    { gender: "FEMALE", title: t("rooms.femaleBeds"), figures: byGender.FEMALE },
    { gender: "MALE", title: t("rooms.maleBeds"), figures: byGender.MALE },
  ] as const
  // A free bed of the other gender never replaces a missing one: the applicant waits.
  const [women, men] = groups
  const exhausted =
    women.figures.free <= 0 && men.figures.free > 0
      ? women
      : men.figures.free <= 0 && women.figures.free > 0
        ? men
        : undefined
  const other = exhausted === women ? men : women
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        {groups.map(({ gender, title, figures }) => (
          <Card key={gender}>
            <CardHeader>
              <CardTitle>
                <h3 className="text-2xl">{title}</h3>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Info
                label={t("rooms.capacityLabel")}
                value={t("rooms.bedCount", { count: figures.capacity })}
              />
              <Info
                label={t("rooms.confirmedApplications")}
                value={String(figures.confirmed)}
              />
              <Info
                label={t("rooms.freeBeds")}
                value={String(figures.free)}
              />
              <Badge
                variant={figures.free <= 0 ? "secondary" : "success"}
                className="self-start"
              >
                {t(figures.free <= 0 ? "rooms.exhausted" : "rooms.available")}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
      {exhausted ? (
        <Alert className="border-border bg-status-success-bg">
          <TriangleAlert />
          <AlertTitle>
            {t(
              exhausted.gender === "FEMALE" ? "rooms.noSubstituteFemale" : "rooms.noSubstituteMale",
            )}
          </AlertTitle>
          <AlertDescription>
            {t(exhausted.gender === "FEMALE" ? "rooms.waitlistedFemale" : "rooms.waitlistedMale", {
              count: other.figures.free,
            })}
          </AlertDescription>
        </Alert>
      ) : null}
    </>
  )
}

/** 1 … 4 5 6 … 10: the first and last page, the current one with its neighbours; `null` is a gap. */
function pageNumbers(current: number, count: number): (number | null)[] {
  const wanted = new Set([1, count, current - 1, current, current + 1])
  const pages = [...wanted].filter((page) => page >= 1 && page <= count).sort((a, b) => a - b)
  return pages.flatMap((page, index) =>
    index > 0 && page - (pages[index - 1] ?? page) > 1 ? [null, page] : [page],
  )
}
