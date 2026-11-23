import { useRef, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { PendingButton } from "@/components/atoms/PendingButton"
import { ErrorState } from "@/components/molecules/ErrorState"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { termDates, termDatesLine } from "@/lib/term-label"

import {
  copyRooms,
  roomsQueryOptions,
  type RoomCopyStrategy,
  type RoomMode,
  type TermRooms,
} from "@/features/events/api/rooms"

/** What the dialog needs to know about a term it can copy from. */
export type CopyTerm = { id: string; name: string | null; startsOn: string; endsOn: string }

// One step: pick the source term and the preview of what the copy does appears right below it. With rooms already in the
// target the organizer chooses to add to them or replace them (Návrh A / Návrh B).
// Figma (Design system): US-100 / Ubytování · Dialog: Vybrat zdrojový termín
// https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15728-4299
// Náhled kopie do prázdného termínu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15728-4416
// Návrh A · přidat k existujícím · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15728-4640
// Návrh B · nahradit existující · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15728-4765
// #533 · přistýlky (Figma ještě ukazuje „bez přistýlek“ a „Nezkopíruje se“; #623 je kopíruje, viz PR „Odchylky od Figmy“):
// Prázdný cíl · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=26009-112219 (mobil 26009-112748)
// Přidat ke stávajícím · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=26009-112385 (mobil 26009-112847)
// Nahradit · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=26009-112566 (mobil 26009-112961)
export function CopyRoomsDialog({
  target,
  sourceTerms,
  onClose,
  onCopied,
}: {
  target: TermRooms
  /** The other terms of the event with their room mode. */
  sourceTerms: (CopyTerm & { roomMode: RoomMode; roomCount: number })[]
  onClose: () => void
  onCopied: (sourceNames: string[]) => Promise<void>
}) {
  const { t } = useTranslation("events")
  const cancelRef = useRef<HTMLButtonElement>(null)
  const [isPreview, setPreview] = useState(false)
  const [sourceId, setSourceId] = useState<string>("")
  const [strategy, setStrategy] = useState<RoomCopyStrategy>("ADD")
  const source = useQuery({
    ...roomsQueryOptions(target.eventId, sourceId),
    enabled: sourceId !== "",
  })
  const sourceRooms = source.data?.rooms ?? []
  const hasTargetRooms = target.rooms.length > 0
  const isReplacing = hasTargetRooms && strategy === "REPLACE"
  // Extra beds (přistýlky) are copied with their room (#623), so the source counts its beds with them (Σ capacity + extraBeds).
  // The target keeps its own extra beds on an add and loses them on a replace.
  const sourceExtraBeds = sourceRooms.reduce((sum, room) => sum + room.extraBeds, 0)
  const sourceBeds = sourceRooms.reduce((sum, room) => sum + room.capacity, 0) + sourceExtraBeds
  const targetExtraBeds = target.rooms.reduce((sum, room) => sum + room.extraBeds, 0)
  const resultRooms = (isReplacing ? 0 : target.rooms.length) + sourceRooms.length
  const resultBeds = (isReplacing ? 0 : target.capacity.total) + sourceBeds
  // The server compares names case-insensitively and refuses an ADD with a collision.
  const takenNames = new Set(target.rooms.map((room) => room.name.toLowerCase()))
  const collidingNames =
    hasTargetRooms && !isReplacing
      ? sourceRooms
          .filter((room) => takenNames.has(room.name.toLowerCase()))
          .map((room) => room.name)
      : []
  const rooms = (count: number) => t("rooms.roomCount", { count })
  const beds = (count: number) => t("rooms.copy.beds", { count })
  const sourceNote =
    sourceExtraBeds > 0 ? t("rooms.copy.sourceExtraBeds", { count: sourceExtraBeds }) : null
  const resultExtraBeds = (isReplacing ? 0 : targetExtraBeds) + sourceExtraBeds
  const targetNote =
    targetExtraBeds > 0 ? t("rooms.copy.targetExtraBeds", { count: targetExtraBeds }) : null
  const copiedBox = (
    <dl className="flex min-w-0 flex-col gap-3 rounded-lg border bg-muted p-4">
      <div className="flex min-w-0 flex-col gap-2">
        <dt className="text-sm text-muted-foreground">{t("rooms.copy.copiedHeading")}</dt>
        <dd>
          {t(
            target.roomMode === "SHARED" ? "rooms.copy.copiedBodyShared" : "rooms.copy.copiedBody",
          )}
        </dd>
      </div>
    </dl>
  )
  const mutation = useMutation({
    mutationFn: () =>
      copyRooms(target.eventId, target.termId, sourceId, hasTargetRooms ? strategy : "ADD"),
    onSuccess: async () => {
      await onCopied(sourceRooms.map((room) => room.name))
      onClose()
    },
  })
  const modeLabel = (mode: RoomMode) =>
    t(mode === "SHARED" ? "rooms.copy.modeShared" : "rooms.copy.modeGendered")
  const hasSource = sourceTerms.some(
    (item) => item.roomMode === target.roomMode && item.roomCount > 0,
  )
  const isReady = sourceId !== "" && sourceRooms.length > 0
  const sourceTerm = sourceTerms.find((item) => item.id === sourceId)
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !mutation.isPending) onClose()
      }}
    >
      <DialogContent
        className="bg-card shadow-md sm:max-w-160"
        aria-describedby={undefined}
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          cancelRef.current?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle>{t("rooms.copy.title")}</DialogTitle>
        </DialogHeader>
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor="copy-source-term">{t("rooms.copy.sourceLabel")}</Label>
            <Select
              value={sourceId}
              disabled={mutation.isPending || !hasSource}
              onValueChange={(id) => {
                setSourceId(id)
                setPreview(false)
                setStrategy("ADD")
                mutation.reset()
              }}
            >
              <SelectTrigger
                id="copy-source-term"
                className="w-full min-w-0 bg-card"
              >
                <SelectValue
                  placeholder={t(
                    hasSource ? "rooms.copy.sourcePlaceholder" : "rooms.copy.noSource",
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                {sourceTerms.map((item) => (
                  <SelectItem
                    key={item.id}
                    value={item.id}
                    disabled={item.roomMode !== target.roomMode || item.roomCount === 0}
                  >
                    {termDatesLine(item)} · {modeLabel(item.roomMode)}
                    {item.roomMode !== target.roomMode ? ` (${t("rooms.copy.modeDiffers")})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!hasSource && (
            <Alert>
              <AlertTitle>{t("rooms.copy.noSourceTitle")}</AlertTitle>
              <AlertDescription>{t("rooms.copy.noSourceHelp")}</AlertDescription>
            </Alert>
          )}
          {source.isError ? (
            <ErrorState
              title={t("rooms.loadFailed")}
              error={source.error}
            />
          ) : null}
          {source.data && sourceRooms.length === 0 ? <p>{t("rooms.copy.emptySource")}</p> : null}
          {isPreview && isReady && sourceTerm ? (
            <div className="flex min-w-0 flex-col gap-4">
              {hasTargetRooms ? (
                <>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <div className="flex min-w-0 flex-col gap-2">
                      <dt className="text-sm text-muted-foreground">
                        {t("rooms.copy.sourceHeading")}
                      </dt>
                      <dd>
                        {t("rooms.copy.summary", {
                          rooms: rooms(sourceRooms.length),
                          beds: beds(sourceBeds),
                        })}
                        {sourceNote ? (
                          <span className="block text-sm text-muted-foreground">{sourceNote}</span>
                        ) : null}
                      </dd>
                    </div>
                    <div className="flex min-w-0 flex-col gap-2">
                      <dt className="text-sm text-muted-foreground">
                        {t("rooms.copy.targetHeading")}
                      </dt>
                      <dd>
                        {t("rooms.copy.summary", {
                          rooms: rooms(target.rooms.length),
                          beds: beds(target.capacity.total),
                        })}
                        {targetNote ? (
                          <span className="block text-sm text-muted-foreground">{targetNote}</span>
                        ) : null}
                      </dd>
                    </div>
                  </dl>
                  {copiedBox}
                  <RadioGroup
                    value={strategy}
                    onValueChange={(value) => setStrategy(value as RoomCopyStrategy)}
                    aria-label={t("rooms.copy.strategy")}
                    disabled={mutation.isPending}
                  >
                    {(["ADD", "REPLACE"] as const).map((option) => (
                      <div
                        key={option}
                        className="flex items-center gap-3"
                      >
                        <RadioGroupItem
                          id={`copy-strategy-${option}`}
                          value={option}
                        />
                        <Label htmlFor={`copy-strategy-${option}`}>
                          {t(
                            option === "ADD"
                              ? "rooms.copy.strategyAdd"
                              : "rooms.copy.strategyReplace",
                          )}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  <Alert variant={isReplacing ? "destructive" : "default"}>
                    <AlertTitle>
                      {t(isReplacing ? "rooms.copy.replaceHeading" : "rooms.copy.addHeading")}
                    </AlertTitle>
                    <AlertDescription className={isReplacing ? undefined : "text-foreground"}>
                      {t(
                        isReplacing
                          ? "rooms.copy.replaceBody"
                          : resultExtraBeds > 0
                            ? "rooms.copy.addBodyExtraBeds"
                            : "rooms.copy.addBody",
                        {
                          count: target.rooms.length,
                          rooms: rooms(resultRooms),
                          beds: beds(resultBeds),
                          extra: t("rooms.copy.extraBedsCount", { count: resultExtraBeds }),
                        },
                      )}
                    </AlertDescription>
                  </Alert>
                  {collidingNames.length ? (
                    <Alert variant="destructive">
                      <AlertTitle>{t("rooms.copy.collisionHeading")}</AlertTitle>
                      <AlertDescription>
                        {t("rooms.copy.collisionBody", { names: collidingNames.join(", ") })}
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </>
              ) : (
                <>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <div className="flex min-w-0 flex-col gap-2">
                      <dt className="text-sm text-muted-foreground">{t("rooms.copy.source")}</dt>
                      <dd>
                        {termDates(sourceTerm)} · {rooms(sourceRooms.length)}, {beds(sourceBeds)}
                        {sourceNote ? (
                          <span className="block text-sm text-muted-foreground">{sourceNote}</span>
                        ) : null}
                      </dd>
                    </div>
                    <div className="flex min-w-0 flex-col gap-2">
                      <dt className="text-sm text-muted-foreground">{t("rooms.copy.target")}</dt>
                      <dd>
                        {termDates(target)} · {t("rooms.copy.targetEmpty")}
                      </dd>
                    </div>
                  </dl>
                  {copiedBox}
                  <p>
                    {t("rooms.copy.emptyBody", {
                      rooms: rooms(sourceRooms.length),
                      beds: beds(sourceBeds),
                    })}
                  </p>
                </>
              )}
            </div>
          ) : null}
        </div>
        {mutation.isError ? (
          <ErrorState
            title={t("rooms.saveFailed")}
            error={mutation.error}
          />
        ) : null}
        <DialogFooter className="gap-4">
          <Button
            ref={cancelRef}
            onClick={() => {
              if (isPreview) {
                setPreview(false)
                mutation.reset()
              } else onClose()
            }}
            variant="outline"
            size="lg"
            className="sm:w-38"
            disabled={mutation.isPending}
          >
            {t(isPreview ? "rooms.copy.back" : "rooms.copy.cancel")}
          </Button>

          <PendingButton
            isPending={mutation.isPending}
            size="lg"
            className="sm:w-auto"
            disabled={!isReady || mutation.isPending}
            onClick={() => {
              if (isPreview) mutation.mutate()
              else setPreview(true)
            }}
          >
            {!isPreview
              ? t("rooms.copy.preview")
              : !hasTargetRooms
                ? t("rooms.copy.emptyConfirm")
                : isReplacing
                  ? t("rooms.copy.replaceConfirm")
                  : t("rooms.copy.addConfirm", { count: sourceRooms.length })}
          </PendingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
