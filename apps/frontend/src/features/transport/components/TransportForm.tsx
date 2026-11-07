import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/atoms/BackLink"
import { Seo } from "@/components/atoms/Seo"
import { DateField } from "@/components/molecules/DateField"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { SectionHeader } from "@/components/molecules/SectionHeader"
import { Button } from "@/components/ui/button"
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
import { formatDate } from "@/lib/date"
import { termTitle } from "@/lib/term-label"

import {
  eventTransportQueryOptions,
  saveTransport,
  transportKeys,
  type TermTransport,
} from "@/features/transport/api/transport"
import { dayOf, fromDateTimeValue, toDateTimeValue } from "@/features/transport/lib/departure"

type Values = { termId: string; name: string; departurePlace: string; departureAt: string }

// Add or edit a way of transport of a term: name, place and time of departure. A new one can start
// as a copy of an existing one (name and place repeat; the time does not).
// Figma (Design system): #65 Upravit dopravu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-12715
// Mobile · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-12865
export function TransportForm({
  eventId,
  transportId,
  termId,
}: {
  eventId: string
  transportId?: string
  /** The term a new transport is preselected for. */
  termId?: string
}) {
  const { t } = useTranslation("transport")
  const query = useQuery(eventTransportQueryOptions(eventId))
  if (!query.data) {
    return query.isError ? (
      <ErrorState
        title={t("loadFailed")}
        error={query.error}
        onRetry={() => {
          void query.refetch()
        }}
      />
    ) : (
      <LoadingState />
    )
  }
  const { terms } = query.data
  const owner = terms.find((term) => term.transports.some((item) => item.id === transportId))
  const existing = owner?.transports.find((item) => item.id === transportId)
  return (
    <TransportFields
      key={transportId ?? "new"}
      eventId={eventId}
      transportId={transportId}
      terms={terms}
      defaults={{
        termId:
          owner?.termId ??
          terms.find((term) => term.termId === termId)?.termId ??
          terms[0]?.termId ??
          "",
        name: existing?.name ?? "",
        departurePlace: existing?.departurePlace ?? "",
        departureAt: existing ? toDateTimeValue(existing.departureAt) : "",
      }}
    />
  )
}

function TransportFields({
  eventId,
  transportId,
  terms,
  defaults,
}: {
  eventId: string
  transportId?: string
  terms: TermTransport[]
  defaults: Values
}) {
  const { t } = useTranslation("transport")
  const client = useQueryClient()
  const navigate = useNavigate()
  const required = t("required")
  const isEdit = transportId !== undefined
  const schema = z
    .object({
      termId: z.string().min(1, required),
      name: z.string().trim().min(1, required).max(100, t("tooLong")),
      departurePlace: z.string().trim().min(1, required).max(200, t("tooLong")),
      departureAt: z.string(),
    })
    .superRefine((values, context) => {
      if (fromDateTimeValue(values.departureAt) === null) {
        context.addIssue({ code: "custom", path: ["departureAt"], message: t("whenInvalid") })
        return
      }
      const term = terms.find((item) => item.termId === values.termId)
      if (term && dayOf(values.departureAt) > term.endsOn) {
        context.addIssue({
          code: "custom",
          path: ["departureAt"],
          message: t("afterTermEnd", { date: formatDate(term.endsOn) }),
        })
      }
    })
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults })
  const term = terms.find((item) => item.termId === form.watch("termId"))
  const copyable = terms.flatMap((item) =>
    item.transports
      .filter((transport) => transport.id !== transportId)
      .map((transport) => ({ ...transport, term: item })),
  )
  const mutation = useMutation({
    mutationFn: (values: Values) =>
      saveTransport(
        eventId,
        {
          name: values.name,
          departurePlace: values.departurePlace,
          departureAt: fromDateTimeValue(values.departureAt) ?? "",
        },
        transportId ? { id: transportId } : { termId: values.termId },
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: transportKeys.event(eventId) }),
  })
  const submit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(values)
    } catch {
      return
    }
    await navigate({ to: ROUTES.organizer.eventTransport, params: { eventId } })
  })

  return (
    <div className="flex flex-col gap-6">
      <Seo title={t("editTitle")} />
      <BackLink
        to={ROUTES.organizer.eventTransport}
        params={{ eventId }}
      >
        {t("back")}
      </BackLink>
      <SectionHeader title={t("editTitle")} />
      {mutation.isError ? (
        <ErrorState
          title={t("saveFailed")}
          error={mutation.error}
        />
      ) : null}
      <Form {...form}>
        <form
          noValidate
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            void submit(event)
          }}
        >
          <FormField
            control={form.control}
            name="termId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("termLabel")}</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isEdit}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {terms.map((item) => (
                      <SelectItem
                        key={item.termId}
                        value={item.termId}
                      >
                        {termTitle({ ...item, name: item.termName })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {!isEdit && copyable.length > 0 ? (
            <div className="flex flex-col gap-2">
              <FormLabel htmlFor="transport-copy">{t("copyLabel")}</FormLabel>
              <Select
                onValueChange={(id) => {
                  const source = copyable.find((item) => item.id === id)
                  if (!source) return
                  form.setValue("name", source.name, { shouldValidate: form.formState.isSubmitted })
                  form.setValue("departurePlace", source.departurePlace, {
                    shouldValidate: form.formState.isSubmitted,
                  })
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
                      {item.name} · {item.departurePlace} (
                      {termTitle({ ...item.term, name: item.term.termName })})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t("copyHint")}</p>
            </div>
          ) : null}
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
                    openOn={term?.startsOn}
                    max={term?.endsOn}
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-xs leading-[18px] font-medium">
                  {t("whenHint")}
                </FormDescription>
                <FormMessage className="text-xs leading-[18px] font-medium" />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            size="lg"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2
                aria-hidden
                className="animate-spin"
              />
            ) : null}
            {t("save")}
          </Button>
        </form>
      </Form>
    </div>
  )
}
