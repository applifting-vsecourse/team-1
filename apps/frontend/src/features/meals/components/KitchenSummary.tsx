import { useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { CardGrid } from "@/components/molecules/CardGrid"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { SectionHeader } from "@/components/molecules/SectionHeader"
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

import { kitchenSummaryQueryOptions, type KitchenTerm } from "@/features/meals/api/meals"

import { OrganizerMealRoster } from "./OrganizerMealDetails"

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

/** `13. 7. 2027 10:30` — the wall time as the participant entered it. */
const when = (wall: string) => `${formatDate(wall)} ${formatTime(wall)}`

/** A small table inside a section: the header row names the columns, the cells wrap on a phone. */
function KitchenTable({
  head,
  isLastRight = false,
  children,
}: {
  head: string[]
  /** The last column holds numbers, aligned right. */
  isLastRight?: boolean
  children: ReactNode
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {head.map((label, index) => (
            <TableHead
              key={label}
              className={cn(
                isLastRight && "md:h-14 md:px-4",
                isLastRight && index === head.length - 1 && "text-right",
              )}
            >
              {label}
            </TableHead>
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

// Figma v2: US-143 souhrn pro kuchyni · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=24969-10806 (mobile 24969-12256).
function ParticipantNotes({ term }: { term: KitchenTerm }) {
  const { t } = useTranslation("meals")
  const people = participantNotes(term)
  return (
    <KitchenSection title={t("kitchen.participantNotesTitle")}>
      {people.length > 0 && (
        <Table aria-label={t("kitchen.participantNotesTitle")}>
          <TableHeader className="max-sm:sr-only">
            <TableRow>
              <TableHead>{t("kitchen.personDiet")}</TableHead>
              <TableHead>{t("kitchen.notes")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {people.map((person) => (
              <TableRow
                key={person.applicationId}
                className="max-sm:flex max-sm:flex-col max-sm:border-0"
              >
                <TableCell className="align-top font-medium wrap-anywhere whitespace-normal max-sm:text-lg">
                  {person.firstName} {person.lastName}
                </TableCell>
                <TableCell className="space-y-1 text-sm wrap-anywhere whitespace-pre-line text-muted-foreground">
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
      )}
    </KitchenSection>
  )
}

export function KitchenSummary({ eventId }: { eventId: string }) {
  const { t } = useTranslation("meals")
  const { data, isPending, error, refetch } = useQuery(kitchenSummaryQueryOptions(eventId))
  const [termId, setTermId] = useState<string | null>(null)

  // The merged table per participant is the drawn default (24969-10806); by category stays a choice.
  const [view, setView] = useState("participant")
  const isByParticipant = view === "participant"

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
      <SectionHeader title={t("kitchen.title")} />
      {term ? (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="grid flex-1 gap-4 sm:max-w-196 sm:grid-cols-2">
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
              <div className="flex flex-col gap-2 sm:max-w-96 print:hidden">
                <Label htmlFor="kitchen-view">{t("kitchen.viewLabel")}</Label>
                <Select
                  value={view}
                  onValueChange={setView}
                >
                  <SelectTrigger
                    id="kitchen-view"
                    className="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="edit">{t("edit.view")}</SelectItem>
                    <SelectItem value="category">{t("kitchen.bySection")}</SelectItem>
                    <SelectItem value="participant">{t("kitchen.byParticipant")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              className="sm:ml-auto print:hidden"
              onClick={() => window.print()}
            >
              {t("kitchen.print")}
            </Button>
          </div>
          <Card className="gap-3 p-4">
            <h2 className="text-2xl font-bold tabular-nums">
              {t("kitchen.confirmed", { count: term.total })}
            </h2>
          </Card>
          <CardGrid
            className={cn(
              "items-stretch print:flex print:flex-col",
              view === "edit" && "lg:grid-cols-1",
            )}
          >
            <KitchenSection title={t("kitchen.countsTitle")}>
              <KitchenTable
                head={[t("kitchen.optionColumn"), t("kitchen.portions")]}
                isLastRight
              >
                {[
                  { id: "regular", name: t("kitchen.regular"), count: term.regular },
                  ...term.options,
                ].map((option) => (
                  <TableRow
                    key={option.id}
                    className="md:h-[84px]"
                  >
                    <TableCell className="wrap-anywhere whitespace-normal md:p-4 md:text-base">
                      {option.name}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground tabular-nums md:w-40 md:p-4">
                      {option.count}
                    </TableCell>
                  </TableRow>
                ))}
              </KitchenTable>
              <p className="text-muted-foreground">{t("kitchen.overlapNote")}</p>
            </KitchenSection>
            {view === "edit" ? (
              <>
                <OrganizerMealRoster
                  key={term.termId}
                  eventId={eventId}
                  termId={term.termId}
                />
                <div className="hidden print:order-first print:block">
                  <ParticipantNotes term={term} />
                </div>
              </>
            ) : isByParticipant ? (
              <ParticipantNotes term={term} />
            ) : (
              <>
                <KitchenSection
                  title={t("kitchen.allergiesTitle")}
                  count={term.allergies.length}
                >
                  {term.allergies.length > 0 ? (
                    <KitchenTable head={[t("kitchen.nameColumn"), t("kitchen.allergiesColumn")]}>
                      {term.allergies.map((entry) => (
                        <TableRow key={entry.applicationId}>
                          <TableCell className="wrap-anywhere whitespace-normal">
                            {entry.firstName} {entry.lastName}
                          </TableCell>
                          <TableCell className="wrap-anywhere whitespace-pre-line">
                            {entry.allergies}
                          </TableCell>
                        </TableRow>
                      ))}
                    </KitchenTable>
                  ) : null}
                </KitchenSection>
                {term.specialRequests.length > 0 ? (
                  <KitchenSection
                    title={t("kitchen.specialRequestsTitle")}
                    count={term.specialRequests.length}
                  >
                    <KitchenTable head={[t("kitchen.nameColumn"), t("kitchen.requestColumn")]}>
                      {term.specialRequests.map((entry) => (
                        <TableRow key={entry.applicationId}>
                          <TableCell className="wrap-anywhere whitespace-normal">
                            {entry.firstName} {entry.lastName}
                          </TableCell>
                          <TableCell className="wrap-anywhere whitespace-pre-line">
                            {entry.specialRequest}
                          </TableCell>
                        </TableRow>
                      ))}
                    </KitchenTable>
                  </KitchenSection>
                ) : null}
                {term.stays.length > 0 ? (
                  // Figma (Design system v2): US-143 Organizátor · Souhrn pro kuchyni · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=24969-10806 (mobile 24969-12256)
                  <KitchenSection
                    title={t("kitchen.staysTitle")}
                    count={term.stays.length}
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
                          <TableCell className="wrap-anywhere whitespace-normal">
                            {entry.firstName} {entry.lastName}
                          </TableCell>
                          <TableCell className="wrap-anywhere whitespace-normal">
                            {entry.lateArrival ? when(entry.lateArrival) : "–"}
                          </TableCell>
                          <TableCell className="wrap-anywhere whitespace-normal">
                            {entry.earlyDeparture ? when(entry.earlyDeparture) : "–"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </KitchenTable>
                  </KitchenSection>
                ) : null}
              </>
            )}
          </CardGrid>
        </>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row print:hidden">
        <Button
          asChild
          variant="outline"
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
