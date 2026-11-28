import { useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { format } from "date-fns"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import Empty from "@/assets/illustrations/empty.svg?react"
import Loading from "@/assets/illustrations/loading.svg?react"
import { BrandPageHeader } from "@/components/molecules/BrandPageHeader"
import { EmptyState } from "@/components/molecules/EmptyState"
import { Pagination } from "@/components/molecules/Pagination"
import { TaskCard } from "@/components/molecules/TaskCard"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePagination } from "@/hooks/usePagination"
import { formatDate, formatDateRange } from "@/lib/date"
import { formatCzk } from "@/lib/money"
import { termTitle } from "@/lib/term-label"

import {
  myApplicationsQueryOptions,
  type MyApplication,
} from "@/features/participant/api/applications"
import { ApplicationRow } from "@/features/participant/components/ApplicationRow"
import { paymentTask } from "@/features/participant/lib/payment-task"

type ApplicationListProps = {
  /** The badge with new posts of an application (US-91); a route composes it, as features do not import each other. */
  renderBoardBadge?: (applicationId: string) => ReactNode
}

type View = "upcoming" | "past"

/** Over once every term is archived or has ended: terms are archived the day after they end (D-110). */
const isPast = (application: MyApplication, today: string) =>
  application.terms.every(({ status, endsOn }) => status === "ARCHIVED" || endsOn < today)

const isCancelled = (application: MyApplication) =>
  application.terms.every(({ status }) => status === "CANCELLED")

/**
 * All applications under the signed-in account, upcoming or past, grouped by event: the page head
 * with the view tabs, one to-do card per application with something to pay, then one card per event.
 * Applications cancelled in every term wait behind a button. Loading, empty and error are drawn here (DESIGN.md).
 */
// Figma (Design system v2): US-54 / Moje přihlášky · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15649-2 (360 px: node-id=15649-122)
// Figma (Design system v2): empty 15649-449, error 27647-35149, loading 27647-34812, past 27647-35438
export function ApplicationList({ renderBoardBadge }: ApplicationListProps) {
  const { t } = useTranslation("participant")
  const { data, isPending, error, refetch } = useQuery(myApplicationsQueryOptions())
  const [view, setView] = useState<View>("upcoming")
  const title = t("applications.title")

  if (data?.length === 0) {
    return (
      <>
        <BrandPageHeader
          title={title}
          isIllustrationBesideTitle
        />
        <EmptyState
          className="mx-auto w-full max-w-102"
          title={t("list.emptyTitle")}
          message={t("list.emptyDescription")}
          illustration={<Empty className="w-60" />}
          action={
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full"
            >
              <Link to={ROUTES.catalog}>{t("list.findEvent")}</Link>
            </Button>
          }
        />
      </>
    )
  }

  const today = format(new Date(), "yyyy-MM-dd")
  const content = isPending ? (
    <ListSkeleton />
  ) : error ? (
    <EmptyState
      role="alert"
      className="mx-auto w-full max-w-102"
      title={t("list.errorTitle")}
      illustration={<Loading className="w-60" />}
      action={
        <Button
          size="lg"
          className="w-full"
          onClick={() => void refetch()}
        >
          {t("list.retry")}
        </Button>
      }
    />
  ) : (
    <Applications
      key={view}
      applications={data.filter((application) => isPast(application, today) === (view === "past"))}
      emptyText={t(view === "past" ? "list.pastEmpty" : "list.upcomingEmpty")}
      renderBoardBadge={renderBoardBadge}
    />
  )

  return (
    <Tabs
      value={view}
      onValueChange={(value) => setView(value as View)}
      className="gap-8"
    >
      <BrandPageHeader
        title={title}
        isIllustrationBesideTitle
        actions={
          <TabsList>
            <TabsTrigger value="upcoming">{t("list.upcoming")}</TabsTrigger>
            <TabsTrigger value="past">{t("list.past")}</TabsTrigger>
          </TabsList>
        }
      />
      <TabsContent
        value={view}
        className="flex flex-col gap-8"
      >
        {content}
      </TabsContent>
    </Tabs>
  )
}

function Applications({
  applications,
  emptyText,
  renderBoardBadge,
}: {
  applications: MyApplication[]
  emptyText: string
  renderBoardBadge?: (applicationId: string) => ReactNode
}) {
  const { t } = useTranslation("participant")
  const [isShowingCancelled, setIsShowingCancelled] = useState(false)
  const cancelledCount = applications.filter(isCancelled).length
  const shown = isShowingCancelled
    ? applications
    : applications.filter((application) => !isCancelled(application))
  const { pageItems, ...pagination } = usePagination(shown)
  const groups = new Map<string, [MyApplication, ...MyApplication[]]>()
  for (const application of pageItems) {
    const key = application.eventId ?? application.id
    const group = groups.get(key)
    if (group) group.push(application)
    else groups.set(key, [application])
  }

  return (
    <>
      {shown.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">{emptyText}</p>
      ) : null}
      {pageItems.map((application) => {
        const task = paymentTask(application)
        if (!task) return null
        return (
          <TaskCard
            key={application.id}
            role="note"
            className="md:flex-row md:items-center md:gap-4"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="font-semibold">
                {t("list.remainingAmount", { amount: formatCzk(task.amountCzk) })}
              </p>
              <p className="text-sm text-muted-foreground">
                {[
                  `${application.firstName} ${application.lastName}`,
                  ...task.terms.map(termTitle),
                  task.deadline ? t("list.dueOn", { date: formatDate(task.deadline) }) : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <Button
              asChild
              className="w-55 max-w-full"
            >
              <Link
                to={ROUTES.participant.application}
                params={{ applicationId: application.id }}
              >
                {t("list.paymentDetails")}
              </Link>
            </Button>
          </TaskCard>
        )
      })}
      {Array.from(groups, ([id, group]) => {
        const terms = group.flatMap((application) => application.terms)
        const startsOn = terms.map((term) => term.startsOn).sort()[0]
        const endsOn = terms
          .map((term) => term.endsOn)
          .sort()
          .at(-1)
        return (
          <section
            key={id}
            aria-labelledby={`event-${id}`}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-0.5">
              <h2
                id={`event-${id}`}
                className="text-xl font-semibold"
              >
                {group[0].eventName}
              </h2>
              <p className="text-sm text-muted-foreground">
                {[
                  group[0].organizationContact.name,
                  startsOn && endsOn
                    ? formatDateRange(startsOn, endsOn, { shouldShowYear: true })
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <Card className="gap-0 divide-y divide-border overflow-hidden p-0">
              {group.map((application) => (
                <ApplicationRow
                  key={application.id}
                  application={application}
                  boardBadge={renderBoardBadge?.(application.id)}
                />
              ))}
            </Card>
          </section>
        )
      })}
      <Pagination
        {...pagination}
        onPageChange={pagination.setPage}
      />
      {cancelledCount > 0 ? (
        <Button
          variant="ghost"
          className="self-start"
          aria-expanded={isShowingCancelled}
          onClick={() => setIsShowingCancelled((isShowing) => !isShowing)}
        >
          {t(isShowingCancelled ? "list.hideCancelled" : "list.showCancelled", {
            count: cancelledCount,
          })}
        </Button>
      ) : null}
    </>
  )
}

/** The shape of the list while it loads: two events of two rows (Figma 27647:34812). */
function ListSkeleton() {
  const { t } = useTranslation()
  return (
    <div
      role="status"
      className="flex flex-col gap-8"
    >
      <span className="sr-only">{t("state.loading")}</span>
      {[0, 1].map((group) => (
        <div
          key={group}
          aria-hidden="true"
          className="flex flex-col gap-3"
        >
          <Skeleton className="h-5 w-65 max-w-full" />
          <Skeleton className="h-3 w-45 max-w-full" />
          <Card className="gap-0 divide-y divide-border p-0">
            {[0, 1].map((row) => (
              <div
                key={row}
                className="flex items-center gap-4 px-4 py-4"
              >
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-3.5 w-35" />
                  <Skeleton className="h-3 w-18" />
                </div>
                <Skeleton className="hidden h-7 w-22 md:block" />
                <Skeleton className="hidden h-3 w-24 md:block" />
              </div>
            ))}
          </Card>
        </div>
      ))}
    </div>
  )
}
