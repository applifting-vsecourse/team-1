import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import type { TFunction } from "i18next"
import { CircleAlert, Eye, EyeOff, Loader2 } from "lucide-react"
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
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const passwordInput = useRef<HTMLInputElement>(null)
  const passwordSelection = useRef<{
    start: number | null
    end: number | null
    direction: "forward" | "backward" | "none" | null
  } | null>(null)
  const schema = useMemo(() => createSchema(t), [t])
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  // After a failed attempt the frames (S13, S14) keep the e-mail and empty the password.
  useEffect(() => {
    if (errorMessage) form.resetField("password")
  }, [errorMessage, form])

  useLayoutEffect(() => {
    const selection = passwordSelection.current
    if (selection) {
      passwordInput.current?.setSelectionRange(
        selection.start,
        selection.end,
        selection.direction ?? undefined,
      )
      passwordSelection.current = null
    }
  }, [isPasswordVisible])

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
              {/* Figma: S01 / S10 password field · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=11987-68 */}
              <div className="relative">
                <FormControl>
                  <Input
                    type={isPasswordVisible ? "text" : "password"}
                    autoComplete="current-password"
                    className="pr-12"
                    {...field}
                    ref={(input) => {
                      field.ref(input)
                      passwordInput.current = input
                    }}
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  className="absolute top-0 right-0"
                  aria-label={t(isPasswordVisible ? "form.hidePassword" : "form.showPassword")}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    const input = passwordInput.current
                    if (input) {
                      passwordSelection.current = {
                        start: input.selectionStart,
                        end: input.selectionEnd,
                        direction: input.selectionDirection,
                      }
                    }
                    setIsPasswordVisible((isVisible) => !isVisible)
                  }}
                >
                  {isPasswordVisible ? (
                    <EyeOff
                      className="size-5"
                      aria-hidden="true"
                    />
                  ) : (
                    <Eye
                      className="size-5"
                      aria-hidden="true"
                    />
                  )}
                </Button>
              </div>
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
