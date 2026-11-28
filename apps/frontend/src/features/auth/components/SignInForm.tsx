import { useEffect, useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import type { TFunction } from "i18next"
import { TriangleAlert } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { PendingButton } from "@/components/atoms/PendingButton"
import { PasswordInput } from "@/components/molecules/PasswordInput"
import { Alert, AlertTitle } from "@/components/ui/alert"
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

type SignInFormProps = {
  /** The e-mail typed in the other mode of the same card. */
  defaultEmail?: string
  /** „Nemáte heslo?“ next to the password label switches the card to the link (participants only). */
  onRequestLink?: (email: string) => void
  isLoading: boolean
  errorMessage?: string | null
  onSubmit: (values: FormValues) => void | Promise<void>
}

// Figma (Design system v2): US-02 / Přihlášení přihlašovatele · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15315-2; chybné údaje 18571-1482 (mobile 18571-1544)
// E-mail first (Vercel), the way to a link next to the password label (Cal.com); a failure is one Alert above the button.
export function SignInForm({
  defaultEmail = "",
  onRequestLink,
  isLoading,
  errorMessage,
  onSubmit,
}: SignInFormProps) {
  const { t } = useTranslation("auth")
  const schema = useMemo(() => createSchema(t), [t])
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: defaultEmail, password: "" },
  })

  // After a failed attempt the frames keep the e-mail and empty the password.
  useEffect(() => {
    if (errorMessage) form.resetField("password")
  }, [errorMessage, form])

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
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
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-baseline justify-between gap-4">
                <FormLabel>{t("form.password")}</FormLabel>
                {onRequestLink ? (
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 font-normal text-link underline"
                    onClick={() => onRequestLink(form.getValues("email").trim())}
                  >
                    {t("participantLogin.noPassword")}
                  </Button>
                ) : null}
              </div>
              <FormControl>
                <PasswordInput
                  autoComplete="current-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {errorMessage ? (
          <Alert variant="destructive">
            <TriangleAlert aria-hidden />
            <AlertTitle>{errorMessage}</AlertTitle>
          </Alert>
        ) : null}

        <PendingButton
          type="submit"
          size="lg"
          className="w-full"
          isPending={isLoading}
        >
          {t("form.submit")}
        </PendingButton>
      </form>
    </Form>
  )
}
