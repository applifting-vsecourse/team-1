import { useRef, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
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

// Two steps: pick the source term, then a preview of what the copy does. With rooms already in the
// target the organizer chooses to add to them or replace them (Návrh A / Návrh B).
// Figma (Design system): US-100 / Ubytování · Dialog: Vybrat zdrojový termín
// https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15728-4299
// Náhled kopie do prázdného termínu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15728-4416
// Návrh A · přidat k existujícím · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15728-4640
// Návrh B · nahradit existující · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15728-4765
export function CopyRoomsDialog({
  target,
  sourceTerms,
  onClose,
  onCopied,
}: {
  target: TermRooms
  /** The other terms of the event with their room mode. */
  sourceTerms: (CopyTerm & { roomMode: RoomMode })[]
  onClose: () => void
  onCopied: () => Promise<void>
}) {
  const { t } = useTranslation("events")
  const cancelRef = useRef<HTMLButtonElement>(null)
  const [sourceId, setSourceId] = useState<string>("")
  const [isPreview, setIsPreview] = useState(false)
  const [strategy, setStrategy] = useState<RoomCopyStrategy>("ADD")
  const source = useQuery({
    ...roomsQueryOptions(target.eventId, sourceId),
    enabled: sourceId !== "",
  })
  const sourceRooms = source.data?.rooms ?? []
  const hasTargetRooms = target.rooms.length > 0
  const isReplacing = hasTargetRooms && strategy === "REPLACE"
  // Capacities are the server's (`capacity.total`); the dialog only combines them for the preview.
  const sourceBeds = source.data?.capacity.total ?? 0
  const resultRooms = (isReplacing ? 0 : target.rooms.length) + sourceRooms.length
  const resultBeds = (isReplacing ? 0 : target.capacity.total) + sourceBeds
  const rooms = (count: number) => t("rooms.roomCount", { count })
  const beds = (count: number) => t("rooms.beds", { count })
  const mutation = useMutation({
    mutationFn: () =>
      copyRooms(target.eventId, target.termId, sourceId, hasTargetRooms ? strategy : "ADD"),
    onSuccess: async () => {
      await onCopied()
      onClose()
    },
  })
  const modeLabel = (mode: RoomMode) =>
    t(mode === "SHARED" ? "rooms.copy.modeShared" : "rooms.copy.modeGendered")
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
        className="max-h-[90dvh] overflow-y-auto bg-card shadow-md sm:max-w-170"
        aria-describedby={undefined}
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          cancelRef.current?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle>{t("rooms.copy.title")}</DialogTitle>
        </DialogHeader>
        {isPreview && sourceTerm ? (
          <div className="flex flex-col gap-4">
            {hasTargetRooms ? (
              <>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <dt className="text-sm text-muted-foreground">
                      {t("rooms.copy.sourceHeading")}
                    </dt>
                    <dd>
                      {t("rooms.copy.summary", {
                        rooms: rooms(sourceRooms.length),
                        beds: beds(sourceBeds),
                      })}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-2">
                    <dt className="text-sm text-muted-foreground">
                      {t("rooms.copy.targetHeading")}
                    </dt>
                    <dd>
                      {t("rooms.copy.summary", {
                        rooms: rooms(target.rooms.length),
                        beds: beds(target.capacity.total),
                      })}
                    </dd>
                  </div>
                </dl>
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
                    {t(isReplacing ? "rooms.copy.replaceBody" : "rooms.copy.addBody", {
                      count: target.rooms.length,
                      rooms: rooms(resultRooms),
                      beds: beds(resultBeds),
                    })}
                  </AlertDescription>
                </Alert>
              </>
            ) : (
              <>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <dt className="text-sm text-muted-foreground">{t("rooms.copy.source")}</dt>
                    <dd>
                      {termDates(sourceTerm)} · {rooms(sourceRooms.length)}, {beds(sourceBeds)}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-2">
                    <dt className="text-sm text-muted-foreground">{t("rooms.copy.target")}</dt>
                    <dd>
                      {termDates(target)} · {t("rooms.copy.targetEmpty")}
                    </dd>
                  </div>
                </dl>
                <p>
                  {t("rooms.copy.emptyBody", {
                    rooms: rooms(sourceRooms.length),
                    beds: beds(sourceBeds),
                  })}
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="copy-source-term">{t("rooms.copy.sourceLabel")}</Label>
              <Select
                value={sourceId}
                onValueChange={setSourceId}
              >
                <SelectTrigger
                  id="copy-source-term"
                  className="w-full bg-card"
                >
                  <SelectValue placeholder={t("rooms.copy.sourcePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {sourceTerms.map((item) => (
                    <SelectItem
                      key={item.id}
                      value={item.id}
                      disabled={item.roomMode !== target.roomMode}
                    >
                      {termDatesLine(item)} · {modeLabel(item.roomMode)}
                      {item.roomMode !== target.roomMode ? ` (${t("rooms.copy.modeDiffers")})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {source.isError ? (
              <ErrorState
                title={t("rooms.loadFailed")}
                error={source.error}
              />
            ) : null}
            {source.data ? (
              <p>
                {sourceRooms.length
                  ? t("rooms.copy.summary", {
                      rooms: rooms(sourceRooms.length),
                      beds: beds(sourceBeds),
                    })
                  : t("rooms.copy.emptySource")}
              </p>
            ) : null}
          </div>
        )}
        {mutation.isError ? (
          <ErrorState
            title={t("rooms.saveFailed")}
            error={mutation.error}
          />
        ) : null}
        <DialogFooter className="gap-4">
          <DialogClose asChild>
            <Button
              ref={cancelRef}
              variant="outline"
              size="lg"
              className="sm:w-38"
              disabled={mutation.isPending}
            >
              {t("rooms.copy.cancel")}
            </Button>
          </DialogClose>
          {isPreview ? (
            <Button
              size="lg"
              className="sm:w-auto"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? <Loader2 className="animate-spin" /> : null}
              {!hasTargetRooms
                ? t("rooms.copy.emptyConfirm")
                : isReplacing
                  ? t("rooms.copy.replaceConfirm")
                  : t("rooms.copy.addConfirm", { count: sourceRooms.length })}
            </Button>
          ) : (
            <Button
              size="lg"
              className="sm:w-auto"
              disabled={!isReady}
              onClick={() => setIsPreview(true)}
            >
              {t("rooms.copy.previewAction")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
