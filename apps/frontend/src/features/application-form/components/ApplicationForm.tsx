import { useEffect, useMemo, useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm, useWatch, type Resolver } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { ClearFormDialog } from "@/features/application-form/components/ClearFormDialog"
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

const emptyParticipant: ParticipantDraft = {
  firstName: "",
  lastName: "",
  birthDate: "",
  individualAccommodation: false,
  accommodationRequest: "",
  termIds: [],
}

type ApplicationFormProps = {
  event: PublicEvent
  /** The application link; the unsent form is kept in sessionStorage under it. Without it nothing is kept. */
  draftKey?: string
  /** Resolves when the submission is over; the button stays disabled until then. */
  onSubmit: (values: ApplicationFormValues) => void | Promise<unknown>
  /** Already translated message of a failed submission. */
  errorMessage?: string | null
  /** The submission succeeded and the page is about to change. */
  isDone?: boolean
}

/** The public application: participants first, then the contact, consent and the one primary action. */
export function ApplicationForm({
  event,
  draftKey,
  onSubmit,
  errorMessage,
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
    if (invalidSubmitCount > 0 && formRef.current) focusFirstInvalidField(formRef.current)
  }, [invalidSubmitCount])
  const { fields, append, remove } = useFieldArray({
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
    form.reset(emptyApplicationDraft())
    if (draftKey) clearApplicationDraft(draftKey)
    setIsClearing(false)
  }

  const isSubmitting = form.formState.isSubmitting || Boolean(isDone)

  return (
    <Form {...form}>
      <form
        ref={formRef}
        noValidate
        onSubmit={form.handleSubmit(
          async (values) => {
            // A second press while the first is in flight must not create a second application.
            if (isSubmitting) return
            await onSubmit(values)
          },
          () => setInvalidSubmitCount((count) => count + 1),
        )}
        className="flex flex-col gap-6 [&_[data-slot=form-item]]:scroll-mt-24"
        data-invalid-submit={invalidSubmitCount > 0 || undefined}
        data-restored={restoredDraft ? true : undefined}
      >
        {fields.map((field, index) => (
          <ParticipantFields
            key={field.id}
            index={index}
            terms={event.terms}
            isDisabled={isSubmitting}
            onRemove={index > 0 ? () => remove(index) : undefined}
          />
        ))}

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full sm:w-auto sm:self-start"
          disabled={isSubmitting}
          onClick={() => append({ ...emptyParticipant })}
        >
          {t("form.addParticipant")}
        </Button>

        <PriceSummary
          rows={priceRows}
          totalCzk={totalPrice(prices)}
        />

        <Card className="gap-4 p-4 sm:p-6">
          <h2 className="text-lg font-bold">{t("form.contactHeading")}</h2>
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
                <FormDescription className="text-xs font-medium">
                  {t("form.emailHint")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="consent"
            render={({ field }) => (
              <FormItem>
                <div className="flex min-h-11 items-center gap-3">
                  <FormControl>
                    <Checkbox
                      className="size-5"
                      checked={field.value}
                      onCheckedChange={(isChecked) => field.onChange(isChecked === true)}
                      onBlur={field.onBlur}
                    />
                  </FormControl>
                  <FormLabel className="flex-1 cursor-pointer self-stretch leading-5 font-normal">
                    {t("form.consent")}
                  </FormLabel>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {errorMessage ? (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          <Button
            type="submit"
            aria-busy={form.formState.isSubmitting}
            size="lg"
            className="w-full sm:w-auto sm:self-start"
            disabled={isSubmitting}
          >
            {isSubmitting ? t("form.submitting") : t("form.submit")}
          </Button>
          {isSubmitting ? (
            <p
              role="status"
              className="text-xs font-medium text-muted-foreground"
            >
              {t("form.submittingHint")}
            </p>
          ) : null}
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-medium text-muted-foreground">{t("form.requiredNote")}</p>
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting}
            onClick={() => setIsClearing(true)}
          >
            {t("form.clear")}
          </Button>
        </div>
      </form>
      <ClearFormDialog
        isOpen={isClearing}
        onOpenChange={setIsClearing}
        onConfirm={clearForm}
      />
    </Form>
  )
}
