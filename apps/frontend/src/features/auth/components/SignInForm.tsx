import { useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import type { TFunction } from "i18next"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { Alert, AlertDescription } from "@/components/ui/alert"
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
  isLoading: boolean
  errorMessage?: string | null
  onSubmit: (values: FormValues) => void | Promise<void>
}

export function SignInForm({ isLoading, errorMessage, onSubmit }: SignInFormProps) {
  const { t } = useTranslation("auth")
  const schema = useMemo(() => createSchema(t), [t])
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

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
            </FormItem>
          )}
        />

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("form.submit")}
        </Button>
      </form>
    </Form>
  )
}
