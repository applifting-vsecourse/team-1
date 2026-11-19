import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/date"

import type {
  AssignmentRoom,
  RoomAssignments,
  RoomWarning,
} from "@/features/events/api/room-assignments"

/** Warnings about one room, in the order the rules list them. */
export const warningsOfRoom = (warnings: RoomWarning[], roomId: string): RoomWarning[] =>
  warnings.filter((warning) => warning.roomId === roomId)

/** The text of one room warning, with the people counted from the room itself. */
function useWarningText() {
  const { t } = useTranslation("events")
  return (warning: RoomWarning, room: AssignmentRoom): string => {
    if (warning.kind === "MIXED_GENDER") {
      // Who asked for individual accommodation is not counted, as in the rule itself (US-38).
      const counted = room.participants.filter((person) => !person.individualAccommodation)
      const women = counted.filter((person) => person.gender === "FEMALE").length
      const men = counted.length - women
      return t("roomWarnings.mixedGender", {
        women: t("roomWarnings.women", { count: women }),
        men: t("roomWarnings.men", { count: men }),
      })
    }
    return t("roomWarnings.overcrowded", {
      people: t("roomWarnings.people", { count: room.participants.length }),
      beds: t("roomWarnings.beds", { count: room.beds }),
    })
  }
}

// Under the row of a room, one line per warning: what is wrong and a clear way to confirm it
// knowingly (AC4). Warnings are information only, they block nothing.
// Figma (Design system): Upozornění u pokoje · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23410-95117 (improved after review: icon tile, filled confirm button)
export function RoomWarningStrip({
  room,
  warning,
  onAcknowledge,
}: {
  room: AssignmentRoom
  warning: RoomWarning
  onAcknowledge: (warning: RoomWarning, room: AssignmentRoom) => void
}) {
  const { t } = useTranslation("events")
  const warningText = useWarningText()
  if (warning.acknowledged) {
    return (
      <div className="flex items-start gap-3 border-t border-border bg-secondary px-3 py-2.5">
        <ShieldCheck
          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
          <p className="font-medium text-muted-foreground">
            {t(
              warning.kind === "MIXED_GENDER"
                ? "roomWarnings.mixedGenderAcknowledged"
                : "roomWarnings.overcrowdedAcknowledged",
            )}
          </p>
          {warning.note ? (
            <p className="break-words text-muted-foreground">
              {t("roomWarnings.note", { note: warning.note })}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {t("roomWarnings.confirmedBy", {
              name: warning.acknowledgedBy ?? "",
              date: warning.acknowledgedAt ? formatDate(warning.acknowledgedAt) : "",
            })}
          </p>
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3 border-t border-status-warning/40 bg-status-warning-bg px-3 py-2.5 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-status-warning/15 text-status-warning">
          <AlertTriangle
            className="size-4"
            aria-hidden
          />
        </span>
        <p className="min-w-0 flex-1 text-sm font-medium break-words">
          {warningText(warning, room)}
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        className="w-full bg-status-warning text-status-warning-bg hover:bg-status-warning/90 sm:w-auto"
        onClick={() => onAcknowledge(warning, room)}
      >
        {t("roomWarnings.acknowledge")}
      </Button>
    </div>
  )
}

// Above the rooms: a small summary of the room rules: a quiet green line while none is broken, the
// warning bar with the count once one is. Before anyone is assigned there is nothing to check, so it says so.
// Figma (Design system): Souhrn a upozornění v rozdělení do pokojů · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23410-94640 (mobile 23410-95377; improved after review: compact, no jump buttons)
// Figma (Design system): Bez porušení pravidel · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23412-95922 (mobile 23412-96515)
// Figma (Design system): Termín bez rozdělení · žádná upozornění · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23412-96655 (mobile 23412-97243)
// Figma (Design system): Společné pokoje · smíšené pohlaví se nehlídá · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23412-97375 (mobile 23412-97961)
export function RoomWarningsSummary({
  data,
  isSharedMode,
}: {
  data: Pick<RoomAssignments, "rooms" | "summary" | "warnings">
  isSharedMode: boolean
}) {
  const { t } = useTranslation("events")
  const { summary } = data
  const assigned = data.rooms.flatMap((room) => room.participants)
  if (assigned.length === 0) {
    return (
      <Alert className="bg-accent">
        <AlertTriangle aria-hidden />
        <AlertTitle>{t("roomWarnings.notStartedTitle")}</AlertTitle>
        <AlertDescription>{t("roomWarnings.notStartedBody")}</AlertDescription>
      </Alert>
    )
  }
  // Confirmed people without a bed are not repeated here: the unassigned block shows them.
  if (summary.violations === 0) {
    return (
      <p
        role="status"
        className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground"
      >
        <span className="flex items-center gap-2">
          <CheckCircle2
            className="size-4 shrink-0 text-status-success"
            aria-hidden
          />
          {t("roomWarnings.noneTitle")}
        </span>
        {isSharedMode ? <span className="text-xs">{t("roomWarnings.sharedNote")}</span> : null}
      </p>
    )
  }
  return (
    <div
      role="status"
      aria-label={t("roomWarnings.summaryTitle")}
      className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-lg border border-status-warning/30 bg-status-warning-bg px-4 py-2.5 text-center text-sm"
    >
      <span className="flex items-center gap-2 font-medium">
        <AlertTriangle
          className="size-4 text-status-warning"
          aria-hidden
        />
        <span className="font-bold">{summary.violations}</span>
        {t("roomWarnings.violations", { count: summary.violations })}
      </span>
      {isSharedMode ? (
        <span className="text-xs text-muted-foreground">{t("roomWarnings.sharedNote")}</span>
      ) : null}
    </div>
  )
}
