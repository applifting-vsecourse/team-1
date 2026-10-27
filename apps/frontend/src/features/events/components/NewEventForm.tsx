import { useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import type { TFunction } from "i18next"
import { CircleAlert, Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/atoms/BackLink"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { PageHeader } from "@/components/molecules/PageHeader"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
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
import { notify } from "@/lib/notify"

import {
  myOrganizationsQueryOptions,
  type OrganizationSummary,
} from "@/features/events/api/organizations"
import { useCreateEvent } from "@/features/events/hooks/useCreateEvent"

const createSchema = (t: TFunction<"events">) =>
  z.object({
    organizationId: z.string().min(1),
    name: z.string().trim().min(1, t("new.form.nameRequired")),
    location: z.string(),
    description: z.string(),
  })

type FormValues = z.infer<ReturnType<typeof createSchema>>

/**
 * O03a: name, organization, venue and description of a new event in a 784 px column, with
 * Cancel / Create at the bottom. Terms, prices and rooms come later.
 */
// Figma (Design system): O03a Vytvoření akce · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12264-711
// Figma (Design system): O03a Validace povinného názvu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12264-1129
export function NewEventPage() {
  const { t } = useTranslation("events")
  const { data, error, isPending, refetch } = useQuery(myOrganizationsQueryOptions())

  return (
    <div className="flex w-full max-w-196 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <BackLink to={ROUTES.organizer.events}>{t("new.back")}</BackLink>
        <PageHeader
          title={t("new.title")}
          description={t("new.description")}
        />
      </div>
      {isPending ? <LoadingState /> : null}
      {error ? (
        <ErrorState
          title={t("list.errorTitle")}
          error={error}
          onRetry={() => void refetch()}
        />
      ) : null}
      {data ? <NewEventCard organizations={data} /> : null}
    </div>
  )
}

function NewEventCard({ organizations }: { organizations: OrganizationSummary[] }) {
  const { t } = useTranslation("events")
  const navigate = useNavigate()
  const schema = useMemo(() => createSchema(t), [t])
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      organizationId: organizations[0]?.id ?? "",
      name: "",
      location: "",
      description: "",
    },
  })
  const create = useCreateEvent()

  const onSubmit = (values: FormValues) =>
    create.mutate(
      {
        organizationId: values.organizationId,
        name: values.name,
        location: values.location,
        description: values.description,
      },
      {
        onSuccess: (event) => {
          notify.success(t("list.created", { name: event.name }))
          void navigate({ to: ROUTES.organizer.events, search: { created: event.id } })
        },
      },
    )

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold tracking-tight">{t("new.form.heading")}</h2>
      </CardHeader>
      <CardContent>
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
                    {t("new.form.name")}
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
                      {t("new.form.nameHelper")}
                    </FormDescription>
                  )}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="organizationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("new.form.organization")}</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {organizations.map((organization) => (
                        <SelectItem
                          key={organization.id}
                          value={organization.id}
                        >
                          {organization.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs font-medium">
                    {t("new.form.organizationHelper")}
                  </FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("new.form.location")}</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("new.form.description")}</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-22"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <p className="text-xs font-medium text-muted-foreground">{t("new.form.required")}</p>

            {create.isError ? (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertDescription>{create.error.message}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center">
              <p className="text-sm text-muted-foreground sm:flex-1">{t("new.next")}</p>
              <Button
                asChild
                variant="outline"
                size="lg"
              >
                <Link to={ROUTES.organizer.events}>{t("new.cancel")}</Link>
              </Button>
              <Button
                type="submit"
                size="lg"
                disabled={create.isPending}
              >
                {create.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                {t("new.form.submit")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
