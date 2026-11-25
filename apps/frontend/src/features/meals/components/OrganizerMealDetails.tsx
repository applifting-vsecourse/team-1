import { useState } from "react"
import { useQuery, type UseQueryResult } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { ViewToggleGroup, ViewToggleGroupItem } from "@/components/molecules/ViewToggleGroup"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { mealRosterQueryOptions, type OrganizerMeals } from "@/features/meals/api/meals"

import { OrganizerMealEditor } from "./OrganizerMealEditor"

function status(meals: OrganizerMeals) {
  if (meals.noRestrictions) return "none"
  return meals.selectedOptionIds.length || meals.allergies || meals.specialRequest
    ? "restricted"
    : "missing"
}

function restrictions(meals: OrganizerMeals) {
  return meals.options
    .filter((option) => meals.selectedOptionIds.includes(option.id))
    .map((option) => option.name)
    .join(", ")
}

// Figma: Karta Stravování · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27229-7474
export function OrganizerMealCard({
  eventId,
  query: { data, isPending, error, refetch },
}: {
  eventId: string
  query: UseQueryResult<OrganizerMeals>
}) {
  const { t } = useTranslation("meals")
  if (isPending) return <LoadingState />
  if (error) {
    return (
      <ErrorState
        title={t("own.pageTitle")}
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }
  const state = status(data)
  return (
    <Card className="gap-3 p-4">
      <div className="flex items-center gap-3">
        <h2 className="mr-auto text-xl font-semibold">{t("own.pageTitle")}</h2>
        <Badge variant={state === "missing" ? "warning" : "secondary"}>{t(`edit.${state}`)}</Badge>
        <OrganizerMealEditor
          eventId={eventId}
          meals={data}
        />
      </div>
      {state === "missing" && <p>{t("edit.missingHint")}</p>}
      {restrictions(data) && <p>{restrictions(data)}</p>}
      {data.allergies && (
        <p className="break-words whitespace-pre-line">
          <strong>{t("kitchen.allergiesColumn")}</strong> · {data.allergies}
        </p>
      )}
      {data.specialRequest && (
        <p className="break-words whitespace-pre-line">
          <strong>{t("own.specialRequestLabel")}</strong> · {data.specialRequest}
        </p>
      )}
    </Card>
  )
}

// Figma: Účastníci · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27229-6022 (mobile 27229-6229).
export function OrganizerMealRoster({ eventId, termId }: { eventId: string; termId: string }) {
  const { t } = useTranslation("meals")
  const { data, isPending, error, refetch } = useQuery(mealRosterQueryOptions(eventId, termId))
  const [search, setSearch] = useState("")
  const filters = ["all", "missing", "none", "restricted"] as const
  const [filter, setFilter] = useState<(typeof filters)[number]>("all")
  if (isPending) return <LoadingState />
  if (error) {
    return (
      <ErrorState
        title={t("edit.roster")}
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }
  const matches = data.filter(
    (person) =>
      (filter === "all" || status(person) === filter) &&
      `${person.firstName} ${person.lastName}`
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()),
  )
  return (
    <Card className="gap-4 p-4 print:hidden">
      <h2 className="text-xl font-semibold">
        {t("kitchen.sectionTitle", { title: t("edit.roster"), count: data.length })}
      </h2>
      <Input
        type="search"
        className="max-w-96"
        aria-label={t("edit.search")}
        placeholder={t("edit.search")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <ViewToggleGroup
        aria-label={t("edit.rosterFilter")}
        value={filter}
        onValueChange={(value) => {
          const next = filters.find((key) => key === value)
          if (next) setFilter(next)
        }}
      >
        {filters.map((key) => (
          <ViewToggleGroupItem
            key={key}
            value={key}
          >
            {t(`edit.${key}`)} ·{" "}
            {key === "all" ? data.length : data.filter((person) => status(person) === key).length}
          </ViewToggleGroupItem>
        ))}
      </ViewToggleGroup>
      {matches.length ? (
        <div className="md:-mx-4">
          <Table aria-label={t("edit.roster")}>
            <TableHeader className="bg-action-subtle max-md:sr-only [&_th]:h-10 [&_th]:px-4">
              <TableRow>
                <TableHead>{t("kitchen.participantColumn")}</TableHead>
                <TableHead>{t("kitchen.diet")}</TableHead>
                <TableHead className="text-right">{t("edit.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.map((person) => (
                <TableRow
                  key={person.applicationId}
                  className="max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] md:[&>td]:px-4 md:[&>td]:py-2"
                >
                  <TableCell className="font-medium wrap-anywhere whitespace-normal max-md:pb-0">
                    {person.firstName} {person.lastName}
                  </TableCell>
                  <TableCell className="wrap-anywhere whitespace-normal text-muted-foreground max-md:col-start-1 max-md:row-start-2">
                    {restrictions(person) || t(`edit.${status(person)}`)}
                  </TableCell>
                  <TableCell className="text-right max-md:col-start-2 max-md:row-span-2 max-md:row-start-1 max-md:self-center md:w-24">
                    <OrganizerMealEditor
                      eventId={eventId}
                      meals={person}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p role="status">{t("edit.empty")}</p>
      )}
    </Card>
  )
}
