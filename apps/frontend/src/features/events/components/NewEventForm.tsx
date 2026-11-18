import { useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import type { TFunction } from "i18next"
import { CircleAlert } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
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
  const navigate = useNavigate()
  const create = useCreateEvent()
  const { data, error, isPending, refetch } = useQuery(myOrganizationsQueryOptions())

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !create.isPending)
          void navigate({ to: ROUTES.organizer.events, replace: true })
      }}
    >
      <DialogContent
        showCloseButton={!create.isPending}
        className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"
      >
        <DialogHeader>
          <DialogTitle>{t("new.title")}</DialogTitle>
          <DialogDescription>{t("new.description")}</DialogDescription>
        </DialogHeader>
        {isPending ? <LoadingState /> : null}
        {error ? (
          <ErrorState
            title={t("list.errorTitle")}
            error={error}
            onRetry={() => void refetch()}
          />
        ) : null}
        {data ? (
          <NewEventCard
            organizations={data}
            create={create}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function NewEventCard({
  organizations,
  create,
}: {
  organizations: OrganizationSummary[]
  create: ReturnType<typeof useCreateEvent>
}) {
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
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={create.isPending}
            >
              {t("new.cancel")}
            </Button>
          </DialogClose>
          <Button
            type="submit"
            size="lg"
            aria-busy={create.isPending}
            disabled={create.isPending}
          >
            {t("new.form.submit")}
          </Button>
        </div>
      </form>
    </Form>
  )
}
