import { useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm, type Resolver } from "react-hook-form"
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
import { ParticipantFields } from "@/features/application-form/components/ParticipantFields"
import {
  createApplicationFormSchema,
  type ApplicationFormDraft,
  type ApplicationFormValues,
  type ParticipantDraft,
} from "@/features/application-form/lib/application-form-schema"

// Figma (Design system): the form part of V07 / V07a (desktop) and M02 / M02a (360 px);
// errors M03, sending M04.
// https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12666-18899

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

/** The public application: participants first, then the contact, consent and the one primary action. */
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
        className="flex flex-col gap-6"
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
          className="w-full sm:w-auto sm:self-start"
          disabled={isSubmitting}
          onClick={() => append({ ...emptyParticipant })}
        >
          {t("form.addParticipant")}
        </Button>

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

        <p className="text-xs font-medium text-muted-foreground">{t("form.requiredNote")}</p>
      </form>
    </Form>
  )
}
