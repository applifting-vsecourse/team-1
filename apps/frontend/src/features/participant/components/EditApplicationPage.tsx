import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { CharacterCounter } from "@/components/atoms/CharacterCounter"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatDateTime } from "@/lib/date"
import { isValidPhone, MAX_PHONE_INPUT_LENGTH, normalizePhone } from "@/lib/phone"

import {
  applicationEditQueryOptions,
  saveApplicationEdit,
  type EditableApplication,
  type EditApplicationInput,
} from "@/features/participant/api/applicationEdit"

// Figma (Design system): Upravit přihlášku · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-13915 (mobile: 19795-14057)
// Figma (Design system): US-38 individuální řešení ubytování v úpravě údajů · nezaškrtnuto node-id=25586-32206 (mobile: 25586-32330); zaškrtnuto s poznámkou 25586-32411 (mobile: 25586-32543); chyba 25586-32632 (mobile: 25586-32768)
// Figma (Design system): Změny byly uloženy · node-id=19795-14149 (mobile: 19795-14264); Změny se nepodařilo uložit · node-id=19795-14329 (mobile: 19795-14464)
export function EditApplicationPage({ applicationId }: { applicationId: string }) {
  const { t } = useTranslation("participant")
  const query = useQuery(applicationEditQueryOptions(applicationId))
  if (query.isPending) return <LoadingState />
  const loadError = query.error ? (
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
  ) : null
  if (!query.data) return loadError ?? <LoadingState />
  return (
    <>
      {loadError}
      <EditForm
        applicationId={applicationId}
        initial={query.data}
      />
    </>
  )
}

const MAX_ACCOMMODATION_NOTE_LENGTH = 2000

/** The request for individual accommodation and its note are one change in the history (US-38). */
const isAccommodation = (fields: string[]): boolean =>
  fields.some((field) => field === "accommodationRequest" || field === "individualAccommodation")

function EditForm({
  applicationId,
  initial,
}: {
  applicationId: string
  initial: EditableApplication
}) {
  const { t } = useTranslation("participant")
  const client = useQueryClient()
  // Untouched fields follow refreshed server data; only local edits override it.
  const [edits, setEdits] = useState<Partial<EditApplicationInput>>({})
  const values: EditApplicationInput = {
    firstName: initial.firstName,
    lastName: initial.lastName,
    birthDate: initial.birthDate,
    phone: initial.phone ?? "",
    individualAccommodation: initial.individualAccommodation,
    accommodationRequest: initial.accommodationRequest ?? "",
    ...edits,
  }
  const set = (key: keyof EditApplicationInput, value: string | boolean) =>
    setEdits((current) => {
      const next = { ...current, [key]: value }
      if (value === (initial[key] ?? "")) delete next[key]
      return next
    })
  const [failedFields, setFailedFields] = useState<Record<
    Exclude<keyof EditApplicationInput, "individualAccommodation">,
    boolean
  > | null>(null)
  const mutation = useMutation({
    mutationFn: () =>
      saveApplicationEdit(applicationId, {
        ...values,
        // The note belongs to the request: without it none is sent.
        accommodationRequest: values.individualAccommodation ? values.accommodationRequest : null,
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["participant", "applications"] })
    },
  })
  const detail = { to: ROUTES.participant.application, params: { applicationId } } as const
  const nullableTrimmed = (value: string | null) => {
    const trimmed = value?.trim()
    return trimmed?.length ? trimmed : null
  }
  const phone = normalizePhone(values.phone)
  const isPhoneInvalid = !isValidPhone(phone)
  const [isPhoneChecked, setIsPhoneChecked] = useState(false)
  const shouldShowPhoneError = isPhoneInvalid && isPhoneChecked
  const isNoteTooLong =
    values.individualAccommodation &&
    (values.accommodationRequest ?? "").length > MAX_ACCOMMODATION_NOTE_LENGTH
  const isAccommodationChanged =
    values.individualAccommodation !== initial.individualAccommodation ||
    (values.individualAccommodation ? nullableTrimmed(values.accommodationRequest) : null) !==
      initial.accommodationRequest
  const isChanged =
    values.firstName.trim() !== initial.firstName ||
    values.lastName.trim() !== initial.lastName ||
    values.birthDate !== initial.birthDate ||
    normalizePhone(values.phone) !== normalizePhone(initial.phone) ||
    isAccommodationChanged
  const changed = {
    firstName: values.firstName.trim() !== initial.firstName,
    lastName: values.lastName.trim() !== initial.lastName,
    birthDate: values.birthDate !== initial.birthDate,
    phone: normalizePhone(values.phone) !== normalizePhone(initial.phone),
    accommodationRequest: isAccommodationChanged,
  }
  const visibleFields = mutation.isError && failedFields ? failedFields : changed
  const shouldShowPersonalCard =
    !mutation.isError ||
    visibleFields.firstName ||
    visibleFields.lastName ||
    visibleFields.birthDate
  const phoneField = (
    <div className="flex flex-col gap-2">
      <Label htmlFor="edit-phone">{t("edit.phone")}</Label>
      <Input
        id="edit-phone"
        type="tel"
        maxLength={MAX_PHONE_INPUT_LENGTH}
        value={values.phone ?? ""}
        onChange={(event) => set("phone", event.target.value)}
        aria-invalid={shouldShowPhoneError}
        aria-describedby={shouldShowPhoneError ? "edit-phone-error" : undefined}
        className="h-12"
      />
      {shouldShowPhoneError ? (
        <p
          id="edit-phone-error"
          role="alert"
          className="text-sm text-destructive"
        >
          {t(phone === null ? "edit.phoneRequired" : "edit.phoneInvalid")}
        </p>
      ) : null}
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
      isAccommodation(fields) ? t("edit.historyAccommodation") : null,
    ].filter(Boolean)
    const historyDescription =
      isAccommodation(fields) &&
      fields.filter((field) => !isAccommodation([field])).join() === "phone"
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
          <p>
            {t("edit.accommodationSummary", {
              request: saved.individualAccommodation
                ? [t("edit.accommodationIndividual"), saved.accommodationRequest]
                    .filter(Boolean)
                    .join(" · ")
                : "—",
            })}
          </p>
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

  return (
    <form
      className="mx-auto flex w-full max-w-[805px] flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        setIsPhoneChecked(true)
        if (isNoteTooLong || isPhoneInvalid) return
        setFailedFields(changed)
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
          {!mutation.isError || visibleFields.firstName ? (
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
          {!mutation.isError || visibleFields.lastName ? (
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
          {!mutation.isError || visibleFields.birthDate ? (
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
      {mutation.isError && (visibleFields.phone || !initial.phone) ? phoneField : null}
      {!mutation.isError || visibleFields.accommodationRequest ? (
        <div className="flex flex-col gap-4 border-t border-border pt-4">
          <div className="flex flex-col gap-1">
            <div className="flex min-h-11 items-center gap-3">
              <Checkbox
                id="edit-individual-accommodation"
                className="size-5"
                checked={values.individualAccommodation}
                onCheckedChange={(isChecked) => set("individualAccommodation", isChecked === true)}
              />
              <Label
                htmlFor="edit-individual-accommodation"
                className="flex-1 cursor-pointer self-stretch leading-5 font-normal"
              >
                {t("edit.individualAccommodation")}
              </Label>
            </div>
            <p className="pl-8 text-sm text-muted-foreground">
              {t("edit.individualAccommodationHint")}
            </p>
          </div>
          {values.individualAccommodation ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-accommodation">{t("edit.accommodationRequest")}</Label>
              <Textarea
                id="edit-accommodation"
                value={values.accommodationRequest ?? ""}
                onChange={(event) => set("accommodationRequest", event.target.value)}
                aria-invalid={isNoteTooLong}
                aria-describedby={isNoteTooLong ? "edit-accommodation-error" : undefined}
                className="min-h-32"
              />
              <div className="flex items-start gap-3">
                {isNoteTooLong ? (
                  <p
                    id="edit-accommodation-error"
                    className="text-sm text-destructive"
                  >
                    {t("edit.accommodationRequestTooLong")}
                  </p>
                ) : null}
                <CharacterCounter
                  count={(values.accommodationRequest ?? "").length}
                  max={MAX_ACCOMMODATION_NOTE_LENGTH}
                />
              </div>
            </div>
          ) : null}
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
