import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatDateTime } from "@/lib/date"

import {
  applicationEditQueryOptions,
  saveApplicationEdit,
  type EditableApplication,
  type EditApplicationInput,
} from "@/features/participant/api/applicationEdit"

// Figma (Design system): Upravit přihlášku · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-13915 (mobile: 19795-14057)
// Figma (Design system): Změny byly uloženy · node-id=19795-14149 (mobile: 19795-14264); Změny se nepodařilo uložit · node-id=19795-14329 (mobile: 19795-14464)
export function EditApplicationPage({ applicationId }: { applicationId: string }) {
  const { t } = useTranslation("participant")
  const query = useQuery(applicationEditQueryOptions(applicationId))
  if (query.isPending) return <LoadingState />
  if (query.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{t("edit.loadError")}</AlertTitle>
        <AlertDescription>
          <Button
            variant="outline"
            onClick={() => void query.refetch()}
          >
            {t("edit.retry")}
          </Button>
        </AlertDescription>
      </Alert>
    )
  }
  return (
    <EditForm
      applicationId={applicationId}
      initial={query.data}
    />
  )
}

function EditForm({
  applicationId,
  initial,
}: {
  applicationId: string
  initial: EditableApplication
}) {
  const { t } = useTranslation("participant")
  const client = useQueryClient()
  const [values, setValues] = useState<EditApplicationInput>({
    firstName: initial.firstName,
    lastName: initial.lastName,
    birthDate: initial.birthDate,
    phone: initial.phone ?? "",
    accommodationRequest: initial.accommodationRequest ?? "",
  })
  const mutation = useMutation({
    mutationFn: () => saveApplicationEdit(applicationId, values),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["participant", "applications"] })
    },
  })
  const detail = { to: ROUTES.participant.application, params: { applicationId } } as const
  const nullableTrimmed = (value: string | null) => {
    const trimmed = value?.trim()
    return trimmed?.length ? trimmed : null
  }
  const isChanged =
    values.firstName.trim() !== initial.firstName ||
    values.lastName.trim() !== initial.lastName ||
    values.birthDate !== initial.birthDate ||
    nullableTrimmed(values.phone) !== initial.phone ||
    nullableTrimmed(values.accommodationRequest) !== initial.accommodationRequest
  const changed = {
    firstName: values.firstName.trim() !== initial.firstName,
    lastName: values.lastName.trim() !== initial.lastName,
    birthDate: values.birthDate !== initial.birthDate,
    phone: nullableTrimmed(values.phone) !== initial.phone,
    accommodationRequest:
      nullableTrimmed(values.accommodationRequest) !== initial.accommodationRequest,
  }
  const shouldShowPersonalCard =
    !mutation.isError || changed.firstName || changed.lastName || changed.birthDate
  const phoneField = (
    <div className="flex flex-col gap-2">
      <Label htmlFor="edit-phone">{t("edit.phone")}</Label>
      <Input
        id="edit-phone"
        required
        type="tel"
        maxLength={30}
        pattern={String.raw`\+?[0-9 \(\)\-]{7,30}`}
        value={values.phone ?? ""}
        onChange={(event) => setValues((current) => ({ ...current, phone: event.target.value }))}
        className="h-12"
      />
    </div>
  )

  if (mutation.isSuccess) {
    const saved = mutation.data
    const change = saved.history[0]
    const fields = change?.changedFields ?? []
    const kinds = [
      fields.some((field) => ["firstName", "lastName", "birthDate"].includes(field))
        ? t("edit.historyPersonal")
        : null,
      fields.includes("phone") ? t("edit.historyContact") : null,
      fields.includes("accommodationRequest") ? t("edit.historyAccommodation") : null,
    ].filter(Boolean)
    const historyDescription =
      fields.length === 2 && fields.includes("phone") && fields.includes("accommodationRequest")
        ? t("edit.historyContactAccommodation")
        : t("edit.historyOther", { fields: kinds.join(", ") })
    return (
      <div className="mx-auto flex w-full max-w-[805px] flex-col gap-6">
        <h1 className="text-2xl font-bold">{t("edit.successTitle")}</h1>
        <Card className="gap-4 p-4 md:p-5">
          <h2 className="text-xl font-semibold">
            {saved.firstName} {saved.lastName}
          </h2>
          <p>{t("edit.phoneSummary", { phone: saved.phone })}</p>
          <p>{t("edit.accommodationSummary", { request: saved.accommodationRequest ?? "—" })}</p>
          <p>{t("edit.organizerNotified")}</p>
          {change ? (
            <p>
              {t("edit.historyLine", {
                date: formatDateTime(change.createdAt),
                author: change.authorName,
                description: historyDescription,
              })}
            </p>
          ) : null}
        </Card>
        <Button
          asChild
          variant="ghost"
          className="self-center"
        >
          <Link {...detail}>{t("edit.backToApplication")}</Link>
        </Button>
      </div>
    )
  }

  const set = (key: keyof EditApplicationInput, value: string) =>
    setValues((current) => ({ ...current, [key]: value }))

  return (
    <form
      className="mx-auto flex w-full max-w-[805px] flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        mutation.mutate()
      }}
    >
      <h1 className="text-2xl font-bold">
        {t(mutation.isError ? "edit.saveErrorTitle" : "edit.title")}
      </h1>
      {mutation.isError ? (
        <Alert variant="destructive">
          <TriangleAlert aria-hidden="true" />
          <AlertTitle>{t("edit.saveError")}</AlertTitle>
          <AlertDescription>{t("edit.valuesPreserved")}</AlertDescription>
        </Alert>
      ) : null}
      {!mutation.isError ? (
        <p>
          {initial.firstName} {initial.lastName} · {initial.eventName}
        </p>
      ) : null}
      {shouldShowPersonalCard ? (
        <Card className="gap-5 p-4 md:p-5">
          <h2 className="text-xl font-semibold">{t("edit.participant")}</h2>
          {!mutation.isError || changed.firstName ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-first-name">{t("edit.firstName")}</Label>
              <Input
                id="edit-first-name"
                required
                maxLength={100}
                value={values.firstName}
                onChange={(event) => set("firstName", event.target.value)}
                className="h-12"
              />
            </div>
          ) : null}
          {!mutation.isError || changed.lastName ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-last-name">{t("edit.lastName")}</Label>
              <Input
                id="edit-last-name"
                required
                maxLength={100}
                value={values.lastName}
                onChange={(event) => set("lastName", event.target.value)}
                className="h-12"
              />
            </div>
          ) : null}
          {!mutation.isError || changed.birthDate ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-birth-date">{t("edit.birthDate")}</Label>
              <Input
                id="edit-birth-date"
                required
                type="date"
                min="1900-01-01"
                max={new Date().toISOString().slice(0, 10)}
                value={values.birthDate}
                onChange={(event) => set("birthDate", event.target.value)}
                className="h-12"
              />
            </div>
          ) : null}
          {!mutation.isError ? phoneField : null}
        </Card>
      ) : null}
      {mutation.isError && (changed.phone || !initial.phone) ? phoneField : null}
      {!mutation.isError || changed.accommodationRequest ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-accommodation">{t("edit.accommodationRequest")}</Label>
          <Textarea
            id="edit-accommodation"
            maxLength={2000}
            value={values.accommodationRequest ?? ""}
            onChange={(event) => set("accommodationRequest", event.target.value)}
            className="min-h-32"
          />
        </div>
      ) : null}
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={mutation.isPending || !isChanged}
      >
        {t(mutation.isError ? "edit.retry" : "edit.save")}
      </Button>
      {!mutation.isError ? (
        <Button
          asChild
          variant="ghost"
          className="w-full"
        >
          <Link {...detail}>{t("edit.cancel")}</Link>
        </Button>
      ) : null}
    </form>
  )
}
