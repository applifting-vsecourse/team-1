import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { DateField } from "@/components/molecules/DateField"
import { ErrorState } from "@/components/molecules/ErrorState"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { formatDate } from "@/lib/date"
import { termTitle } from "@/lib/term-label"

import {
  saveTransport,
  transportKeys,
  type TermTransport,
  type TransportKind,
  type TransportSummary,
} from "@/features/transport/api/transport"
import { dayOf, fromDateTimeValue, toDateTimeValue } from "@/features/transport/lib/departure"

type Values = { name: string; departurePlace: string; departureAt: string; instructions: string }

// Add or edit a way of transport of a term: a ride (name, place and time of departure) or own
// transport (only instructions). Both can carry optional instructions for the participant.
// Design proposal (US-402), in the pattern of the room dialog. Based on Figma (Design system): #65 Upravit dopravu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-12715
export function TransportDialog({
  eventId,
  term,
  kind,
  transport,
  copyable,
  onClose,
}: {
  eventId: string
  term: TermTransport
  kind: TransportKind
  /** Present when editing. */
  transport?: TransportSummary
  /** Rides of other terms to start a new one from. */
  copyable: TransportSummary[]
  onClose: () => void
}) {
  const { t } = useTranslation("transport")
  const client = useQueryClient()
  const required = t("required")
  const isRide = kind === "SCHEDULED"
  const schema = z
    .object({
      name: isRide ? z.string().trim().min(1, required).max(100, t("tooLong")) : z.string(),
      departurePlace: isRide
        ? z.string().trim().min(1, required).max(200, t("tooLong"))
        : z.string(),
      departureAt: z.string(),
      instructions: z.string().trim().max(2000, t("tooLong")),
    })
    .superRefine((values, context) => {
      if (!isRide) return
      if (fromDateTimeValue(values.departureAt) === null) {
        context.addIssue({ code: "custom", path: ["departureAt"], message: t("whenInvalid") })
      } else if (dayOf(values.departureAt) > term.endsOn) {
        context.addIssue({
          code: "custom",
          path: ["departureAt"],
          message: t("afterTermEnd", { date: formatDate(term.endsOn) }),
        })
      }
    })
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: transport?.name ?? "",
      departurePlace: transport?.departurePlace ?? "",
      departureAt: transport?.departureAt ? toDateTimeValue(transport.departureAt) : "",
      instructions: transport?.instructions ?? "",
    },
  })
  const mutation = useMutation({
    mutationFn: (values: Values) => {
      const input = isRide
        ? {
            name: values.name,
            departurePlace: values.departurePlace,
            departureAt: fromDateTimeValue(values.departureAt) ?? "",
            instructions: values.instructions,
          }
        : { instructions: values.instructions }
      return saveTransport(
        eventId,
        input,
        transport ? { id: transport.id } : { termId: term.termId, kind },
      )
    },
    onSuccess: () => client.invalidateQueries({ queryKey: transportKeys.event(eventId) }),
  })
  const submit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(values)
    } catch {
      return
    }
    onClose()
  })
  const isPending = mutation.isPending || form.formState.isSubmitting
  const title = isRide
    ? t(transport ? "editTitle" : "addTitle")
    : t(transport ? "editOwnTitle" : "addOwnTitle")
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !isPending) onClose()
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto bg-card shadow-md sm:max-w-170">
        <p className="text-xs font-medium text-muted-foreground uppercase">
          {termTitle({ ...term, name: term.termName })}
        </p>
        <DialogTitle className="pr-8">{title}</DialogTitle>
        <DialogDescription className="text-base">
          {t(isRide ? "rideDescription" : "ownDescription")}
        </DialogDescription>
        <Form {...form}>
          <form
            noValidate
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              void submit(event)
            }}
          >
            <fieldset
              disabled={isPending}
              className="flex flex-col gap-4"
            >
              {isRide && !transport && copyable.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <FormLabel htmlFor="transport-copy">{t("copyLabel")}</FormLabel>
                  <Select
                    onValueChange={(id) => {
                      const source = copyable.find((item) => item.id === id)
                      if (!source) return
                      form.setValue("name", source.name)
                      form.setValue("departurePlace", source.departurePlace ?? "")
                      form.setValue("instructions", source.instructions ?? "")
                    }}
                  >
                    <SelectTrigger
                      id="transport-copy"
                      className="w-full"
                    >
                      <SelectValue placeholder={t("copyPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {copyable.map((item) => (
                        <SelectItem
                          key={item.id}
                          value={item.id}
                        >
                          {item.name} · {item.departurePlace}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{t("copyHint")}</p>
                </div>
              ) : null}
              {isRide ? (
                <>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("nameLabel")}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            maxLength={100}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="departurePlace"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("placeLabel")}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            maxLength={200}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="departureAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("whenLabel")}</FormLabel>
                        <FormControl>
                          <DateField
                            hasTime
                            openOn={term.startsOn}
                            max={term.endsOn}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">{t("whenHint")}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              ) : null}
              <FormField
                control={form.control}
                name="instructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("instructionsLabel")}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={4}
                        maxLength={2000}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">{t("instructionsHint")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>
            {mutation.isError ? (
              <ErrorState
                title={t("saveFailed")}
                error={mutation.error}
              />
            ) : null}
            <DialogFooter className="gap-4">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="sm:w-38"
                  disabled={isPending}
                >
                  {t("cancel")}
                </Button>
              </DialogClose>
              <Button
                type="submit"
                size="lg"
                className="sm:w-38"
                disabled={isPending}
              >
                {isPending ? <Loader2 className="animate-spin" /> : null}
                {t("save")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
