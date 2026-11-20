import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { PendingButton } from "@/components/atoms/PendingButton"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { PageHeader } from "@/components/molecules/PageHeader"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  mealOptionsQueryOptions,
  saveMealOptions,
  type MealOption,
} from "@/features/meals/api/meals"

/** Same limit as the API (`MEAL_OPTION_NAME_MAX_LENGTH`). */
const NAME_MAX_LENGTH = 100

/** The meal restrictions an event offers on the application, defined by the organizer. */
// Figma v2: US-64 Upravit varianty stravy · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=20719-62231 (mobile 20719-62373)
export function MealOptionsEditor({ eventId, eventName }: { eventId: string; eventName?: string }) {
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
      eventName={eventName}
    />
  )
}

type Row = { key: string; id?: string; name: string }

function OptionsForm({
  eventId,
  options,
  eventName,
}: {
  eventId: string
  options: MealOption[]
  eventName?: string
}) {
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
      <PageHeader
        hasBand
        motif="forms"
        title={t("options.title")}
        description={eventName ? t("kitchen.description", { event: eventName }) : undefined}
      />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]">
        <Card className="gap-4 p-4">
          <h2 className="text-2xl font-bold">{t("options.cardTitle")}</h2>
          <p>{t("options.instructions")}</p>
          {rows.map((row, index) => (
            <div
              key={row.key}
              className="grid max-w-[540px] gap-2"
            >
              <Label htmlFor={`meal-name-${row.key}`}>
                {t("options.nameLabel", { number: index + 1 })}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id={`meal-name-${row.key}`}
                  maxLength={NAME_MAX_LENGTH}
                  value={row.name}
                  onChange={(event) => rename(row.key, event.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  aria-label={t("options.remove", { name: row.name })}
                  onClick={() =>
                    setRows((current) => current.filter((item) => item.key !== row.key))
                  }
                >
                  <X aria-hidden />
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="w-full sm:w-auto sm:self-start"
            onClick={() =>
              setRows((current) => [...current, { key: `new-${crypto.randomUUID()}`, name: "" }])
            }
          >
            <Plus aria-hidden />
            {t("options.add")}
          </Button>
          {mutation.error ? (
            <Alert variant="destructive">
              <AlertDescription>{mutation.error.message}</AlertDescription>
            </Alert>
          ) : null}
          <PendingButton
            isPending={mutation.isPending}
            type="submit"
            size="lg"
            className="w-full sm:w-auto sm:self-start"
          >
            {t("options.save")}
          </PendingButton>
        </Card>
        <Card className="gap-4 p-4">
          <h2 className="text-2xl font-bold">{t("options.preview")}</h2>
          {rows
            .filter((row) => row.name.trim())
            .map((row) => (
              <label
                key={row.key}
                className="flex min-h-11 items-center gap-3 break-words"
              >
                <Checkbox
                  disabled
                  className="size-6 disabled:cursor-default disabled:opacity-100"
                />
                {row.name}
              </label>
            ))}
          <p>{t("options.previewHint")}</p>
        </Card>
      </div>
    </form>
  )
}
