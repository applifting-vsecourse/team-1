import { useId } from "react"
import { useQuery } from "@tanstack/react-query"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import CampIllustration from "@/assets/illustrations/camp.svg?react"
import { BandBackdrop } from "@/components/atoms/BandBackdrop"
import { LogoSymbol } from "@/components/atoms/Logo"
import { BackLink } from "@/components/molecules/BackLink"
import { Pagination } from "@/components/molecules/Pagination"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
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
  const isEmpty = data?.events.length === 0
  const { pageItems, ...pagination } = usePagination(events, organization ?? ALL, 18)

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
      <section className="relative overflow-hidden">
        <BandBackdrop />
        <div className={cn(CONTENT, "relative flex flex-col gap-6 pt-4 pb-16 md:pt-8 lg:pb-24")}>
          <BackLink to={ROUTES.home}>{t("list.backHome")}</BackLink>
          <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto] lg:gap-12">
            <div className="flex flex-col gap-3">
              <h1 className="text-4xl/11 font-bold tracking-tight md:text-5xl/14">
                {t("list.title")}
              </h1>
              <p className="max-w-lg text-muted-foreground md:text-lg">{t("list.description")}</p>
            </div>
            <CampIllustration
              aria-hidden
              className="hidden h-44 w-auto lg:block"
            />
          </div>
        </div>
      </section>

      <div className={cn(CONTENT, "flex flex-col gap-6 pt-8 pb-12 md:pt-12 md:pb-20")}>
        {isPending ? (
          <Card
            role="status"
            className="max-w-160 gap-4 p-6 shadow-none"
          >
            {[0, 1, 2].map((row) => (
              <div
                key={row}
                className="flex items-center gap-3"
              >
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-4 w-full rounded-lg" />
                  <Skeleton className="h-3 w-full rounded-lg" />
                </div>
              </div>
            ))}
            <p className="text-sm text-muted-foreground">{t("list.loading")}</p>
          </Card>
        ) : null}

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
            <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pageItems.map((event) => (
                <li key={event.publicToken}>
                  <EventCard event={event} />
                </li>
              ))}
            </ul>
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
