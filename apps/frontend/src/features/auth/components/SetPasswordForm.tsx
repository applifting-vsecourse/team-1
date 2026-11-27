import { useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate } from "@tanstack/react-router"
import type { TFunction } from "i18next"
import { TriangleAlert } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { PendingButton } from "@/components/atoms/PendingButton"
import { PasswordInput } from "@/components/molecules/PasswordInput"
import { Alert, AlertTitle } from "@/components/ui/alert"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { notify } from "@/lib/notify"

import { MIN_PASSWORD_LENGTH, PasswordRule } from "@/features/auth/components/PasswordRule"
import { useSetPassword } from "@/features/auth/hooks/useSetPassword"

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
  const newPassword = useWatch({ control: form.control, name: "newPassword" })
  const setPassword = useSetPassword()

  const onSubmit = async ({ newPassword }: FormValues) => {
    try {
      await setPassword.mutateAsync(newPassword)
    } catch {
      return // the Alert below shows it; the form keeps its data
    }
    notify.success(t("setPassword.saved"))
    await navigate({ to: ROUTES.participant.applications })
  }

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="set-password-email"
            className="text-muted-foreground"
          >
            {t("setPassword.emailLabel")}
          </Label>
          <Input
            id="set-password-email"
            type="email"
            value={email}
            disabled
          />
        </div>

        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("setPassword.newPassword")}</FormLabel>
              <FormControl>
                <PasswordInput
                  autoComplete="new-password"
                  aria-describedby="set-password-rule"
                  {...field}
                />
              </FormControl>
              <PasswordRule
                id="set-password-rule"
                password={newPassword}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        {setPassword.isError ? (
          <Alert variant="destructive">
            <TriangleAlert aria-hidden />
            <AlertTitle>{t("setPassword.errors.failed")}</AlertTitle>
          </Alert>
        ) : null}

        <PendingButton
          type="submit"
          size="lg"
          className="w-full"
          isPending={setPassword.isPending}
        >
          {t("setPassword.submit")}
        </PendingButton>
      </form>
    </Form>
  )
}
