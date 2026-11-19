import { useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { CardColumns } from "@/components/molecules/CardGrid"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { PageHeader } from "@/components/molecules/PageHeader"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
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
import { cn } from "@/lib/utils"

import { kitchenSummaryQueryOptions } from "@/features/meals/api/meals"

/**
 * Meal counts and allergies of the participants confirmed in one term, printable for the kitchen.
 * Only what is inside `data-print-area` is printed (see `global.css`).
 */
// Figma (Design system): #64 / Souhrn pro kuchyni / Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-12002 (360 px: node-id=19795-12163)
/** `13. 7. 2027 10:30` — the wall time as the participant entered it. */
const when = (wall: string) => `${formatDate(wall)} ${formatTime(wall)}`

/** A small table inside a section: the header row names the columns, the cells wrap on a phone. */
function KitchenTable({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {head.map((label) => (
            <TableHead key={label}>{label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  )
}

/**
 * One collapsible section of the summary: open by default, collapsed per view only. In print it is
 * always open and has no chevron (the closed content is hidden by a class, so print can undo it).
 */
function KitchenSection({
  title,
  count,
  className,
  children,
}: {
  title: string
  count?: number
  className?: string
  children: ReactNode
}) {
  const { t } = useTranslation("meals")

  return (
    <Card
      className={cn(
        "gap-0 p-0 [&_[data-slot=accordion-content][data-state=closed]]:hidden print:[&_[data-slot=accordion-content][data-state=closed]]:block print:[&_[data-slot=accordion-trigger]>svg]:hidden",
        className,
      )}
    >
      <Accordion
        type="multiple"
        defaultValue={["section"]}
      >
        <AccordionItem
          value="section"
          className="border-b-0"
        >
          <AccordionTrigger className="min-h-11 items-center px-4 text-2xl font-bold hover:no-underline [&>svg]:size-5 [&>svg]:translate-y-0 [&>svg]:text-foreground">
            {count === undefined ? title : t("kitchen.sectionTitle", { title, count })}
          </AccordionTrigger>
          <AccordionContent
            className="flex flex-col gap-4 px-4 text-base"
            forceMount
          >
            {children}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  )
}

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
      className="flex flex-col gap-6"
      data-print-area
    >
      <PageHeader
        title={t("kitchen.title")}
        description={eventName ? t("kitchen.description", { event: eventName }) : undefined}
      />
      {term ? (
        <>
          <div className="flex flex-col gap-2 sm:max-w-96">
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
          {/* Left: counts, requests. Right: allergies (long list), arrivals and departures. One column below lg: counts, allergies, requests, stays. */}
          <CardColumns
            left={
              <>
                <KitchenSection
                  title={t("kitchen.countsTitle")}
                  count={term.total}
                  className="order-1 lg:order-none print:order-1"
                >
                  <KitchenTable head={[t("kitchen.optionColumn"), t("kitchen.countColumn")]}>
                    <TableRow>
                      <TableCell>{t("kitchen.regular")}</TableCell>
                      <TableCell>{term.regular}</TableCell>
                    </TableRow>
                    {term.options.map((option) => (
                      <TableRow key={option.id}>
                        <TableCell className="break-words whitespace-normal">
                          {option.name}
                        </TableCell>
                        <TableCell>{option.count}</TableCell>
                      </TableRow>
                    ))}
                  </KitchenTable>
                  <p className="text-muted-foreground">{t("kitchen.overlapNote")}</p>
                </KitchenSection>
                {term.specialRequests.length > 0 ? (
                  <KitchenSection
                    title={t("kitchen.specialRequestsTitle")}
                    count={term.specialRequests.length}
                    className="order-3 lg:order-none print:order-3"
                  >
                    <KitchenTable head={[t("kitchen.nameColumn"), t("kitchen.requestColumn")]}>
                      {term.specialRequests.map((entry) => (
                        <TableRow key={entry.applicationId}>
                          <TableCell className="whitespace-normal">
                            {entry.firstName} {entry.lastName}
                          </TableCell>
                          <TableCell className="break-words whitespace-pre-line">
                            {entry.specialRequest}
                          </TableCell>
                        </TableRow>
                      ))}
                    </KitchenTable>
                  </KitchenSection>
                ) : null}
              </>
            }
            right={
              <>
                <KitchenSection
                  title={t("kitchen.allergiesTitle")}
                  count={term.allergies.length}
                  className="order-2 lg:order-none print:order-2"
                >
                  {term.allergies.length > 0 ? (
                    <KitchenTable head={[t("kitchen.nameColumn"), t("kitchen.allergiesColumn")]}>
                      {term.allergies.map((entry) => (
                        <TableRow key={entry.applicationId}>
                          <TableCell className="whitespace-normal">
                            {entry.firstName} {entry.lastName}
                          </TableCell>
                          <TableCell className="break-words whitespace-pre-line">
                            {entry.allergies}
                          </TableCell>
                        </TableRow>
                      ))}
                    </KitchenTable>
                  ) : null}
                </KitchenSection>
                {term.stays.length > 0 ? (
                  // Figma (Design system v2): US-143 Organizátor · Souhrn pro kuchyni · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=24969-10806 (mobile 24969-12256)
                  <KitchenSection
                    title={t("kitchen.staysTitle")}
                    count={term.stays.length}
                    className="order-4 lg:order-none print:order-4"
                  >
                    <KitchenTable
                      head={[
                        t("kitchen.nameColumn"),
                        t("kitchen.arrivalColumn"),
                        t("kitchen.departureColumn"),
                      ]}
                    >
                      {term.stays.map((entry) => (
                        <TableRow key={entry.applicationId}>
                          <TableCell className="whitespace-normal">
                            {entry.firstName} {entry.lastName}
                          </TableCell>
                          <TableCell className="whitespace-normal">
                            {entry.lateArrival ? when(entry.lateArrival) : "–"}
                          </TableCell>
                          <TableCell className="whitespace-normal">
                            {entry.earlyDeparture ? when(entry.earlyDeparture) : "–"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </KitchenTable>
                  </KitchenSection>
                ) : null}
              </>
            }
          />
        </>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row print:hidden">
        {term ? (
          <Button
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => window.print()}
          >
            {t("kitchen.print")}
          </Button>
        ) : null}
        <Button
          asChild
          variant="ghost"
          size="lg"
          className="w-full sm:w-auto"
        >
          <Link
            to={ROUTES.organizer.eventMealOptions}
            params={{ eventId }}
          >
            {t("kitchen.setUpOptions")}
          </Link>
        </Button>
      </div>
    </section>
  )
}
