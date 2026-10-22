import { useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import type { TFunction } from "i18next"
import { CircleAlert, Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

import type { EventTerm } from "@/features/events/api/terms"
import { useCreateTerm, useUpdateTerm } from "@/features/events/hooks/useTermMutations"

const createSchema = (t: TFunction<"events">) =>
  z
    .object({
      name: z.string().trim().min(1, t("terms.form.fieldRequired")),
      startsOn: z.string().min(1, t("terms.form.fieldRequired")),
      endsOn: z.string().min(1, t("terms.form.fieldRequired")),
      priceCzk: z.string().regex(/^\d{1,7}$/, t("terms.form.priceRequired")),
    })
    .refine((values) => !values.startsOn || !values.endsOn || values.endsOn >= values.startsOn, {
      path: ["endsOn"],
      message: t("terms.form.endBeforeStart"),
    })

type FormValues = z.infer<ReturnType<typeof createSchema>>

type TermFormDialogProps = {
  eventId: string
  eventName: string
  /** The term being edited; without it the dialog adds a new one. */
  term: EventTerm | null
  onClose: () => void
  onSaved: (kind: "added" | "edited", term: EventTerm) => void
  /** Opens the cancel confirmation of the edited term. */
  onCancelTerm: (term: EventTerm) => void
}

/**
 * X16 / X16a / X17: add or edit a term — name, period and price per person.
 * The dialog is mounted only while open, so its form always starts fresh.
 */
// Figma (Design system): X16 Přidat termín · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12283-2
// Figma (Design system): X16a Přidat termín · neplatná data · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12283-675
// Figma (Design system): X16b Přidat termín · chybí cena · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12639-295
// Figma (Design system): X17 Upravit termín · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12283-302
export function TermFormDialog({
  eventId,
  eventName,
  term,
  onClose,
  onSaved,
  onCancelTerm,
}: TermFormDialogProps) {
  const { t } = useTranslation("events")
  const schema = useMemo(() => createSchema(t), [t])
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: term?.name ?? "",
      startsOn: term?.startsOn ?? "",
      endsOn: term?.endsOn ?? "",
      priceCzk: term ? String(term.priceCzk) : "",
    },
  })
  const create = useCreateTerm(eventId)
  const update = useUpdateTerm(eventId, term?.id ?? "")
  const mutation = term ? update : create

  const onSubmit = (values: FormValues) =>
    mutation.mutate(
      {
        name: values.name,
        startsOn: values.startsOn,
        endsOn: values.endsOn,
        priceCzk: Number(values.priceCzk),
      },
      { onSuccess: (saved) => onSaved(term ? "edited" : "added", saved) },
    )

  return (
    <Dialog
      open
      onOpenChange={(isOpen) => (isOpen ? undefined : onClose())}
    >
      <DialogContent className="gap-4 p-6 sm:max-w-170">
        <DialogHeader>
          <p className="text-xs font-medium text-muted-foreground uppercase">{eventName}</p>
          <DialogTitle className="text-lg tracking-tight">
            {term ? t("terms.form.editTitle") : t("terms.form.addTitle")}
          </DialogTitle>
          <DialogDescription>{t("terms.form.description")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            noValidate
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="data-[error=true]:text-foreground">
                    {t("terms.form.name")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  {form.formState.errors.name ? (
                    <FormMessage className="text-xs font-medium" />
                  ) : (
                    <FormDescription className="text-xs font-medium">
                      {t("terms.form.nameHelper")}
                    </FormDescription>
                  )}
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startsOn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="data-[error=true]:text-foreground">
                      {t("terms.form.startsOn")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs font-medium" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endsOn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="data-[error=true]:text-foreground">
                      {t("terms.form.endsOn")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs font-medium" />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="priceCzk"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="data-[error=true]:text-foreground">
                    {t("terms.form.price")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      {...field}
                    />
                  </FormControl>
                  {form.formState.errors.priceCzk ? (
                    <FormMessage className="text-xs font-medium" />
                  ) : (
                    <FormDescription className="text-xs font-medium">
                      {t("terms.form.priceHelper")}
                    </FormDescription>
                  )}
                </FormItem>
              )}
            />
            <p className="text-xs font-medium text-muted-foreground">{t("terms.form.required")}</p>

            {mutation.isError ? (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertDescription>{mutation.error.message}</AlertDescription>
              </Alert>
            ) : null}

            <DialogFooter>
              {term ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="lg"
                  onClick={() => onCancelTerm(term)}
                >
                  {t("terms.cancel")}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={onClose}
              >
                {t("terms.form.close")}
              </Button>
              <Button
                type="submit"
                size="lg"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                {term ? t("terms.form.save") : t("terms.form.submitAdd")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
