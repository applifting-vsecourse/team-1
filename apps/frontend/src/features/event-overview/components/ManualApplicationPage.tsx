import { useEffect, useRef, useState, type FormEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { format } from "date-fns"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { TermPrice } from "@/components/atoms/MoneyAmount"
import { PendingButton } from "@/components/atoms/PendingButton"
import { Seo } from "@/components/atoms/Seo"
import { DateField } from "@/components/molecules/DateField"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { formatDateRange } from "@/lib/date"
import { parseDateInput } from "@/lib/date-input"
import { focusFirstInvalidField } from "@/lib/focus-first-invalid"
import { formatCzk } from "@/lib/money"
import { isValidPhone, MAX_PHONE_INPUT_LENGTH, normalizePhone } from "@/lib/phone"
import { termTitle } from "@/lib/term-label"

import {
  createManualApplication,
  type ManualApplicationInput,
} from "@/features/event-overview/api/manualApplication"
import { occupancyQueryOptions } from "@/features/event-overview/api/occupancy"
import { termStatusesQueryOptions } from "@/features/event-overview/api/termStatus"

/** Longest note about the individual accommodation (the server holds the same limit). */
const MAX_ACCOMMODATION_NOTE_LENGTH = 2000

type Status = "CONFIRMED" | "WAITLISTED"
type Draft = {
  firstName: string
  lastName: string
  birthDate: string
  gender: "" | "FEMALE" | "MALE"
  individualAccommodation: boolean
  accommodationRequest: string
  email: string
  phone: string
  consent: boolean
  statuses: Record<string, Status | undefined>
}

const emptyDraft: Draft = {
  firstName: "",
  lastName: "",
  birthDate: "",
  gender: "",
  individualAccommodation: false,
  accommodationRequest: "",
  email: "",
  phone: "",
  consent: false,
  statuses: {},
}

// Figma (Design system v2): #653 / Ruční přidání přihlášky / Desktop · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27282-118060
// Figma (Design system v2): #653 / Ruční přidání přihlášky / Mobil · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27282-118184
// Figma (Design system): #518 Individuální ubytování v ručním přidání · s požadavkem, desktop https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27190-3974 · mobil 360 px node-id=27190-4330 · bez požadavku, desktop node-id=27190-4151 · mobil node-id=27190-4448
// Figma (Design system): #83 / Přidat přihlášku / Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19786-51095
// Figma (Design system): #83 / Přidat přihlášku / Mobile · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19786-51298
// Figma (Design system): #83 / Potvrzení nad kapacitu / Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19786-51429
// Figma (Design system): #83 / Potvrzení nad kapacitu / Mobile · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19786-51584
// Figma (Design system): #83 / Přihláška byla vytvořena / Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19786-51667
// Figma (Design system): #83 / Přihláška byla vytvořena / Mobile · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19786-51808
type TermOption = {
  id: string
  name: string | null
  startsOn: string
  endsOn: string
  priceCzk: number
}

export function ManualApplicationPage({
  eventId,
  eventName,
  terms,
  organizerName,
}: {
  eventId: string
  eventName: string
  terms: TermOption[]
  organizerName: string
}) {
  const { t } = useTranslation(["eventOverview", "common"])
  const occupancy = useQuery(occupancyQueryOptions(eventId))
  const client = useQueryClient()
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [step, setStep] = useState<"FORM" | "CAPACITY" | "CREATED">("FORM")
  const [isOverCapacityConfirmed, setIsOverCapacityConfirmed] = useState(false)
  const [payload, setPayload] = useState<ManualApplicationInput | null>(null)
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [invalidSubmitCount, setInvalidSubmitCount] = useState(0)
  // After a failed submission has rendered its errors, the first invalid control is in the DOM.
  useEffect(() => {
    const element = formRef.current
    if (!element || invalidSubmitCount === 0 || focusFirstInvalidField(element)) return
    const frame = requestAnimationFrame(() => {
      if (!focusFirstInvalidField(element)) {
        element.querySelector<HTMLElement>('[role="alert"]')?.focus()
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [invalidSubmitCount])
  const update = (key: keyof Draft, value: Draft[keyof Draft]) => {
    setDraft((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: "" }))
  }
  const mutation = useMutation({
    mutationFn: (input: ManualApplicationInput) => createManualApplication(eventId, input),
    onSuccess: (saved, input) => {
      setCreated({ id: saved.applicationId, name: `${input.firstName} ${input.lastName}` })
      setStep("CREATED")
      void client.invalidateQueries({ queryKey: ["eventOverview"] })
      void client.invalidateQueries({ queryKey: ["events", eventId] })
    },
    onError: (error) => {
      if ((error as { code?: string }).code === "CAPACITY_EXCEEDED") {
        setStep("CAPACITY")
        setIsOverCapacityConfirmed(false)
        void occupancy.refetch()
      }
    },
  })
  const savedTerms = useQuery({
    ...termStatusesQueryOptions(created?.id ?? ""),
    enabled: created !== null,
  })

  if (created && savedTerms.isPending) return <LoadingState />
  if (created && savedTerms.isError) {
    return (
      <ErrorState
        title={t("termStatus.errorTitle")}
        error={savedTerms.error}
        onRetry={() => void savedTerms.refetch()}
      />
    )
  }

  if (!created && occupancy.isPending) return <LoadingState />
  if (!created && occupancy.isError) {
    return (
      <ErrorState
        title={t("manual.title")}
        error={occupancy.error}
        onRetry={() => {
          void occupancy.refetch()
        }}
      />
    )
  }

  const capacityStatuses =
    step === "CAPACITY" && payload
      ? Object.fromEntries(payload.terms.map(({ termId, status }) => [termId, status]))
      : draft.statuses
  const capacityGender = step === "CAPACITY" && payload ? payload.gender : draft.gender
  const overCapacity = terms.filter((term) => {
    if (capacityStatuses[term.id] !== "CONFIRMED") return false
    const row = occupancy.data?.terms.find((item) => item.id === term.id)
    if (!row || capacityGender === "") return false
    return (row.byGender?.[capacityGender].free ?? row.free) < 1
  })
  const warnedTerms =
    overCapacity.length > 0
      ? overCapacity
      : terms.filter((term) => capacityStatuses[term.id] === "CONFIRMED")

  const submit = (formEvent: FormEvent) => {
    formEvent.preventDefault()
    if (mutation.isPending) return
    const nextErrors: Record<string, string> = {}
    if (!draft.firstName.trim() || !draft.lastName.trim()) {
      if (!draft.firstName.trim()) nextErrors.firstName = t("manual.nameRequired")
      if (!draft.lastName.trim()) nextErrors.lastName = t("manual.nameRequired")
    }
    const birthDate = parseDateInput(draft.birthDate)
    if (!birthDate || birthDate < "1900-01-01" || birthDate > format(new Date(), "yyyy-MM-dd")) {
      nextErrors.birthDate = t("manual.invalidDate")
    }
    if (draft.gender === "") nextErrors.gender = t("manual.gender")
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) nextErrors.email = t("manual.invalidEmail")
    const phone = normalizePhone(draft.phone)
    if (!isValidPhone(phone)) nextErrors.phone = t("manual.invalidPhone")
    if (
      draft.individualAccommodation &&
      draft.accommodationRequest.length > MAX_ACCOMMODATION_NOTE_LENGTH
    ) {
      nextErrors.accommodationRequest = t("manual.noteTooLong")
    }
    if (!draft.consent) nextErrors.consent = t("manual.consentRequired")
    const selectedTerms = terms.flatMap((term) => {
      const status = draft.statuses[term.id]
      return status ? [{ termId: term.id, status }] : []
    })
    if (selectedTerms.length === 0) nextErrors.terms = t("manual.selectTerms")
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) setInvalidSubmitCount((count) => count + 1)
    if (Object.keys(nextErrors).length > 0 || !birthDate || draft.gender === "") return
    const input: ManualApplicationInput = {
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      birthDate,
      gender: draft.gender,
      email: draft.email.trim(),
      phone,
      consent: true,
      // The note belongs to the request: without it none is sent.
      ...(draft.individualAccommodation
        ? {
            individualAccommodation: true,
            accommodationRequest: draft.accommodationRequest.trim() || null,
          }
        : {}),
      terms: selectedTerms,
    }
    setPayload(input)
    if (overCapacity.length > 0) {
      setStep("CAPACITY")
      setIsOverCapacityConfirmed(false)
    } else {
      mutation.mutate(input)
    }
  }

  const fieldA11y = (name: string) => ({
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name]
      ? `manual-${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}-error`
      : undefined,
  })
  const summaryTerms = terms.flatMap((term) => {
    const status = draft.statuses[term.id]
    return status ? [{ term, status }] : []
  })
  const summaryTotal = summaryTerms.reduce(
    (sum, { term, status }) => sum + (status === "CONFIRMED" ? term.priceCzk : 0),
    0,
  )

  return (
    <div className="flex flex-col gap-6">
      <Seo title={step === "CREATED" ? t("manual.created") : t("manual.title")} />
      {step === "CREATED" && created && savedTerms.data ? (
        <>
          <h2 className="text-2xl font-bold tracking-tight">{t("manual.created")}</h2>
          <Card className="gap-4 p-4 md:p-6">
            <h3 className="text-2xl font-bold tracking-tight">{created.name}</h3>
            {savedTerms.data.map((term) => (
              <p key={term.termId}>
                {termTitle(term)} ·{" "}
                {term.status === "CONFIRMED"
                  ? t("manual.statusConfirmed")
                  : term.status === "WAITLISTED"
                    ? t("manual.statusWaitlisted")
                    : t(`termStatus.state.${term.status}`)}{" "}
                ·{" "}
                {term.status === "CONFIRMED" ? (
                  <TermPrice amountCzk={term.priceCzk} />
                ) : (
                  t("manual.noPayment")
                )}
              </p>
            ))}
            <p>{t("manual.history", { name: organizerName })}</p>
            <p>{t("manual.emailSent")}</p>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="max-w-full self-start whitespace-normal"
            >
              <Link
                to={ROUTES.organizer.application}
                params={{ eventId, applicationId: created.id }}
              >
                {t("manual.openDetail")}
              </Link>
            </Button>
          </Card>
        </>
      ) : step === "CAPACITY" ? (
        <>
          <h2 className="text-2xl font-bold tracking-tight">{t("manual.overCapacity")}</h2>
          {warnedTerms.map((term) => {
            const row = occupancy.data?.terms.find((item) => item.id === term.id)
            const figures = capacityGender && row ? (row.byGender?.[capacityGender] ?? row) : null
            return (
              <Alert
                key={term.id}
                variant="destructive"
              >
                <AlertTitle className="line-clamp-none">
                  {t("manual.overCapacityTitle", { term: termTitle(term) })}
                </AlertTitle>
                {figures ? (
                  <AlertDescription>
                    {t("manual.overCapacityDescription", {
                      before: figures.confirmed,
                      capacity: figures.capacity,
                      after: figures.confirmed + 1,
                    })}
                  </AlertDescription>
                ) : null}
              </Alert>
            )
          })}
          <div className="flex items-center gap-3">
            <Checkbox
              id="confirm-over-capacity"
              disabled={mutation.isPending || occupancy.isFetching}
              checked={isOverCapacityConfirmed}
              onCheckedChange={(checked) => setIsOverCapacityConfirmed(checked === true)}
            />
            <Label htmlFor="confirm-over-capacity">{t("manual.confirmOverCapacity")}</Label>
          </div>
          {mutation.isError &&
          (mutation.error as { code?: string }).code !== "CAPACITY_EXCEEDED" ? (
            <Alert variant="destructive">
              <AlertDescription>{mutation.error.message}</AlertDescription>
            </Alert>
          ) : null}
          <PendingButton
            isPending={mutation.isPending}
            size="lg"
            disabled={
              !isOverCapacityConfirmed || mutation.isPending || occupancy.isFetching || !payload
            }
            onClick={() => payload && mutation.mutate({ ...payload, confirmOverCapacity: true })}
          >
            {t("manual.create")}
          </PendingButton>
          <Button
            variant="ghost"
            size="lg"
            disabled={mutation.isPending}
            onClick={() => {
              setDraft((current) => ({
                ...current,
                statuses: Object.fromEntries(
                  Object.entries(current.statuses).map(([id, status]) => [
                    id,
                    warnedTerms.some((term) => term.id === id) ? "WAITLISTED" : status,
                  ]),
                ),
              }))
              setStep("FORM")
            }}
          >
            {t("manual.returnToWaitlist")}
          </Button>
        </>
      ) : (
        <>
          <h2 className="text-2xl font-bold tracking-tight">{t("manual.title")}</h2>
          <p>{eventName}</p>
          <form
            ref={formRef}
            onSubmit={submit}
            className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start"
            noValidate
          >
            <div className="flex min-w-0 flex-col gap-6">
              <Card className="gap-4 p-4 md:p-6">
                <h3 className="text-2xl font-bold tracking-tight">{t("manual.participant")}</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div
                    data-slot="form-item"
                    className="space-y-2"
                  >
                    <Label htmlFor="manual-first-name">{t("manual.firstName")}</Label>
                    <Input
                      id="manual-first-name"
                      value={draft.firstName}
                      onChange={(e) => update("firstName", e.target.value)}
                      {...fieldA11y("firstName")}
                    />
                    <FieldError
                      id="manual-first-name-error"
                      message={errors.firstName}
                    />
                  </div>
                  <div
                    data-slot="form-item"
                    className="space-y-2"
                  >
                    <Label htmlFor="manual-last-name">{t("manual.lastName")}</Label>
                    <Input
                      id="manual-last-name"
                      value={draft.lastName}
                      onChange={(e) => update("lastName", e.target.value)}
                      {...fieldA11y("lastName")}
                    />
                    <FieldError
                      id="manual-last-name-error"
                      message={errors.lastName}
                    />
                  </div>
                  <div
                    data-slot="form-item"
                    className="space-y-2"
                  >
                    <Label htmlFor="manual-birth-date">{t("manual.birthDate")}</Label>
                    <DateField
                      id="manual-birth-date"
                      min="1900-01-01"
                      max={format(new Date(), "yyyy-MM-dd")}
                      value={draft.birthDate}
                      onChange={(value) => update("birthDate", value)}
                      {...fieldA11y("birthDate")}
                    />
                    <FieldError
                      id="manual-birth-date-error"
                      message={errors.birthDate}
                    />
                  </div>
                  <div
                    data-slot="form-item"
                    className="space-y-2"
                  >
                    <Label htmlFor="manual-gender">{t("manual.gender")}</Label>
                    <Select
                      value={draft.gender}
                      onValueChange={(value) => update("gender", value)}
                    >
                      <SelectTrigger
                        id="manual-gender"
                        className="w-full"
                        {...fieldA11y("gender")}
                      >
                        <SelectValue placeholder={t("manual.chooseGender")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FEMALE">{t("manual.genderFemale")}</SelectItem>
                        <SelectItem value="MALE">{t("manual.genderMale")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldError
                      id="manual-gender-error"
                      message={errors.gender}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="manual-individual-accommodation"
                      checked={draft.individualAccommodation}
                      onCheckedChange={(checked) =>
                        update("individualAccommodation", checked === true)
                      }
                    />
                    <Label htmlFor="manual-individual-accommodation">
                      {t("manual.individualAccommodation")}
                    </Label>
                  </div>
                  {draft.individualAccommodation ? (
                    <div
                      data-slot="form-item"
                      className="space-y-2"
                    >
                      <Label htmlFor="manual-accommodation-note">
                        {t("manual.accommodationNote")}
                      </Label>
                      <Textarea
                        id="manual-accommodation-note"
                        className="min-h-32"
                        value={draft.accommodationRequest}
                        onChange={(e) => update("accommodationRequest", e.target.value)}
                        {...fieldA11y("accommodationRequest")}
                      />
                      <FieldError
                        id="manual-accommodation-request-error"
                        message={errors.accommodationRequest}
                      />
                    </div>
                  ) : null}
                </div>
                <div
                  data-slot="form-item"
                  className="space-y-2 sm:max-w-80"
                >
                  <Label htmlFor="manual-phone">{t("manual.phone")}</Label>
                  <Input
                    id="manual-phone"
                    type="tel"
                    maxLength={MAX_PHONE_INPUT_LENGTH}
                    value={draft.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    {...fieldA11y("phone")}
                  />
                  <FieldError
                    id="manual-phone-error"
                    message={errors.phone}
                  />
                </div>
              </Card>
              <Card className="gap-4 p-4 md:p-6">
                <h3 className="text-2xl font-bold tracking-tight">{t("manual.terms")}</h3>
                <p className="text-muted-foreground">{t("manual.termsHint")}</p>
                {terms.map((term, index) => (
                  <div
                    key={term.id}
                    data-slot="form-item"
                    className="space-y-2"
                  >
                    <Label htmlFor={`manual-term-${term.id}`}>
                      {termTitle(term)} ·{" "}
                      {formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })} ·{" "}
                      <TermPrice amountCzk={term.priceCzk} />
                    </Label>
                    <Select
                      value={draft.statuses[term.id] ?? "UNSELECTED"}
                      onValueChange={(value) => {
                        setDraft((current) => ({
                          ...current,
                          statuses: {
                            ...current.statuses,
                            [term.id]: value === "UNSELECTED" ? undefined : (value as Status),
                          },
                        }))
                        setErrors((current) => ({ ...current, terms: "" }))
                      }}
                    >
                      <SelectTrigger
                        id={`manual-term-${term.id}`}
                        className="w-full"
                        {...(index === 0 ? fieldA11y("terms") : {})}
                      >
                        <SelectValue placeholder={t("manual.chooseStatus")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UNSELECTED">{t("manual.termNotSelected")}</SelectItem>
                        <SelectItem value="CONFIRMED">{t("manual.statusConfirmed")}</SelectItem>
                        <SelectItem value="WAITLISTED">{t("manual.statusWaitlisted")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                <FieldError
                  id="manual-terms-error"
                  message={errors.terms}
                />
              </Card>
              <Card className="gap-4 p-4 md:p-6">
                <h3 className="text-2xl font-bold tracking-tight">{t("manual.applicant")}</h3>
                <div
                  data-slot="form-item"
                  className="space-y-2 sm:max-w-120"
                >
                  <Label htmlFor="manual-email">{t("manual.email")}</Label>
                  <Input
                    id="manual-email"
                    type="email"
                    value={draft.email}
                    onChange={(e) => update("email", e.target.value)}
                    {...fieldA11y("email")}
                  />
                  <FieldError
                    id="manual-email-error"
                    message={errors.email}
                  />
                </div>
                <div
                  data-slot="form-item"
                  className="space-y-2"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="manual-consent"
                      checked={draft.consent}
                      onCheckedChange={(checked) => update("consent", checked === true)}
                      {...fieldA11y("consent")}
                    />
                    <Label htmlFor="manual-consent">{t("manual.consent")}</Label>
                  </div>
                  <FieldError
                    id="manual-consent-error"
                    message={errors.consent}
                  />
                </div>
              </Card>
            </div>
            <Card className="gap-4 p-4 md:p-6 lg:sticky lg:top-20">
              <h3 className="text-2xl font-bold tracking-tight">{t("manual.summary")}</h3>
              <p>
                {[
                  `${draft.firstName} ${draft.lastName}`.trim(),
                  t("manual.summaryTerms", { count: summaryTerms.length }),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {summaryTerms.map(({ term, status }) => (
                <div
                  key={term.id}
                  className="flex flex-col gap-2"
                >
                  <span className="text-sm text-muted-foreground">{termTitle(term)}</span>
                  <span>
                    {t(
                      status === "CONFIRMED" ? "manual.statusConfirmed" : "manual.statusWaitlisted",
                    )}{" "}
                    · {formatCzk(status === "CONFIRMED" ? term.priceCzk : 0)}
                  </span>
                </div>
              ))}
              <div className="flex flex-col gap-2">
                <span className="text-sm text-muted-foreground">{t("manual.summaryTotal")}</span>
                <span>{formatCzk(summaryTotal)}</span>
              </div>
              {summaryTerms.some(({ status }) => status === "WAITLISTED") ? (
                <p className="text-muted-foreground">{t("manual.summaryWaitlistNote")}</p>
              ) : null}
              {mutation.isError &&
              (mutation.error as { code?: string }).code !== "CAPACITY_EXCEEDED" ? (
                <Alert variant="destructive">
                  <AlertDescription>{mutation.error.message}</AlertDescription>
                </Alert>
              ) : null}
              <PendingButton
                type="submit"
                size="lg"
                isPending={mutation.isPending}
              >
                {mutation.isPending ? t("state.saving", { ns: "common" }) : t("manual.create")}
              </PendingButton>
              <Button
                asChild
                variant="ghost"
                size="lg"
              >
                <Link
                  to={ROUTES.organizer.eventApplications}
                  params={{ eventId }}
                >
                  {t("manual.cancel")}
                </Link>
              </Button>
            </Card>
          </form>
        </>
      )}
    </div>
  )
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p
      id={id}
      role="alert"
      className="text-sm text-field-error"
    >
      {message}
    </p>
  ) : null
}
