import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { EmptyState } from "@/components/molecules/EmptyState"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { PageHeader } from "@/components/molecules/PageHeader"
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
import { formatDateRange } from "@/lib/date"

import {
  capacityQueryOptions,
  roomGroups,
  type EventCapacity,
} from "@/features/events/api/capacity"

const genders = ["FEMALE", "MALE"] as const

// Figma (Design system): O08a · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12233-748
export function CapacityPage({
  eventId,
  initialTermId = "",
}: {
  eventId: string
  initialTermId?: string
}) {
  const { t } = useTranslation(["events", "common"])
  const options = capacityQueryOptions(eventId)
  const { data, error, isPending, refetch } = useQuery(options)
  const [selectedId, setSelectedId] = useState(initialTermId)
  const title = t("capacity.title")
  if (isPending) return <LoadingState />
  if (error) {
    return (
      <ErrorState
        title={t("common:pages.error.title")}
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }
  if (data.roomMode === "SHARED") {
    return (
      <div className="flex flex-col gap-6">
        <Seo title={title} />
        <PageHeader
          title={title}
          description={data.eventName}
        />
        <Alert role="status">
          <AlertTitle>{t("capacity.genderedOnlyTitle")}</AlertTitle>
          <AlertDescription>{t("capacity.genderedOnly")}</AlertDescription>
        </Alert>
      </div>
    )
  }
  const selected = data.terms.find((term) => term.termId === selectedId) ?? data.terms[0]
  const dateLabel = (term: EventCapacity["terms"][number]) =>
    formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Seo title={title} />
      <p className="text-xs text-muted-foreground">
        {t("list.title")} / {data.eventName} / {t("capacity.tab")}
      </p>
      <PageHeader
        title={title}
        description={t("capacity.description", { event: data.eventName })}
        actions={
          <Button
            asChild
            size="lg"
          >
            <Link
              to={ROUTES.organizer.eventRooms}
              params={{ eventId }}
            >
              {t("capacity.manage")}
            </Link>
          </Button>
        }
      />
      {selected ? (
        <>
          <div className="flex w-full max-w-100 flex-col gap-2">
            <Label htmlFor="capacity-term">{t("capacity.term")}</Label>
            <Select
              value={selected.termId}
              onValueChange={setSelectedId}
            >
              <SelectTrigger
                id="capacity-term"
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {data.terms.map((term) => (
                  <SelectItem
                    key={term.termId}
                    value={term.termId}
                  >
                    {dateLabel(term)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div
            className="grid gap-6 sm:grid-cols-2"
            aria-live="polite"
          >
            {genders.map((gender) => (
              <Card
                key={gender}
                className="gap-2 px-6"
              >
                <h2 className="text-xs font-medium text-muted-foreground">
                  {t(`capacity.${gender}`)} ·{" "}
                  {t("capacity.bedCapacity", { count: selected.capacity[gender] })}
                </h2>
                <p className="text-4xl font-bold tracking-tight">
                  {selected.capacity[gender] - selected.freePlaces[gender]} /{" "}
                  {selected.capacity[gender]}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("capacity.freeBeds", { count: selected.freePlaces[gender] })}
                  {roomGroups(data.rooms, gender)
                    .map(
                      (group) =>
                        ` · ${t("capacity.roomSummary", { count: group.count, beds: group.capacity })}`,
                    )
                    .join("")}
                </p>
              </Card>
            ))}
          </div>
          <Alert
            role="status"
            className="border-status-info bg-status-info-bg"
          >
            <AlertTitle className="line-clamp-none text-status-info">
              {t("capacity.separate")}
            </AlertTitle>
            <AlertDescription className="text-foreground">
              {t("capacity.confirmedOnly")}{" "}
              {t("capacity.available", {
                women: selected.freePlaces.FEMALE,
                men: selected.freePlaces.MALE,
              })}
            </AlertDescription>
          </Alert>
        </>
      ) : (
        <EmptyState message={t("capacity.noTerms")} />
      )}
      <Card className="gap-4 px-6">
        <h2 className="text-lg font-semibold">{t("capacity.explanationTitle")}</h2>
        <p>{t("capacity.explanation")}</p>
      </Card>
    </div>
  )
}
