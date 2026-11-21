import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useBlocker, useNavigate } from "@tanstack/react-router"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/atoms/BackLink"
import { CharacterCounter } from "@/components/atoms/CharacterCounter"
import { HeadingBand } from "@/components/atoms/HeadingBand"
import { PendingButton } from "@/components/atoms/PendingButton"
import { DateField } from "@/components/molecules/DateField"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { isIsoDate } from "@/lib/date-input"
import { notify } from "@/lib/notify"
import { isValidPhone, MAX_PHONE_INPUT_LENGTH, normalizePhone } from "@/lib/phone"

import {
  applicationEditQueryOptions,
  saveApplicationEdit,
  type EditableApplication,
  type EditApplicationInput,
} from "@/features/participant/api/applicationEdit"

// Figma (Design system v2): US-34 / Upravit údaje · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=20491-16159 (360 px: 20491-16398); Chyba uložení 20491-17377 (360 px: 20491-17622)
// Figma (Design system v2): #38 individuální řešení ubytování · nezaškrtnuto node-id=25586-32206 (360 px: 25586-32330); zaškrtnuto s poznámkou 25586-32411 (360 px: 25586-32543); chyba 25586-32632 (360 px: 25586-32768)
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

function EditForm({
  applicationId,
  initial,
}: {
  applicationId: string
  initial: EditableApplication
}) {
  const { t } = useTranslation("participant")
  const client = useQueryClient()
  const navigate = useNavigate()
  const detail = { to: ROUTES.participant.application, params: { applicationId } } as const
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
        phone: normalizePhone(values.phone) === null ? null : (values.phone ?? "").trim(),
        // The note belongs to the request: without it none is sent.
        accommodationRequest: values.individualAccommodation ? values.accommodationRequest : null,
      }),
    onSuccess: async () => {
      // The result is a toast over the application detail; there is no result page.
      notify.success(t("edit.toast.saved"), t("edit.toast.organizerNotified"))
      // The save is done, so leaving the form must not ask to discard the changes.
      await navigate({ ...detail, ignoreBlocker: true })
      await client.invalidateQueries({ queryKey: ["participant", "applications"] })
    },
  })
  const nullableTrimmed = (value: string | null) => {
    const trimmed = value?.trim()
    return trimmed?.length ? trimmed : null
  }
  const isPhoneInvalid = !isValidPhone(normalizePhone(values.phone))
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false)
  const shouldShowPhoneError = isPhoneInvalid && hasTriedSubmit
  const isBirthDateInvalid = !isIsoDate(values.birthDate)
  const shouldShowBirthDateError = isBirthDateInvalid && hasTriedSubmit
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
  const blocker = useBlocker({
    shouldBlockFn: ({ current, next }) => current.pathname !== next.pathname,
    disabled: !isChanged || mutation.isSuccess,
    withResolver: true,
  })
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
          {t("edit.phoneInvalid")}
        </p>
      ) : null}
    </div>
  )

  return (
    <form
      className="flex w-full flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        setHasTriedSubmit(true)
        if (isNoteTooLong || isPhoneInvalid || isBirthDateInvalid) return
        setFailedFields(changed)
        mutation.mutate()
      }}
    >
      {/* Figma v2: edit application · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=20491-16159 (mobile 20491-16398). */}
      {/* Figma v2: Discard edits · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK?node-id=22540-121751 (mobile 22540-121810). */}
      {blocker.status === "blocked" && (
        <Dialog
          open
          onOpenChange={(isOpen) => {
            if (!isOpen) blocker.reset()
          }}
        >
          <DialogContent className="sm:max-w-160">
            <DialogHeader>
              <DialogTitle>{t("edit.discardTitle")}</DialogTitle>
              <DialogDescription>{t("edit.discardDescription")}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={blocker.reset}
              >
                {t("edit.keepEditing")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={blocker.proceed}
              >
                {t("edit.discard")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      <BackLink {...detail}>{t("edit.backToApplication")}</BackLink>
      <HeadingBand motif="forms">
        <h1 className="text-2xl font-bold">
          {t(mutation.isError ? "edit.saveErrorTitle" : "edit.title")}
        </h1>
        {!mutation.isError && (
          <p className="mt-2 text-muted-foreground">
            {initial.firstName} {initial.lastName} · {initial.eventName}
          </p>
        )}
      </HeadingBand>
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
        {mutation.isError ? (
          <Alert variant="destructive">
            <TriangleAlert aria-hidden="true" />
            <AlertTitle>{t("edit.saveError")}</AlertTitle>
            <AlertDescription>{t("edit.valuesPreserved")}</AlertDescription>
          </Alert>
        ) : null}
        {shouldShowPersonalCard ? (
          <Card className="gap-5 p-4 md:p-5">
            <h2 className="text-2xl font-bold tracking-tight">{t("edit.participant")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>
            {!mutation.isError || visibleFields.birthDate ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-birth-date">{t("edit.birthDate")}</Label>
                <DateField
                  id="edit-birth-date"
                  required
                  min="1900-01-01"
                  max={new Date().toISOString().slice(0, 10)}
                  value={values.birthDate}
                  onChange={(value) => set("birthDate", value)}
                  aria-invalid={shouldShowBirthDateError}
                  aria-describedby={shouldShowBirthDateError ? "edit-birth-date-error" : undefined}
                  className="h-12"
                />
                {shouldShowBirthDateError ? (
                  <p
                    id="edit-birth-date-error"
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {t("edit.birthDateInvalid")}
                  </p>
                ) : null}
              </div>
            ) : null}
          </Card>
        ) : null}
        {!mutation.isError || visibleFields.phone ? (
          <Card className="gap-4 p-4">
            <h2 className="text-2xl font-bold tracking-tight">{t("edit.contactHeading")}</h2>
            {phoneField}
            <p className="text-sm text-muted-foreground">{t("edit.contactHint")}</p>
          </Card>
        ) : null}
        {!mutation.isError || visibleFields.accommodationRequest ? (
          <Card className="gap-4 p-4">
            <h2 className="text-2xl font-bold tracking-tight">{t("edit.accommodationHeading")}</h2>
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
            {/* #38: the hint sits under the last control — the checkbox, or the note when ticked. */}
            <p className="text-sm text-muted-foreground">{t("edit.individualAccommodationHint")}</p>
          </Card>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <PendingButton
            isPending={mutation.isPending}
            type="submit"
            size="lg"
            className="w-full"
            disabled={mutation.isPending || !isChanged}
          >
            {t(mutation.isError ? "edit.retry" : "edit.save")}
          </PendingButton>
          {!mutation.isError ? (
            <Button
              asChild
              variant="ghost"
              className="w-full"
            >
              <Link {...detail}>{t("edit.cancel")}</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  )
}
