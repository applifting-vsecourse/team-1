import { useEffect, useMemo, useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, Plus, TriangleAlert } from "lucide-react"
import { useFieldArray, useForm, useWatch, type FieldErrors, type Resolver } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { BackButton } from "@/components/atoms/BackLink"
import { BrandDivider } from "@/components/atoms/BrandDivider"
import { PendingButton } from "@/components/atoms/PendingButton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { focusFirstInvalidField } from "@/lib/focus-first-invalid"
import { cn } from "@/lib/utils"

import type { PublicEvent } from "@/features/application-form/api/publicEvent"
import {
  ApplicationReview,
  type ReviewField,
} from "@/features/application-form/components/ApplicationReview"
import { ApplicationSteps } from "@/features/application-form/components/ApplicationSteps"
import { ClearFormDialog } from "@/features/application-form/components/ClearFormDialog"
import { EventSummary } from "@/features/application-form/components/EventSummary"
import { ParticipantFields } from "@/features/application-form/components/ParticipantFields"
import { PriceBar, PriceSummary } from "@/features/application-form/components/PriceSummary"
import { useIsWideLayout } from "@/features/application-form/hooks/useIsWideLayout"
import {
  canKeepApplicationDrafts,
  clearApplicationDraft,
  emptyApplicationDraft,
  isEmptyApplicationDraft,
  loadApplicationDraft,
  saveApplicationDraft,
} from "@/features/application-form/lib/application-draft"
import {
  createApplicationFormSchema,
  type ApplicationFormDraft,
  type ApplicationFormValues,
  type ParticipantDraft,
} from "@/features/application-form/lib/application-form-schema"
import {
  priceOfSelection,
  priceRows,
  totalPrice,
} from "@/features/application-form/lib/selection-price"

// Figma (Design system): the form part of V07 / V07a (desktop) and M02 / M02a (360 px);
// errors M03, sending M04.
// https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15507-914 (mobile 15507-1033)
// Filled in, with the draft saved: https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15506-66 (mobile 15506-172)
// Errors with the summary: https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15506-544
// Review step with "Zpět k úpravám": https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15506-941 (mobile 15506-1081)
// Draft: „Koncept uložen“ 27443-16688 (mobile 27443-16716), „Začít znovu“ 27443-16693 (mobile 27443-16721)

/** How many fields carry an error: every leaf of the error tree with a message. */
function countErrors(errors: FieldErrors | undefined): number {
  if (!errors) return 0
  return Object.values(errors).reduce<number>((sum, error) => {
    if (!error || typeof error !== "object") return sum
    if ("message" in error && typeof error.message === "string") return sum + 1
    return sum + countErrors(error as FieldErrors)
  }, 0)
}

const emptyParticipant: ParticipantDraft = {
  firstName: "",
  lastName: "",
  birthDate: "",
  individualAccommodation: false,
  accommodationRequest: "",
  termIds: [],
}

type SubmissionConflict = {
  duplicate: { participantIndex: number; termId: string; term: string } | null
}

type ApplicationFormProps = {
  event: PublicEvent
  /** The application link; the unsent form is kept in sessionStorage under it. Without it nothing is kept. */
  draftKey?: string
  /** Resolves when the submission is over; the button stays disabled until then. */
  onSubmit: (values: ApplicationFormValues) => void | Promise<void | SubmissionConflict>
  /** Already translated message of a failed submission. */
  errorMessage?: string | null
  onReview?: () => void
  /** The submission succeeded and the page is about to change. */
  isDone?: boolean
}

/** The public application: participants first, then the contact, consent and the one primary action. */
export function ApplicationForm({
  event,
  draftKey,
  onSubmit,
  errorMessage,
  onReview,
  isDone,
}: ApplicationFormProps) {
  const { t } = useTranslation("applicationForm")
  const schema = useMemo(() => createApplicationFormSchema(t), [t])
  // Read once: what was typed before a reload comes back, the consent never does.
  const [restoredDraft] = useState(() =>
    draftKey
      ? loadApplicationDraft(
          draftKey,
          event.terms.map((term) => term.id),
        )
      : null,
  )
  const [isClearing, setIsClearing] = useState(false)
  const form = useForm<ApplicationFormDraft, unknown, ApplicationFormValues>({
    // The schema is the stricter twin of the draft: it also demands a gender.
    resolver: zodResolver(schema) as Resolver<ApplicationFormDraft, unknown, ApplicationFormValues>,
    defaultValues: restoredDraft ?? emptyApplicationDraft(),
    // Our own handler below: it also reaches selects and checkbox tiles and clears the sticky header.
    shouldFocusError: false,
  })
  const formRef = useRef<HTMLFormElement>(null)
  const [invalidSubmitCount, setInvalidSubmitCount] = useState(0)
  // After the failed submission has rendered its errors, the first invalid control is in the DOM.
  useEffect(() => {
    const element = formRef.current
    if (!element || invalidSubmitCount === 0 || focusFirstInvalidField(element)) return
    // Field controllers can publish their aria-invalid state after the form renders.
    const frame = requestAnimationFrame(() => {
      if (!focusFirstInvalidField(element)) {
        element.querySelector<HTMLElement>('[role="alert"]')?.focus()
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [invalidSubmitCount])
  const [review, setReview] = useState<ApplicationFormValues | null>(null)
  const nextField = useRef<ReviewField | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const isSending = useRef(false)
  const [removed, setRemoved] = useState<{ index: number; person: ParticipantDraft } | null>(null)
  const { setFocus } = form
  useEffect(() => {
    if (review) heading.current?.focus()
    else if (nextField.current) {
      setFocus(nextField.current)
      nextField.current = null
    }
  }, [review, setFocus])
  const edit = (field: ReviewField) => {
    nextField.current = field
    setReview(null)
  }
  const backToEditing = () => {
    setReview(null)
    // The heading is the same element in both steps; focus it so the step change is announced.
    heading.current?.focus()
  }
  const { fields, append, insert, remove } = useFieldArray({
    control: form.control,
    name: "participants",
  })

  const participants = useWatch({ control: form.control, name: "participants" })
  const totalCzk = totalPrice(
    participants.map((participant) => priceOfSelection(event.terms, participant?.termIds ?? [])),
  )
  const rows = priceRows(
    event.terms,
    participants.map((participant, index) => {
      const name = [participant?.firstName, participant?.lastName].filter(Boolean).join(" ").trim()
      return {
        label: name !== "" ? name : t("form.participantTitle", { number: index + 1 }),
        termIds: participant?.termIds ?? [],
      }
    }),
  )
  const isWide = useIsWideLayout()

  const draft = useWatch({ control: form.control })
  useEffect(() => {
    if (!draftKey) return
    // After a successful submission the saved form is gone for good and must not be written again.
    if (isDone) clearApplicationDraft(draftKey)
    else saveApplicationDraft(draftKey, draft as ApplicationFormDraft)
  }, [draft, draftKey, isDone])
  const [canKeepDraft] = useState(() => Boolean(draftKey) && canKeepApplicationDrafts())
  const hasEntries = !isEmptyApplicationDraft(draft as ApplicationFormDraft)
  const isDraftSaved = canKeepDraft && hasEntries && !isDone

  const clearForm = () => {
    setRemoved(null)
    form.reset(emptyApplicationDraft())
    if (draftKey) clearApplicationDraft(draftKey)
    setIsClearing(false)
  }

  const isSubmitting = (Boolean(review) && form.formState.isSubmitting) || Boolean(isDone)
  // Read on every render: the form state proxy only keeps the errors fresh once they are subscribed to.
  const { errors } = form.formState
  const errorCount = invalidSubmitCount > 0 ? countErrors(errors) : 0
  const submissionAlert = errorMessage ? (
    <Alert
      variant="destructive"
      tabIndex={-1}
    >
      <AlertDescription>{errorMessage}</AlertDescription>
    </Alert>
  ) : null
  const submitButton = (
    <PendingButton
      key={review ? "send" : "review"}
      type="submit"
      isPending={isSubmitting && !isDone}
      disabled={isDone}
      size="lg"
      className="w-full"
    >
      {t(isSubmitting ? "form.submitting" : review ? "form.submit" : "review.continue")}
    </PendingButton>
  )

  return (
    <Form {...form}>
      <form
        ref={formRef}
        noValidate
        onSubmit={(submitEvent) =>
          form.handleSubmit(
            async (values) => {
              // A second press while the first is in flight must not create a second application.
              if (isSending.current || isDone) return
              if (!review) {
                onReview?.()
                setReview(values)
                return
              }
              isSending.current = true
              try {
                const conflict = await onSubmit(values)
                if (conflict) {
                  const target = conflict.duplicate
                  if (
                    target &&
                    values.participants[target.participantIndex]?.termIds.includes(target.termId)
                  ) {
                    form.setError(`participants.${target.participantIndex}.termIds`, {
                      type: "duplicate",
                      types: { termId: target.termId },
                      message: t("form.errors.duplicateTerm", { term: target.term }),
                    })
                  }
                  setReview(null)
                  setInvalidSubmitCount((count) => count + 1)
                }
              } finally {
                isSending.current = false
              }
            },
            () => setInvalidSubmitCount((count) => count + 1),
          )(submitEvent)
        }
        // Below `lg` the fixed price bar sets `scroll-padding-bottom` on the page (global.css), so the
        // field that gets focus never ends up under it (WCAG 2.4.11).
        className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] [&_[data-slot=form-item]]:scroll-mt-24"
        data-invalid-submit={invalidSubmitCount > 0 || undefined}
        data-restored={restoredDraft ? true : undefined}
      >
        {/* The review step is denser (Figma 18923:4544 / 4624). */}
        <div className={cn("flex min-w-0 flex-col", review ? "gap-4" : "gap-6")}>
          {review ? (
            <BackButton
              disabled={isSubmitting}
              onClick={backToEditing}
            >
              {t("review.backToEditing")}
            </BackButton>
          ) : null}
          <h1
            ref={heading}
            tabIndex={-1}
            className="text-2xl font-bold tracking-tight outline-none md:text-[32px]/10"
          >
            {review ? t("review.title") : t("form.heading", { event: event.name })}
          </h1>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <ApplicationSteps isReview={Boolean(review)} />
            {/* Always present, so the first save is announced (WCAG 4.1.3); it says it once, not per key. */}
            <p
              role="status"
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              {isDraftSaved && !review ? (
                <>
                  <Check
                    aria-hidden
                    className="size-5 text-primary"
                  />
                  {t("form.draftSaved")}
                </>
              ) : null}
            </p>
          </div>
          {review ? (
            <ApplicationReview
              values={review}
              terms={event.terms}
              onEdit={edit}
              isSubmitting={isSubmitting}
            />
          ) : (
            <>
              <BrandDivider />
              <EventSummary event={event} />
              {errorCount > 0 ? (
                <div className="flex flex-col items-start gap-2">
                  <Alert variant="destructive">
                    <TriangleAlert aria-hidden />
                    <AlertTitle>{t("form.errorSummary.title", { count: errorCount })}</AlertTitle>
                    <AlertDescription>{t("form.errorSummary.description")}</AlertDescription>
                  </Alert>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      if (formRef.current) focusFirstInvalidField(formRef.current)
                    }}
                  >
                    {t("form.errorSummary.goToFirst")}
                  </Button>
                </div>
              ) : null}
              {fields.map((field, index) => (
                <ParticipantFields
                  key={field.id}
                  index={index}
                  terms={event.terms}
                  isDisabled={isSubmitting}
                  onRemove={
                    fields.length > 1
                      ? () => {
                          setRemoved({ index, person: form.getValues(`participants.${index}`) })
                          remove(index)
                        }
                      : undefined
                  }
                />
              ))}

              <Button
                type="button"
                variant="ghost"
                size="lg"
                className="w-full sm:w-auto sm:self-start"
                disabled={isSubmitting}
                onClick={() => append({ ...emptyParticipant })}
              >
                <Plus aria-hidden />
                {t("form.addParticipant")}
              </Button>

              {removed && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-strong bg-secondary p-4 nested:border-border">
                  <p role="status">
                    {removed.person.firstName.trim() &&
                    removed.person.lastName.trim() &&
                    removed.person.gender
                      ? t(
                          removed.person.gender === "FEMALE"
                            ? "review.removedFemale"
                            : "review.removedMale",
                          { name: `${removed.person.firstName} ${removed.person.lastName}` },
                        )
                      : t("review.removed", { number: removed.index + 1 })}
                  </p>
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => {
                      insert(removed.index, removed.person)
                      setRemoved(null)
                    }}
                  >
                    {t("review.undo")}
                  </Button>
                </div>
              )}
              <Card className="gap-4 p-[15px]">
                <h2 className="text-2xl font-semibold">{t("form.contactHeading")}</h2>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.email")}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          autoComplete="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="consent"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex min-h-11 items-center gap-4">
                        <FormControl>
                          <Checkbox
                            className="size-5"
                            checked={field.value}
                            onCheckedChange={(isChecked) => field.onChange(isChecked === true)}
                            onBlur={field.onBlur}
                          />
                        </FormControl>
                        <FormLabel className="flex-1 cursor-pointer self-stretch text-base leading-6 font-normal">
                          {t("form.consent")}
                        </FormLabel>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Card>

              {hasEntries ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  className="w-full sm:w-auto sm:self-start"
                  disabled={isSubmitting}
                  onClick={() => setIsClearing(true)}
                >
                  {t("form.clear")}
                </Button>
              ) : null}
            </>
          )}
        </div>
        {isWide ? (
          <aside className="min-w-0 lg:sticky lg:top-24">
            <PriceSummary
              rows={rows}
              totalCzk={totalCzk}
              isReview={Boolean(review)}
              alert={submissionAlert}
              action={submitButton}
            />
          </aside>
        ) : (
          <PriceBar
            rows={rows}
            totalCzk={totalCzk}
            alert={submissionAlert}
            action={submitButton}
          />
        )}
      </form>
      <ClearFormDialog
        isOpen={isClearing}
        onOpenChange={setIsClearing}
        onConfirm={clearForm}
        focusAfterClear={() => heading.current?.focus()}
      />
    </Form>
  )
}
