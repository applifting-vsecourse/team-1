import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
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
import { termLine } from "@/lib/term-label"

import { kitchenSummaryQueryOptions } from "@/features/meals/api/meals"

/**
 * Meal counts and allergies of the participants confirmed in one term, printable for the kitchen.
 * Only what is inside `data-print-area` is printed (see `global.css`).
 */
// Figma (Design system): #64 / Souhrn pro kuchyni / Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-12002 (360 px: node-id=19795-12163)
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
          <div className="flex flex-col gap-2">
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
          <Card className="gap-4 p-4">
            <h2 className="text-2xl font-bold">{t("kitchen.countsTitle")}</h2>
            <p>
              {t("kitchen.regular")} · {term.regular}
            </p>
            {term.options.map((option) => (
              <p key={option.id}>
                {option.name} · {option.count}
              </p>
            ))}
            <p>{t("kitchen.overlapNote")}</p>
          </Card>
          <Card className="gap-4 p-4">
            <h2 className="text-2xl font-bold">{t("kitchen.allergiesTitle")}</h2>
            {term.allergies.map((entry) => (
              <p
                key={entry.applicationId}
                className="break-words whitespace-pre-line"
              >
                {entry.firstName} {entry.lastName} · {entry.allergies}
              </p>
            ))}
          </Card>
          <Button
            size="lg"
            className="w-full print:hidden"
            onClick={() => window.print()}
          >
            {t("kitchen.print")}
          </Button>
        </>
      ) : null}
      <Button
        asChild
        variant="ghost"
        size="lg"
        className="w-full print:hidden"
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
