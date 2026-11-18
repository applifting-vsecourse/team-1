import { useState, type FormEvent, type ReactNode } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { useTranslation } from "react-i18next"

import { DateField } from "@/components/molecules/DateField"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
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
  saveApplicationDetails,
  type PaymentApplication,
} from "@/features/event-overview/api/payments"

/** Longest note about the individual accommodation (the server holds the same limit). */
const MAX_ACCOMMODATION_NOTE_LENGTH = 2000
const EARLIEST_BIRTH_DATE = "1900-01-01"

type Errors = Partial<
  Record<"firstName" | "lastName" | "birthDate" | "phone" | "accommodationRequest", string>
>

type ParticipantEditDialogProps = {
  application: Pick<
    PaymentApplication,
    | "id"
    | "firstName"
    | "lastName"
    | "birthDate"
    | "gender"
    | "email"
    | "phone"
    | "individualAccommodation"
    | "accommodationRequest"
  >
  onClose: () => void
}

/**
 * An organizer edits the participant's details in a dialog (#515, variant A): name, date of birth,
 * phone and the request for individual accommodation. Gender and the application's e-mail are
 * shown as text because they can't change. Validated here and again by the server; the error of
 * the server stays in the dialog, the saved change shows up in the detail and the history.
 */
// Figma (Design system): #515 Varianta A · Dialog Upravit údaje účastníka · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=26114-1207 (360 px: node-id=26111-127436)
export function ParticipantEditDialog({ application, onClose }: ParticipantEditDialogProps) {
  const { t } = useTranslation("eventOverview")
  const client = useQueryClient()
  const [firstName, setFirstName] = useState(application.firstName)
  const [lastName, setLastName] = useState(application.lastName)
  const [birthDate, setBirthDate] = useState(application.birthDate)
  const [phone, setPhone] = useState(application.phone ?? "")
  const [hasAccommodation, setHasAccommodation] = useState(application.individualAccommodation)
  const [note, setNote] = useState(application.accommodationRequest ?? "")
  const [errors, setErrors] = useState<Errors>({})

  const mutation = useMutation({
    mutationFn: () =>
      saveApplicationDetails(application.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate,
        phone: normalizePhone(phone),
        individualAccommodation: hasAccommodation,
        // The note belongs to the request: without it none is sent.
        accommodationRequest: hasAccommodation ? note.trim() || null : null,
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["eventOverview"] })
      notify.success(t("editDetails.saved"))
      onClose()
    },
  })

  /** Clears the error of the field the user is fixing. */
  const clear = (field: keyof Errors) =>
    setErrors((current) => ({ ...current, [field]: undefined }))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (mutation.isPending) return
    const normalizedPhone = normalizePhone(phone)
    const next: Errors = {}
    if (!firstName.trim()) next.firstName = t("editDetails.firstNameRequired")
    if (!lastName.trim()) next.lastName = t("editDetails.lastNameRequired")
    if (!isIsoDate(birthDate) || birthDate < EARLIEST_BIRTH_DATE || birthDate > today()) {
      next.birthDate = t("editDetails.birthDateInvalid")
    }
    // The phone is optional; a filled-in one has to be a phone.
    if (!isValidPhone(normalizedPhone)) next.phone = t("editDetails.phoneInvalid")
    if (hasAccommodation && note.length > MAX_ACCOMMODATION_NOTE_LENGTH) {
      next.accommodationRequest = t("editDetails.noteTooLong")
    }
    setErrors(next)
    if (Object.keys(next).length === 0) mutation.mutate()
  }

  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !mutation.isPending) onClose()
      }}
    >
      <DialogContent
        className="gap-5 overflow-y-auto max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none sm:max-h-[calc(100dvh-2rem)] sm:max-w-160"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle className="pr-8 text-xl tracking-tight md:text-2xl">
            {t("editDetails.title")}
          </DialogTitle>
        </DialogHeader>
        <form
          noValidate
          onSubmit={submit}
          className="flex flex-col gap-5"
        >
          {mutation.error ? (
            <Alert variant="destructive">
              <AlertTitle className="line-clamp-none">{t("editDetails.saveError")}</AlertTitle>
              <AlertDescription>{mutation.error.message}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="edit-first-name"
              label={t("editDetails.firstName")}
              error={errors.firstName}
            >
              <Input
                id="edit-first-name"
                autoComplete="off"
                maxLength={100}
                value={firstName}
                aria-invalid={errors.firstName !== undefined}
                aria-describedby={errors.firstName ? "edit-first-name-error" : undefined}
                className="h-12"
                onChange={(event) => {
                  setFirstName(event.target.value)
                  clear("firstName")
                }}
              />
            </Field>
            <Field
              id="edit-last-name"
              label={t("editDetails.lastName")}
              error={errors.lastName}
            >
              <Input
                id="edit-last-name"
                autoComplete="off"
                maxLength={100}
                value={lastName}
                aria-invalid={errors.lastName !== undefined}
                aria-describedby={errors.lastName ? "edit-last-name-error" : undefined}
                className="h-12"
                onChange={(event) => {
                  setLastName(event.target.value)
                  clear("lastName")
                }}
              />
            </Field>
            <Field
              id="edit-birth-date"
              label={t("editDetails.birthDate")}
              error={errors.birthDate}
            >
              <DateField
                id="edit-birth-date"
                min={EARLIEST_BIRTH_DATE}
                max={today()}
                value={birthDate}
                aria-invalid={errors.birthDate !== undefined}
                aria-describedby={errors.birthDate ? "edit-birth-date-error" : undefined}
                className="h-12"
                onChange={(value) => {
                  setBirthDate(value)
                  clear("birthDate")
                }}
              />
            </Field>
            <Field
              id="edit-phone"
              label={t("editDetails.phone")}
              error={errors.phone}
            >
              <Input
                id="edit-phone"
                type="tel"
                maxLength={MAX_PHONE_INPUT_LENGTH}
                value={phone}
                aria-invalid={errors.phone !== undefined}
                aria-describedby={errors.phone ? "edit-phone-error" : undefined}
                className="h-12"
                onChange={(event) => {
                  setPhone(event.target.value)
                  clear("phone")
                }}
              />
            </Field>
          </div>
          <div className="flex flex-col gap-3 border-t pt-5">
            <div className="flex min-h-6 items-center gap-3">
              <Checkbox
                id="edit-individual-accommodation"
                className="size-5"
                checked={hasAccommodation}
                onCheckedChange={(isChecked) => setHasAccommodation(isChecked === true)}
              />
              <Label
                htmlFor="edit-individual-accommodation"
                className="cursor-pointer font-normal"
              >
                {t("editDetails.individualAccommodation")}
              </Label>
            </div>
            {hasAccommodation ? (
              <Field
                id="edit-accommodation-note"
                label={t("editDetails.note")}
                error={errors.accommodationRequest}
              >
                <Textarea
                  id="edit-accommodation-note"
                  value={note}
                  aria-invalid={errors.accommodationRequest !== undefined}
                  aria-describedby={
                    errors.accommodationRequest ? "edit-accommodation-note-error" : undefined
                  }
                  className="min-h-32"
                  onChange={(event) => {
                    setNote(event.target.value)
                    clear("accommodationRequest")
                  }}
                />
              </Field>
            ) : null}
          </div>
          <dl className="grid gap-3 rounded-md bg-muted p-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <dt className="text-sm text-muted-foreground">{t("editDetails.gender")}</dt>
              <dd>
                {t(application.gender === "FEMALE" ? "manual.genderFemale" : "manual.genderMale")}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-sm text-muted-foreground">{t("editDetails.email")}</dt>
              <dd className="break-words">{application.email}</dd>
            </div>
          </dl>
          <p className="border-t pt-4 text-sm text-muted-foreground">
            {t("editDetails.afterSave")}
          </p>
          <DialogFooter className="sm:[&>*]:flex-1">
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={mutation.isPending}
              onClick={onClose}
            >
              {t("editDetails.cancel")}
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={mutation.isPending}
            >
              {t(mutation.isPending ? "editDetails.saving" : "editDetails.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const today = () => format(new Date(), "yyyy-MM-dd")

/** A label, its control and the error under it (announced as an alert). */
function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}
