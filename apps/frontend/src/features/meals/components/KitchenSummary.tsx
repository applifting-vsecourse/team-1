import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/atoms/BackLink"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { PageHeader } from "@/components/molecules/PageHeader"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate, formatTime } from "@/lib/date"
import { termLine } from "@/lib/term-label"

import { kitchenSummaryQueryOptions, type KitchenTerm } from "@/features/meals/api/meals"

/** Keep all the kitchen's notes for the same application together, also for namesakes. */
function participantNotes(term: KitchenTerm) {
  const people = new Map<
    string,
    {
      applicationId: string
      firstName: string
      lastName: string
      allergies?: string
      specialRequest?: string
      lateArrival?: string | null
      earlyDeparture?: string | null
    }
  >()
  for (const entry of [...term.allergies, ...term.specialRequests, ...term.stays]) {
    people.set(entry.applicationId, { ...people.get(entry.applicationId), ...entry })
  }
  return Array.from(people.values())
}

const when = (wall: string) => `${formatDate(wall)} ${formatTime(wall)}`

// Figma v2 · US-143 · Desktop 24969:10806 and mobile 24969:12256.
export function KitchenSummary({ eventId, eventName }: { eventId: string; eventName?: string }) {
  const { t } = useTranslation("meals")
  const { data, isPending, error, refetch } = useQuery(kitchenSummaryQueryOptions(eventId))
  const [termId, setTermId] = useState<string | null>(null)

  if (isPending) return <LoadingState />
  if (error) {
    return (
      <ErrorState
        title={t("kitchen.title")}
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }

  const term = data.find((entry) => entry.termId === termId) ?? data[0]

  return (
    <section
      className="flex min-w-0 flex-col gap-6"
      data-print-area
    >
      <div className="self-start print:hidden">
        <BackLink
          to={ROUTES.organizer.event}
          params={{ eventId }}
        >
          {t("kitchen.back")}
        </BackLink>
      </div>
      <PageHeader
        title={t("kitchen.title")}
        description={eventName ? t("kitchen.description", { event: eventName }) : undefined}
      />
      {term ? (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex w-full flex-col gap-2 sm:max-w-[560px]">
              <Label htmlFor="meal-term">{t("kitchen.termLabel")}</Label>
              <Select
                value={term.termId}
                onValueChange={setTermId}
              >
                <SelectTrigger
                  id="meal-term"
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {data.map((entry) => (
                    <SelectItem
                      key={entry.termId}
                      value={entry.termId}
                    >
                      {termLine(entry)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="lg"
              className="w-full shrink-0 sm:w-auto print:hidden"
              onClick={() => window.print()}
            >
              {t("kitchen.print")}
            </Button>
          </div>
          <Card className="gap-3 p-4">
            <h2 className="text-2xl font-bold tabular-nums">
              {t("kitchen.confirmed", { count: term.total })}
            </h2>
            <p>{t("kitchen.countNote")}</p>
          </Card>
          <Card className="min-w-0 gap-4 p-4">
            <h2 className="text-2xl font-bold">{t("kitchen.countsTitle")}</h2>
            <Table aria-label={t("kitchen.countsTitle")}>
              <TableHeader className="max-sm:sr-only">
                <TableRow>
                  <TableHead>{t("kitchen.diet")}</TableHead>
                  <TableHead className="text-right">{t("kitchen.portions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { id: "regular", name: t("kitchen.regular"), count: term.regular },
                  ...term.options,
                ].map((option) => (
                  <TableRow
                    key={option.id}
                    className="max-sm:border-0"
                  >
                    <TableCell className="py-3 whitespace-normal">{option.name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className="max-sm:inline-block max-sm:min-w-7 max-sm:rounded-full max-sm:bg-secondary-foreground max-sm:px-2 max-sm:py-1 max-sm:text-secondary">
                        {option.count}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p>{t("kitchen.overlapNote")}</p>
          </Card>
          <Card className="min-w-0 gap-4 p-4">
            <h2 className="text-2xl font-bold">{t("kitchen.allergiesTitle")}</h2>
            <Table aria-label={t("kitchen.allergiesTitle")}>
              <TableHeader className="max-sm:sr-only">
                <TableRow>
                  <TableHead>{t("kitchen.person")}</TableHead>
                  <TableHead>{t("kitchen.notes")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participantNotes(term).map((person) => (
                  <TableRow
                    key={person.applicationId}
                    className="max-sm:flex max-sm:flex-col max-sm:border-0"
                  >
                    <TableCell className="align-top font-medium break-words whitespace-normal max-sm:text-lg">
                      {person.firstName} {person.lastName}
                    </TableCell>
                    <TableCell className="space-y-1 break-words whitespace-pre-line">
                      {person.allergies && <p>{person.allergies}</p>}
                      {person.specialRequest && <p>{person.specialRequest}</p>}
                      {person.lateArrival && (
                        <p>{t("kitchen.arrival", { when: when(person.lateArrival) })}</p>
                      )}
                      {person.earlyDeparture && (
                        <p>{t("kitchen.departure", { when: when(person.earlyDeparture) })}</p>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      ) : null}
      <Button
        asChild
        variant="ghost"
        size="lg"
        className="self-start print:hidden"
      >
        <Link
          to={ROUTES.organizer.eventMealOptions}
          params={{ eventId }}
        >
          {t("kitchen.setUpOptions")}
        </Link>
      </Button>
    </section>
  )
}
