import { useEffect, useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import type { TFunction } from "i18next"
import { CircleAlert, Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

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

// Built per render language so validation messages follow the UI language.
const createSchema = (t: TFunction<"auth">) =>
  z.object({
    email: z
      .string()
      .trim()
      .min(1, t("form.errors.emailRequired"))
      .email(t("form.errors.emailInvalid")),
    password: z.string().trim().min(1, t("form.errors.passwordRequired")),
  })

type FormValues = z.infer<ReturnType<typeof createSchema>>

const defaultValues: FormValues = { email: "", password: "" }

type SignInFormProps = {
  /** Hints under the fields; they differ for organizers and participants. */
  emailHint: string
  passwordHint?: string
  isLoading: boolean
  errorMessage?: string | null
  onSubmit: (values: FormValues) => void | Promise<void>
}

export function SignInForm({
  emailHint,
  passwordHint,
  isLoading,
  errorMessage,
  onSubmit,
}: SignInFormProps) {
  const { t } = useTranslation("auth")
  const schema = useMemo(() => createSchema(t), [t])
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  // After a failed attempt the frames (S13, S14) keep the e-mail and empty the password.
  useEffect(() => {
    if (errorMessage) form.resetField("password")
  }, [errorMessage, form])

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
                  placeholder={t("form.emailPlaceholder")}
                  autoComplete="email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
              <FormDescription className="text-xs font-medium">{emailHint}</FormDescription>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("form.password")}</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="current-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
              {passwordHint ? (
                <FormDescription className="text-xs font-medium">{passwordHint}</FormDescription>
              ) : null}
            </FormItem>
          )}
        />

        {errorMessage ? (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertTitle>{t("form.errors.failedTitle")}</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="animate-spin" /> : null}
          {t("form.submit")}
        </Button>
      </form>
    </Form>
  )
}
