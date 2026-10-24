import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Ban, MoreHorizontal, Pencil } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { EmptyState } from "@/components/molecules/EmptyState"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { SectionHeader } from "@/components/molecules/SectionHeader"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { formatDateRange } from "@/lib/date"
import { formatTermPrice } from "@/lib/money"
import { cn } from "@/lib/utils"

import { eventQueryOptions } from "@/features/events/api/events"
import { termsQueryOptions, type EventTerm } from "@/features/events/api/terms"
import { CancelTermDialog } from "@/features/events/components/CancelTermDialog"
import { TermFormDialog } from "@/features/events/components/TermFormDialog"

type Dialog =
  { kind: "add" } | { kind: "edit"; term: EventTerm } | { kind: "cancel"; term: EventTerm }

type Change = { kind: "added" | "edited" | "cancelled"; term: EventTerm }

/**
 * O24 / O24a / O24b / O24c: the terms of an event sorted by date, with add, and edit or
 * cancel in each row's menu; a toast confirms what just happened.
 */
// Figma (Design system): O24 Nastavení akce a seznam termínů · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12282-1018
// Figma (Design system): O24a Seznam po přidání · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12282-1888
// Figma (Design system): O24b Seznam po úpravě · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12282-2509
// Figma (Design system): O24c Seznam po zrušení · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12282-3036
export function EventTerms({ eventId }: { eventId: string }) {
  const { t } = useTranslation("events")
  const event = useQuery(eventQueryOptions(eventId))
  const terms = useQuery(termsQueryOptions(eventId))
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [changedId, setChangedId] = useState<string | null>(null)

  const error = event.error ?? terms.error
  if (error) {
    return (
      <ErrorState
        title={t("terms.errorTitle")}
        error={error}
        onRetry={() => {
          void event.refetch()
          void terms.refetch()
        }}
      />
    )
  }
  if (!event.data || !terms.data) return <LoadingState />

  const active = terms.data.filter((term) => !term.cancelledAt)
  const cancelled = terms.data.filter((term) => term.cancelledAt)
  const eventName = event.data.name
  const close = () => setDialog(null)
  const finish = ({ kind, term }: Change) => {
    toast.success(t(`terms.notice.${kind}`, { name: term.name }))
    setChangedId(kind === "cancelled" ? null : term.id)
    close()
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title={t("terms.title")}
        description={t("terms.description")}
        actions={
          <Button
            size="lg"
            onClick={() => setDialog({ kind: "add" })}
          >
            {t("terms.add")}
          </Button>
        }
      />
      <Card className="gap-4 p-6">
        <h3 className="text-lg font-semibold tracking-tight">
          {t("terms.listTitle", { count: active.length })}
        </h3>
        <p className="text-sm text-muted-foreground">{t("terms.listHelper")}</p>
        {active.length === 0 ? (
          <EmptyState message={t("terms.empty")} />
        ) : (
          // Rows: "DS / Term row" https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12279-965
          <ul className="pt-2">
            {active.map((term) => (
              // The term just added or edited keeps the selected surface, as in O24a / O24b.
              <li
                key={term.id}
                className={cn("border-t px-2 py-3", term.id === changedId && "bg-accent/60")}
              >
                <TermRow
                  term={term}
                  onEdit={() => setDialog({ kind: "edit", term })}
                  onCancel={() => setDialog({ kind: "cancel", term })}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>
      {cancelled.length > 0 ? (
        <section className="flex flex-col gap-3 rounded-lg border bg-muted p-6">
          <h3 className="text-lg font-semibold tracking-tight">
            {t("terms.cancelledTitle", { count: cancelled.length })}
          </h3>
          <ul className="flex flex-col gap-1 text-base">
            {cancelled.map((term) => (
              <li key={term.id}>
                {t("terms.cancelledRow", {
                  name: term.name,
                  dates: formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true }),
                })}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">{t("terms.cancelledHelper")}</p>
        </section>
      ) : null}

      {dialog?.kind === "add" || dialog?.kind === "edit" ? (
        <TermFormDialog
          eventId={eventId}
          eventName={eventName}
          term={dialog.kind === "edit" ? dialog.term : null}
          onClose={close}
          onSaved={(kind, saved) => finish({ kind, term: saved })}
          onCancelTerm={(term) => setDialog({ kind: "cancel", term })}
        />
      ) : null}
      {dialog?.kind === "cancel" ? (
        <CancelTermDialog
          eventId={eventId}
          eventName={eventName}
          term={dialog.term}
          onClose={close}
          onCancelled={(term) => finish({ kind: "cancelled", term })}
        />
      ) : null}
    </div>
  )
}

function TermRow({
  term,
  onEdit,
  onCancel,
}: {
  term: EventTerm
  onEdit: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation("events")

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex min-w-48 flex-1 flex-col gap-1">
        <span className="text-sm font-medium tabular-nums">
          {formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })}
        </span>
        <span className="sr-only"> · </span>
        <span className="text-sm text-muted-foreground">
          {term.name} · {formatTermPrice(term.priceCzk)}
        </span>
      </div>
      <TermOccupancy term={term} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={t("terms.actions", { name: term.name })}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil />
            {t("terms.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={onCancel}
          >
            <Ban />
            {t("terms.cancel")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/** Confirmed of the event's beds, with a bar as on the event cards; a dash until there are rooms. */
function TermOccupancy({ term }: { term: EventTerm }) {
  const { t } = useTranslation("events")
  const label =
    term.capacity > 0
      ? t("terms.occupancy", { confirmed: term.confirmedCount, count: term.capacity })
      : t("list.noCapacity")

  return (
    <div className="flex w-full items-center gap-3 sm:w-70">
      <span className="shrink-0 text-sm font-medium tabular-nums">{label}</span>
      {term.capacity > 0 ? (
        <Progress
          value={(term.confirmedCount / term.capacity) * 100}
          aria-label={label}
          className="flex-1"
        />
      ) : null}
    </div>
  )
}
