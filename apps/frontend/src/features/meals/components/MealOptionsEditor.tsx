import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { PageHeader } from "@/components/molecules/PageHeader"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

import {
  mealOptionsQueryOptions,
  saveMealOptions,
  type MealOption,
} from "@/features/meals/api/meals"

/** Same limit as the API (`MEAL_OPTION_NAME_MAX_LENGTH`). */
const NAME_MAX_LENGTH = 100

/** The meal restrictions an event offers on the application, defined by the organizer. */
// Figma (Design system): #64 / Varianty stravování / Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-12250 (360 px: node-id=19795-12394)
export function MealOptionsEditor({ eventId }: { eventId: string }) {
  const { t } = useTranslation("meals")
  const { data, isPending, error, refetch } = useQuery(mealOptionsQueryOptions(eventId))

  if (isPending) return <LoadingState />
  if (error) {
    return (
      <ErrorState
        title={t("options.title")}
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }
  return (
    <OptionsForm
      eventId={eventId}
      options={data}
    />
  )
}

type Row = { key: string; id?: string; name: string }

function OptionsForm({ eventId, options }: { eventId: string; options: MealOption[] }) {
  const { t } = useTranslation("meals")
  const client = useQueryClient()
  const [rows, setRows] = useState<Row[]>(() =>
    options.map((option) => ({ key: option.id, id: option.id, name: option.name })),
  )

  const mutation = useMutation({
    mutationFn: () =>
      saveMealOptions(
        eventId,
        rows.map(({ id, name }) => ({ id, name })),
      ),
    onSuccess: (saved) => {
      client.setQueryData(mealOptionsQueryOptions(eventId).queryKey, saved)
      setRows(saved.map((option) => ({ key: option.id, id: option.id, name: option.name })))
      void client.invalidateQueries({ queryKey: ["organizer", "events", eventId, "meals"] })
      void client.invalidateQueries({ queryKey: ["participant", "applications"] })
    },
  })

  const rename = (key: string, name: string) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, name } : row)))

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        mutation.mutate()
      }}
    >
      <PageHeader title={t("options.title")} />
      <Card className="gap-4 p-4">
        <h2 className="text-2xl font-bold">{t("options.cardTitle")}</h2>
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex items-center gap-2"
          >
            <Input
              aria-label={t("options.nameLabel")}
              maxLength={NAME_MAX_LENGTH}
              value={row.name}
              onChange={(event) => rename(row.key, event.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              aria-label={t("options.remove", { name: row.name })}
              onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}
            >
              <X aria-hidden />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="w-full"
          onClick={() =>
            setRows((current) => [...current, { key: `new-${crypto.randomUUID()}`, name: "" }])
          }
        >
          {t("options.add")}
        </Button>
      </Card>
      {mutation.error ? (
        <Alert variant="destructive">
          <AlertDescription>{mutation.error.message}</AlertDescription>
        </Alert>
      ) : null}
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={mutation.isPending}
      >
        {t("options.save")}
      </Button>
    </form>
  )
}
