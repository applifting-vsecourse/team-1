import { useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { Loader2, Plus } from "lucide-react"
import { useFieldArray, useForm, type Resolver } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
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

import type { PublicEvent } from "@/features/application-form/api/publicEvent"
import { ParticipantFields } from "@/features/application-form/components/ParticipantFields"
import {
  createApplicationFormSchema,
  type ApplicationFormDraft,
  type ApplicationFormValues,
  type ParticipantDraft,
} from "@/features/application-form/lib/application-form-schema"

const emptyParticipant: ParticipantDraft = {
  firstName: "",
  lastName: "",
  birthDate: "",
  termIds: [],
}

type ApplicationFormProps = {
  event: PublicEvent
  /** Resolves when the submission is over; the button stays disabled until then. */
  onSubmit: (values: ApplicationFormValues) => void | Promise<unknown>
  /** Already translated message of a failed submission. */
  errorMessage?: string | null
  /** The submission succeeded and the page is about to change. */
  isDone?: boolean
}

/** The public application: one contact e-mail and consent, one or more participants. */
export function ApplicationForm({ event, onSubmit, errorMessage, isDone }: ApplicationFormProps) {
  const { t } = useTranslation("applicationForm")
  const schema = useMemo(() => createApplicationFormSchema(t), [t])
  const form = useForm<ApplicationFormDraft, unknown, ApplicationFormValues>({
    // The schema is the stricter twin of the draft: it also demands a gender.
    resolver: zodResolver(schema) as Resolver<ApplicationFormDraft, unknown, ApplicationFormValues>,
    defaultValues: {
      email: "",
      consent: false,
      participants: [{ ...emptyParticipant }],
    },
  })
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "participants",
  })

  const maxBirthDate = format(new Date(), "yyyy-MM-dd")
  const isSubmitting = form.formState.isSubmitting || Boolean(isDone)

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(async (values) => {
          // A second press while the first is in flight must not create a second application.
          if (isSubmitting) return
          await onSubmit(values)
        })}
        className="flex flex-col gap-8"
      >
        <section
          aria-labelledby="contact-heading"
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1">
            <h2
              id="contact-heading"
              className="text-lg font-semibold tracking-tight"
            >
              {t("form.contactHeading")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("form.contactHint")}</p>
          </div>
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
                    placeholder={t("form.emailPlaceholder")}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <section
          aria-labelledby="participants-heading"
          className="flex flex-col gap-4"
        >
          <h2
            id="participants-heading"
            className="text-lg font-semibold tracking-tight"
          >
            {t("form.participantsHeading")}
          </h2>
          {fields.map((field, index) => (
            <ParticipantFields
              key={field.id}
              index={index}
              terms={event.terms}
              maxBirthDate={maxBirthDate}
              isDisabled={isSubmitting}
              onRemove={fields.length > 1 ? () => remove(index) : undefined}
            />
          ))}
          <Button
            type="button"
            variant="outline"
            className="self-start"
            disabled={isSubmitting}
            onClick={() => append({ ...emptyParticipant })}
          >
            <Plus className="size-4" />
            {t("form.addParticipant")}
          </Button>
        </section>

        <FormField
          control={form.control}
          name="consent"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-start gap-3">
                <FormControl>
                  <Checkbox
                    className="mt-0.5"
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                    onBlur={field.onBlur}
                  />
                </FormControl>
                <FormLabel className="leading-normal font-normal">{t("form.consent")}</FormLabel>
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
          size="lg"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {isSubmitting ? t("form.submitting") : t("form.submit")}
        </Button>
      </form>
    </Form>
  )
}
