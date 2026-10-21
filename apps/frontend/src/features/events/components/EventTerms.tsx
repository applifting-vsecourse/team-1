import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { EmptyState } from "@/components/molecules/EmptyState"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { PageHeader } from "@/components/molecules/PageHeader"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatDateRange } from "@/lib/date"
import { formatCzk } from "@/lib/money"

import { eventQueryOptions } from "@/features/events/api/events"
import { termsQueryOptions, type EventTerm } from "@/features/events/api/terms"
import { CancelTermDialog } from "@/features/events/components/CancelTermDialog"
import { TermFormDialog } from "@/features/events/components/TermFormDialog"

type Dialog =
  { kind: "add" } | { kind: "edit"; term: EventTerm } | { kind: "cancel"; term: EventTerm }

type Notice = { kind: "added" | "edited" | "cancelled"; name: string }

/**
 * O24 / O24a / O24b / O24c: the terms of an event sorted by date, with add, edit and cancel,
 * and a confirmation of what just happened.
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
  const [notice, setNotice] = useState<Notice | null>(null)

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
  const finish = (next: Notice) => {
    setNotice(next)
    close()
  }

  return (
    <div className="flex flex-col gap-6">
      <nav
        aria-label={t("terms.title")}
        className="text-xs font-medium text-muted-foreground"
      >
        <Link
          to={ROUTES.organizer.events}
          className="hover:underline"
        >
          {t("breadcrumb.events")}
        </Link>{" "}
        / {event.data.organizationName} / {eventName} / {t("terms.title")}
      </nav>
      <PageHeader
        title={t("terms.title")}
        description={t("terms.description")}
        actions={
          <Button
            size="lg"
            onClick={() => {
              setNotice(null)
              setDialog({ kind: "add" })
            }}
          >
            {t("terms.add")}
          </Button>
        }
      />
      {notice ? (
        <p
          role="status"
          className="rounded-lg border border-status-success bg-status-success-bg px-5 py-4 text-status-success"
        >
          {t(`terms.notice.${notice.kind}`, { name: notice.name })}
        </p>
      ) : null}
      <Card className="gap-4 p-6">
        <h2 className="text-lg font-semibold tracking-tight">
          {t("terms.listTitle", { count: active.length })}
        </h2>
        <p className="text-sm text-muted-foreground">{t("terms.listHelper")}</p>
        {active.length === 0 ? (
          <EmptyState message={t("terms.empty")} />
        ) : (
          <ul className="flex flex-col gap-4">
            {active.map((term) => (
              <li key={term.id}>
                <TermRow
                  term={term}
                  onEdit={() => {
                    setNotice(null)
                    setDialog({ kind: "edit", term })
                  }}
                  onCancel={() => {
                    setNotice(null)
                    setDialog({ kind: "cancel", term })
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>
      {cancelled.length > 0 ? (
        <section className="flex flex-col gap-3 rounded-lg border bg-muted p-6">
          <h2 className="text-lg font-semibold tracking-tight">{t("terms.cancelledTitle")}</h2>
          <ul className="flex flex-col gap-1">
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
          onSaved={(kind, saved) => finish({ kind, name: saved.name })}
          onCancelTerm={(term) => setDialog({ kind: "cancel", term })}
        />
      ) : null}
      {dialog?.kind === "cancel" ? (
        <CancelTermDialog
          eventId={eventId}
          eventName={eventName}
          term={dialog.term}
          onClose={close}
          onCancelled={(term) => finish({ kind: "cancelled", name: term.name })}
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
    <div className="flex flex-wrap items-center gap-4 rounded-md border p-4">
      <div className="flex min-w-48 flex-1 flex-col gap-2">
        <h3 className="text-lg font-semibold tracking-tight">{term.name}</h3>
        <p className="text-sm text-muted-foreground">
          {formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })}
        </p>
        <p className="flex gap-4 text-sm text-muted-foreground">
          <span>{t("terms.capacity", { count: term.capacity })}</span>
          <span>{formatCzk(term.priceCzk)}</span>
        </p>
      </div>
      <Button
        variant="outline"
        size="lg"
        onClick={onEdit}
      >
        {t("terms.edit")}
      </Button>
      <Button
        variant="ghost"
        size="lg"
        onClick={onCancel}
      >
        {t("terms.cancel")}
      </Button>
    </div>
  )
}
