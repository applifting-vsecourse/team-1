import { useEffect, useMemo, useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Plus, TriangleAlert } from "lucide-react"
import { useFieldArray, useForm, useWatch, type FieldErrors, type Resolver } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { BrandDivider } from "@/components/atoms/BrandDivider"
import { PendingButton } from "@/components/atoms/PendingButton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import type { PublicEvent } from "@/features/application-form/api/publicEvent"
import {
  ApplicationReview,
  type ReviewField,
} from "@/features/application-form/components/ApplicationReview"
import { ApplicationSteps } from "@/features/application-form/components/ApplicationSteps"
import { ClearFormDialog } from "@/features/application-form/components/ClearFormDialog"
import { EventSummary } from "@/features/application-form/components/EventSummary"
import { ParticipantFields } from "@/features/application-form/components/ParticipantFields"
import { PriceSummary } from "@/features/application-form/components/PriceSummary"
import {
  clearApplicationDraft,
  emptyApplicationDraft,
  loadApplicationDraft,
  saveApplicationDraft,
} from "@/features/application-form/lib/application-draft"
import {
  createApplicationFormSchema,
  type ApplicationFormDraft,
  type ApplicationFormValues,
  type ParticipantDraft,
} from "@/features/application-form/lib/application-form-schema"
import { focusFirstInvalidField } from "@/features/application-form/lib/focus-first-invalid"
import { priceOfSelection, totalPrice } from "@/features/application-form/lib/selection-price"

// Figma (Design system): the form part of V07 / V07a (desktop) and M02 / M02a (360 px);
// errors M03, sending M04.
// https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15507-914 (mobile 15507-1033)
// Errors with the summary: https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15506-544
// Review step with "Zpět k úpravám": https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15506-941

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
  const prices = participants.map((participant) =>
    priceOfSelection(event.terms, participant?.termIds ?? []),
  )
  const priceRows = prices.map((price, index) => {
    const participant = participants[index]
    const name = [participant?.firstName, participant?.lastName].filter(Boolean).join(" ").trim()
    return {
      ...price,
      label: name !== "" ? name : t("form.participantTitle", { number: index + 1 }),
    }
  })

  const draft = useWatch({ control: form.control })
  useEffect(() => {
    if (!draftKey) return
    // After a successful submission the saved form is gone for good and must not be written again.
    if (isDone) clearApplicationDraft(draftKey)
    else saveApplicationDraft(draftKey, draft as ApplicationFormDraft)
  }, [draft, draftKey, isDone])

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
        className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] [&_[data-slot=form-item]]:scroll-mt-24"
        data-invalid-submit={invalidSubmitCount > 0 || undefined}
        data-restored={restoredDraft ? true : undefined}
      >
        <div className="flex min-w-0 flex-col gap-6">
          <h1
            ref={heading}
            tabIndex={-1}
            className="text-2xl font-bold tracking-tight outline-none md:text-[32px]/10"
          >
            {review ? t("review.title") : t("form.heading", { event: event.name })}
          </h1>
          <ApplicationSteps isReview={Boolean(review)} />
          <p>{t(review ? "review.intro" : "form.intro")}</p>
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
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-secondary p-4">
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
                      <FormDescription className="text-xs font-medium">
                        {t("form.emailHint")}
                      </FormDescription>
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

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("form.requiredNote")}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isSubmitting}
                  onClick={() => setIsClearing(true)}
                >
                  {t("form.clear")}
                </Button>
              </div>
            </>
          )}
        </div>
        <aside className="min-w-0 lg:sticky lg:top-24">
          <PriceSummary
            rows={priceRows}
            totalCzk={totalPrice(prices)}
          >
            {errorMessage ? (
              <Alert
                variant="destructive"
                tabIndex={-1}
              >
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            ) : null}
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
            {review ? (
              <Button
                type="button"
                variant="ghost"
                className="w-fit rounded-full bg-accent px-4 text-link hover:bg-accent/80 has-[>svg]:px-4"
                disabled={isSubmitting}
                onClick={backToEditing}
              >
                <ArrowLeft aria-hidden />
                {t("review.backToEditing")}
              </Button>
            ) : null}
            {isSubmitting ? (
              <p
                role="status"
                className="text-xs font-medium text-muted-foreground"
              >
                {t("form.submittingHint")}
              </p>
            ) : null}
          </PriceSummary>
        </aside>
      </form>
      <ClearFormDialog
        isOpen={isClearing}
        onOpenChange={setIsClearing}
        onConfirm={clearForm}
      />
    </Form>
  )
}
