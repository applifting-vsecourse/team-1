import { useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate } from "@tanstack/react-router"
import type { TFunction } from "i18next"
import { CircleAlert } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { PendingButton } from "@/components/atoms/PendingButton"
import { PasswordInput } from "@/components/molecules/PasswordInput"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

import { useSetPassword } from "@/features/auth/hooks/useSetPassword"

const MIN_PASSWORD_LENGTH = 8

// Built per render language so validation messages follow the UI language.
const createSchema = (t: TFunction<"auth">) =>
  z.object({
    newPassword: z.string().min(MIN_PASSWORD_LENGTH, t("setPassword.errors.tooShort")),
  })

type FormValues = z.infer<ReturnType<typeof createSchema>>

type SetPasswordFormProps = {
  /** E-mail of the signed-in participant, shown read-only. */
  email: string
}

/** First access: the participant who came in by magic link chooses their own password (US-04). */
// Figma (Design system v2): US-04 / První nastavení / Desktop · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15316-10038 (mobil 15316-10075)
export function SetPasswordForm({ email }: SetPasswordFormProps) {
  const { t } = useTranslation("auth")
  const navigate = useNavigate()
  const schema = useMemo(() => createSchema(t), [t])
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "" },
  })
  const setPassword = useSetPassword()

  const onSubmit = async ({ newPassword }: FormValues) => {
    try {
      await setPassword.mutateAsync(newPassword)
    } catch {
      return // the Alert below shows it; the form keeps its data
    }
    await navigate({ to: ROUTES.participant.applications })
  }

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <dl className="flex flex-col gap-2 rounded-control bg-wash p-4">
          <dt className="text-sm">{t("setPassword.emailLabel")}</dt>
          <dd className="min-w-0 [overflow-wrap:anywhere]">{email}</dd>
        </dl>

        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("setPassword.newPassword")}</FormLabel>
              <FormControl>
                <PasswordInput
                  autoComplete="new-password"
                  placeholder={t("setPassword.newPasswordPlaceholder")}
                  {...field}
                />
              </FormControl>
              <FormMessage />
              {form.formState.errors.newPassword ? null : (
                <FormDescription className="text-foreground">
                  {t("setPassword.newPasswordHint")}
                </FormDescription>
              )}
            </FormItem>
          )}
        />

        {setPassword.isError ? (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertTitle>{t("setPassword.errors.failedTitle")}</AlertTitle>
            <AlertDescription className="min-w-0 [overflow-wrap:anywhere]">
              {setPassword.error.message}
            </AlertDescription>
          </Alert>
        ) : null}

        <PendingButton
          type="submit"
          size="lg"
          className="w-full"
          isPending={setPassword.isPending}
        >
          {setPassword.isPending ? t("state.saving", { ns: "common" }) : t("setPassword.submit")}
        </PendingButton>
      </form>
    </Form>
  )
}
