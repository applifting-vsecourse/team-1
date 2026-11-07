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
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { SectionHeader } from "@/components/molecules/SectionHeader"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import {
  eventTransportQueryOptions,
  saveTransport,
  transportKeys,
} from "@/features/transport/api/transport"
import { fromDateTimeLocal, toDateTimeLocal } from "@/features/transport/lib/departure"

// Add or edit a way of transport: name, place and time of departure.
// Figma (Design system): #65 Upravit dopravu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-12715
// Mobile · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-12865
export function TransportForm({ eventId, transportId }: { eventId: string; transportId?: string }) {
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
  const existing = query.data.transports.find((item) => item.id === transportId)
  return (
    <TransportFields
      eventId={eventId}
      transportId={transportId}
      defaults={{
        name: existing?.name ?? "",
        departurePlace: existing?.departurePlace ?? "",
        departureAt: existing ? toDateTimeLocal(existing.departureAt) : "",
      }}
    />
  )
}

function TransportFields({
  eventId,
  transportId,
  defaults,
}: {
  eventId: string
  transportId?: string
  defaults: { name: string; departurePlace: string; departureAt: string }
}) {
  const { t } = useTranslation("transport")
  const client = useQueryClient()
  const navigate = useNavigate()
  const required = t("required")
  const schema = z.object({
    name: z.string().trim().min(1, required).max(100, t("tooLong")),
    departurePlace: z.string().trim().min(1, required).max(200, t("tooLong")),
    departureAt: z.string().refine((value) => fromDateTimeLocal(value) !== null, required),
  })
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  })
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      saveTransport(
        eventId,
        {
          name: values.name,
          departurePlace: values.departurePlace,
          departureAt: fromDateTimeLocal(values.departureAt) ?? "",
        },
        transportId,
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
                  <Input
                    {...field}
                    type="datetime-local"
                  />
                </FormControl>
                <FormMessage />
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
