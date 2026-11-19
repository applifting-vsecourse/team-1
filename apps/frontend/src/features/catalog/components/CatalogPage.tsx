import { useId } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { HeadingBand } from "@/components/atoms/HeadingBand"
import { LogoSymbol } from "@/components/atoms/Logo"
import { BackLink } from "@/components/molecules/BackLink"
import { ListSkeleton } from "@/components/molecules/ListSkeleton"
import { Pagination } from "@/components/molecules/Pagination"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { EventCard } from "@/features/catalog/components/EventCard"
import { eventsOf, knownOrganizationId } from "@/features/catalog/lib/catalog"

const ALL = "all"
const CONTENT = "mx-auto w-full max-w-300 px-4 md:px-6"

type CatalogPageProps = {
  /** The chosen organization; without one, all events are listed. */
  organizationId?: string
  onOrganizationChange: (organizationId: string | undefined) => void
}

// Figma v2 · public catalog · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22640-12072 (mobile 22640-12173).
// US-123. Organization and event are a step-by-step choice on one page: the select narrows the cards.
// Figma (Design system): Katalog akcí · Katalog organizací · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16146-10083
// Akce organizace · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16146-10135
// Katalog prázdný · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16146-10267
// Načítání katalogu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16146-10309
// Chyba katalogu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16146-10371
// Mobil: 16146-10109, 16146-10165, 16146-10288, 16146-10340, 16146-10399
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
    <>
      <section
        className={cn(
          CONTENT,
          "pt-4 [--workspace-inset:1rem] md:pt-8 md:[--workspace-inset:1.5rem]",
        )}
      >
        <HeadingBand>
          <BackLink to={selectedOrganization ? ROUTES.catalog : ROUTES.home}>
            {t(selectedOrganization ? "event.back" : "list.backHome")}
          </BackLink>
          <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">
            {selectedOrganization?.name ?? t("list.title")}
          </h1>
          {selectedOrganization ? null : (
            <p className="mt-3 text-muted-foreground">{t("list.description")}</p>
          )}
        </HeadingBand>
      </section>

      <div className={cn(CONTENT, "flex flex-col gap-6 pt-8 pb-12 md:pt-12 md:pb-20")}>
        {isPending ? <ListSkeleton label={t("list.loading")} /> : null}

        {isError ? (
          <Alert variant="destructive">
            <TriangleAlert aria-hidden />
            <AlertTitle>{t("list.errorTitle")}</AlertTitle>
            <AlertDescription>{t("list.errorDescription")}</AlertDescription>
          </Alert>
        ) : null}

        {isEmpty ? (
          <div className="flex flex-col items-center gap-4 p-6 text-center">
            <LogoSymbol className="size-14 text-primary" />
            <h2 className="text-2xl/8 font-bold tracking-tight">{t("list.emptyTitle")}</h2>
            <p className="text-muted-foreground">{t("list.emptyDescription")}</p>
          </div>
        ) : null}

        {select}

        {isError ? (
          <Button
            size="lg"
            className="w-full md:w-55"
            onClick={() => void refetch()}
          >
            {t("list.retry")}
          </Button>
        ) : null}

        {data && !isEmpty ? (
          <>
            {groups.map((org) => (
              <section
                key={org.id}
                className="flex flex-col gap-4"
              >
                {selectedOrganization ? null : (
                  <div className="flex items-center justify-between gap-3">
                    <h2>
                      <Button
                        variant="ghost"
                        asChild
                        className="h-12 max-w-full whitespace-normal"
                      >
                        <Link
                          to={ROUTES.catalog}
                          search={{ organization: org.id }}
                        >
                          {org.name}
                        </Link>
                      </Button>
                    </h2>
                    <Badge className="bg-muted-foreground text-background tabular-nums">
                      {t("list.eventCount", { count: totals.get(org.id) ?? 0 })}
                    </Badge>
                  </div>
                )}
                <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),22.5rem))] gap-6">
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
    </>
  )
}
