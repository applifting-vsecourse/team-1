import { useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate } from "@tanstack/react-router"
import type { TFunction } from "i18next"
import { CircleAlert, Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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

import { useSetPassword } from "@/features/auth/hooks/useSetPassword"

const MIN_PASSWORD_LENGTH = 8

// Built per render language so validation messages follow the UI language.
const createSchema = (t: TFunction<"auth">) =>
  z
    .object({
      email: z.string(),
      newPassword: z.string().min(MIN_PASSWORD_LENGTH, t("setPassword.errors.tooShort")),
      repeatPassword: z.string(),
    })
    .refine(({ newPassword, repeatPassword }) => newPassword === repeatPassword, {
      path: ["repeatPassword"],
      message: t("setPassword.errors.mismatch"),
    })

type FormValues = z.infer<ReturnType<typeof createSchema>>

type SetPasswordFormProps = {
  /** E-mail of the signed-in participant, shown read-only. */
  email: string
}

/** First access: the participant who came in by magic link chooses their own password (US-04). */
// Figma (Design system): S09 První přístup a nové heslo · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=11968-221
// Figma (Design system): S09 Validace · krátké heslo · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12051-159
// Figma (Design system): S09 Validace · neshodná hesla · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12051-204
export function SetPasswordForm({ email }: SetPasswordFormProps) {
  const { t } = useTranslation("auth")
  const navigate = useNavigate()
  const schema = useMemo(() => createSchema(t), [t])
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email, newPassword: "", repeatPassword: "" },
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
        className="flex flex-col gap-5"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("form.email")}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  disabled
                  {...field}
                />
              </FormControl>
              <FormDescription className="text-xs font-medium">
                {t("setPassword.emailHint")}
              </FormDescription>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("setPassword.newPassword")}</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
              {form.formState.errors.newPassword ? null : (
                <FormDescription className="text-xs font-medium">
                  {t("setPassword.newPasswordHint")}
                </FormDescription>
              )}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="repeatPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("setPassword.repeatPassword")}</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
              {form.formState.errors.repeatPassword ? null : (
                <FormDescription className="text-xs font-medium">
                  {t("setPassword.repeatPasswordHint")}
                </FormDescription>
              )}
            </FormItem>
          )}
        />

        {setPassword.isError ? (
          <Alert
            variant="destructive"
            className="border-destructive/30 bg-destructive/10"
          >
            <CircleAlert />
            <AlertTitle>{t("setPassword.errors.failedTitle")}</AlertTitle>
            <AlertDescription className="text-destructive/90">
              {setPassword.error.message}
            </AlertDescription>
          </Alert>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={setPassword.isPending}
        >
          {setPassword.isPending ? <Loader2 className="animate-spin" /> : null}
          {t("setPassword.submit")}
        </Button>
      </form>
    </Form>
  )
}
