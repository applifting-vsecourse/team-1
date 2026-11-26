import { useId } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import Empty from "@/assets/illustrations/empty.svg?react"
import Loading from "@/assets/illustrations/loading.svg?react"
import { BackLink } from "@/components/molecules/BackLink"
import { EmptyState } from "@/components/molecules/EmptyState"
import { Pagination } from "@/components/molecules/Pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { usePagination } from "@/hooks/usePagination"
import { cn } from "@/lib/utils"

import { catalogQueryOptions } from "@/features/catalog/api/catalog"
import { CatalogSkeleton } from "@/features/catalog/components/CatalogSkeleton"
import { EventCard } from "@/features/catalog/components/EventCard"
import { eventsOf, knownOrganizationId } from "@/features/catalog/lib/catalog"

const ALL = "all"
const CONTENT = "mx-auto w-full max-w-299 px-4 md:px-12"

type CatalogPageProps = {
  /** The chosen organization; without one, all events are listed. */
  organizationId?: string
  onOrganizationChange: (organizationId: string | undefined) => void
}

// Figma (Design system v2): Katalog · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22640-12072 (mobile 22640-12173)
// Organization 19404-4476 / 19404-4536, loading 19404-4933, empty 27422-16549, error 27422-16611.
// US-123. Organization and event are a step-by-step choice on one page: the select narrows the cards
// (Figma draws a search field instead; the select stays until #366).
export function CatalogPage({ organizationId, onOrganizationChange }: CatalogPageProps) {
  const { t } = useTranslation("catalog")
  const selectId = useId()
  const { data, isPending, isError, refetch } = useQuery(catalogQueryOptions())

  const organization = data ? knownOrganizationId(data, organizationId) : undefined
  const events = data ? eventsOf(data, organization) : []
  const selectedOrganization = data?.organizations.find((org) => org.id === organization)
  const isEmpty = data?.events.length === 0
  const { pageItems, ...pagination } = usePagination(events, organization ?? ALL, 18)

  const totals = new Map<string, number>()
  for (const event of events) {
    totals.set(event.organizationId, (totals.get(event.organizationId) ?? 0) + 1)
  }
  const groups = (data?.organizations ?? [])
    .map((org) => ({
      ...org,
      events: pageItems.filter((event) => event.organizationId === org.id),
    }))
    .filter((org) => org.events.length > 0)

  const select = (
    <div className="flex w-full flex-col gap-2 md:w-82">
      <Label htmlFor={selectId}>{t("list.organization")}</Label>
      <Select
        value={organization ?? ALL}
        onValueChange={(value) => onOrganizationChange(value === ALL ? undefined : value)}
      >
        <SelectTrigger
          id={selectId}
          className="w-full"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("list.allOrganizations")}</SelectItem>
          {data?.organizations.map((item) => (
            <SelectItem
              key={item.id}
              value={item.id}
            >
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <div className={cn(CONTENT, "flex flex-col gap-6 pt-6 pb-12 md:pt-8")}>
      <header className="flex flex-col items-start gap-3">
        {selectedOrganization ? (
          <BackLink to={ROUTES.catalog}>{t("event.back")}</BackLink>
        ) : (
          <BackLink to={ROUTES.home}>{t("list.back")}</BackLink>
        )}
        <h1 className="text-2xl font-bold tracking-tight wrap-anywhere md:text-[32px]/10">
          {selectedOrganization?.name ?? t("list.title")}
        </h1>
      </header>

      {isPending ? <CatalogSkeleton /> : null}

      {isError ? (
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
      ) : null}

      {isEmpty ? (
        <EmptyState
          title={t("list.emptyTitle")}
          message={t("list.emptyDescription")}
          illustration={<Empty className="w-60" />}
          className="mx-auto w-full max-w-102"
        />
      ) : null}

      {data && !isEmpty ? (
        <>
          {select}
          {groups.map((org) => (
            <section
              key={org.id}
              className="flex flex-col gap-3"
            >
              {selectedOrganization ? null : (
                <div className="flex items-center gap-2">
                  <h2 className="text-lg/6.5 font-semibold tracking-tight">
                    <Link
                      to={ROUTES.catalog}
                      search={{ organization: org.id }}
                      className="hover:underline"
                    >
                      {org.name}
                    </Link>
                  </h2>
                  <Badge className="bg-muted-foreground text-background tabular-nums">
                    {t("list.eventCount", { count: totals.get(org.id) ?? 0 })}
                  </Badge>
                </div>
              )}
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-4 md:gap-6">
                {org.events.map((event) => (
                  <li key={event.publicToken}>
                    <EventCard event={event} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <Pagination
            {...pagination}
            onPageChange={pagination.setPage}
          />
        </>
      ) : null}
    </div>
  )
}
