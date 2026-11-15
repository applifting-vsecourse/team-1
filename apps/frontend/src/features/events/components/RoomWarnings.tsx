import { AlertTriangle, CheckCircle2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
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
      const women = room.participants.filter((person) => person.gender === "FEMALE").length
      const men = room.participants.length - women
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

// Under the row of a room: what is wrong, and a way to confirm it knowingly (AC4), or the muted
// confirmation with its note and who made it. Warnings are information only, they block nothing.
// Figma (Design system): Upozornění u pokoje · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23410-95117 (confirmed: 23410-95277)
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
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border bg-secondary px-3 py-2.5">
        <Badge variant="secondary">{t("roomWarnings.acknowledgedBadge")}</Badge>
        <p className="min-w-0 flex-1 text-sm break-words text-muted-foreground">
          {t(
            warning.kind === "MIXED_GENDER"
              ? "roomWarnings.mixedGenderAcknowledged"
              : "roomWarnings.overcrowdedAcknowledged",
          )}
          {" · "}
          {t(warning.note ? "roomWarnings.noteBy" : "roomWarnings.confirmedBy", {
            note: warning.note ?? "",
            name: warning.acknowledgedBy ?? "",
            date: warning.acknowledgedAt ? formatDate(warning.acknowledgedAt) : "",
          })}
        </p>
      </div>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-status-warning bg-status-warning-bg px-3 py-2.5">
      <AlertTriangle
        className="size-5 shrink-0 text-status-warning"
        aria-hidden
      />
      <p className="min-w-0 flex-1 text-sm break-words">{warningText(warning, room)}</p>
      <Button
        type="button"
        variant="ghost"
        onClick={() => onAcknowledge(warning, room)}
      >
        {t("roomWarnings.acknowledge")}
      </Button>
    </div>
  )
}

// Above the rooms: how many rules are broken and how many confirmed people sleep nowhere, with a
// jump to each. Before anyone is assigned there is nothing to check, so it says so.
// Figma (Design system): Souhrn a upozornění v rozdělení do pokojů · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23410-94640 (mobile 23410-95377)
// Figma (Design system): Bez porušení pravidel · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23412-95922 (mobile 23412-96515)
// Figma (Design system): Termín bez rozdělení · žádná upozornění · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23412-96655 (mobile 23412-97243)
// Figma (Design system): Společné pokoje · smíšené pohlaví se nehlídá · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23412-97375 (mobile 23412-97961)
export function RoomWarningsSummary({
  data,
  isSharedMode,
  onShowRooms,
  onShowParticipants,
}: {
  data: Pick<RoomAssignments, "rooms" | "summary" | "warnings">
  isSharedMode: boolean
  onShowRooms: () => void
  onShowParticipants: () => void
}) {
  const { t } = useTranslation("events")
  const { summary, warnings } = data
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
  if (warnings.length === 0) {
    return (
      <Alert className="bg-accent">
        <CheckCircle2 aria-hidden />
        <AlertTitle>{t("roomWarnings.noneTitle")}</AlertTitle>
        <AlertDescription>
          {t("roomWarnings.noneBody", {
            count: assigned.filter((person) => person.status === "CONFIRMED").length,
          })}
        </AlertDescription>
      </Alert>
    )
  }
  const counts = [
    {
      key: "violations",
      count: summary.violations,
      label: t("roomWarnings.violations", { count: summary.violations }),
      action: t("roomWarnings.showRooms"),
      onAction: onShowRooms,
    },
    {
      key: "withoutBed",
      count: summary.confirmedWithoutBed,
      label: t("roomWarnings.withoutBed", { count: summary.confirmedWithoutBed }),
      action: t("roomWarnings.showParticipants"),
      onAction: onShowParticipants,
    },
  ]
  return (
    <Alert variant="warning">
      <AlertTriangle aria-hidden />
      <AlertTitle className="line-clamp-none">{t("roomWarnings.summaryTitle")}</AlertTitle>
      <AlertDescription className="text-muted-foreground">
        {t(isSharedMode ? "roomWarnings.sharedNote" : "roomWarnings.summaryBody")}
      </AlertDescription>
      <div className="col-start-2 mt-2 flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
        {counts.map(({ key, count, label, action, onAction }) => (
          <div
            key={key}
            className="flex flex-wrap items-center gap-x-3 gap-y-1"
          >
            <span className="text-2xl font-bold">{count}</span>
            <span>{label}</span>
            <Button
              type="button"
              variant="ghost"
              onClick={onAction}
            >
              {action}
            </Button>
          </div>
        ))}
        {summary.acknowledged > 0 ? (
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="text-2xl font-bold">{summary.acknowledged}</span>
            <span>{t("roomWarnings.acknowledgedCount", { count: summary.acknowledged })}</span>
          </div>
        ) : null}
      </div>
    </Alert>
  )
}
