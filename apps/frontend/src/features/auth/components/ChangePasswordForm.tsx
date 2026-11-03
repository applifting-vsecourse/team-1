import { useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { CircleAlert, Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { PasswordInput } from "@/components/molecules/PasswordInput"
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

import {
  ChangePasswordError,
  INVALID_PASSWORD,
  useChangePassword,
} from "@/features/auth/hooks/useChangePassword"

const MIN_PASSWORD_LENGTH = 8

const createSchema = (messages: { required: string; tooShort: string }) =>
  z.object({
    currentPassword: z.string().min(1, messages.required),
    newPassword: z.string().min(MIN_PASSWORD_LENGTH, messages.tooShort),
  })

type FormValues = z.infer<ReturnType<typeof createSchema>>

const emptyValues: FormValues = { currentPassword: "", newPassword: "" }

/**
 * The „Zabezpečení“ tab of the account settings: the signed-in user changes
 * their password — the current one and a new one of at least 8 characters.
 * BetterAuth does the change (black box).
 */
// Figma (Design system): US-124 / Nastavení účtu · Změnit heslo · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16199-2424 (desktop), https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16199-2527 (mobil)
// Figma (Design system): US-124 / Nastavení účtu · Krátké nové heslo · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16199-2738 (desktop), https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16199-2825 (mobil)
// Figma (Design system): US-124 / Nastavení účtu · Nesprávné současné heslo · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16199-2585 (desktop), https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16199-2680 (mobil)
export function ChangePasswordForm() {
  const { t } = useTranslation("auth")
  const { t: tErrors } = useTranslation("errors")
  const changePassword = useChangePassword()
  const schema = useMemo(
    () =>
      createSchema({
        required: tErrors("VALIDATION_FAILED"),
        tooShort: t("changePassword.hint"),
      }),
    [t, tErrors],
  )
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyValues })
  const { errors } = form.formState

  const onSubmit = async (values: FormValues) => {
    try {
      await changePassword.mutateAsync(values)
    } catch (error) {
      if (error instanceof ChangePasswordError && error.code === INVALID_PASSWORD) {
        // Frame „Nesprávné současné heslo“: the typed value stays, the field is marked.
        form.setError("currentPassword", { message: t("changePassword.errors.currentIncorrect") })
      }
      return
    }
    form.reset(emptyValues)
  }

  const isFailureShown = changePassword.isError && errors.currentPassword === undefined

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("changePassword.current")}</FormLabel>
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

        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("changePassword.new")}</FormLabel>
              <FormControl>
                <PasswordInput
                  autoComplete="new-password"
                  placeholder={t("changePassword.new")}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {errors.newPassword ? null : (
          <p className="text-sm text-muted-foreground">{t("changePassword.hint")}</p>
        )}

        {isFailureShown ? (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertDescription>{tErrors("UNKNOWN")}</AlertDescription>
          </Alert>
        ) : null}

        {/* Desktop: secondary left, primary right; phone: primary on top (Togena / Dialog actions). */}
        <div className="flex flex-col-reverse gap-3 md:flex-row">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="flex-1"
            onClick={() => {
              form.reset(emptyValues)
              changePassword.reset()
            }}
          >
            {t("changePassword.cancel")}
          </Button>
          <Button
            type="submit"
            size="lg"
            className="flex-1"
            disabled={changePassword.isPending}
          >
            {changePassword.isPending ? <Loader2 className="animate-spin" /> : null}
            {t("changePassword.submit")}
          </Button>
        </div>
      </form>
    </Form>
  )
}
