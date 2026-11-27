import { useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import type { TFunction } from "i18next"
import { TriangleAlert } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { PendingButton } from "@/components/atoms/PendingButton"
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

import { useRequestMagicLink } from "@/features/auth/hooks/useRequestMagicLink"
import { linkRequestError } from "@/features/auth/lib/link-request-error"

const createSchema = (t: TFunction<"auth">) =>
  z.object({
    email: z
      .string()
      .trim()
      .min(1, t("form.errors.emailRequired"))
      .email(t("form.errors.emailInvalid")),
  })

type FormValues = z.infer<ReturnType<typeof createSchema>>

type Props = {
  defaultEmail?: string
  /** „Poslat přihlašovací odkaz“ on the sign-in card, „Poslat nový odkaz“ on a link that doesn't work. */
  submitLabel: string
  /** The server answers the same for any e-mail, so this never says whether an account exists. */
  onSent: (email: string) => void
  /** „Přihlásit se heslem“ under the button: back to the password with the e-mail typed so far. */
  onUsePassword?: (email: string) => void
}

/** E-mail in, a sign-in link out; a failure is one Alert above the button. */
// Figma (Design system v2): Přihlášení odkazem ve stejné kartě · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=18566-1444 (mobile 18566-1501)
export function RequestMagicLinkForm({
  defaultEmail = "",
  submitLabel,
  onSent,
  onUsePassword,
}: Props) {
  const { t } = useTranslation("auth")
  const { t: tErrors } = useTranslation("errors")
  const schema = useMemo(() => createSchema(t), [t])
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: defaultEmail },
  })
  const request = useRequestMagicLink()

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(({ email }) =>
          request.mutate(email, { onSuccess: () => onSent(email) }),
        )}
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

        {request.isError ? (
          <Alert variant="destructive">
            <TriangleAlert aria-hidden />
            <AlertTitle>{linkRequestError(request.error, t, tErrors)}</AlertTitle>
          </Alert>
        ) : null}

        <PendingButton
          isPending={request.isPending}
          type="submit"
          size="lg"
          className="w-full"
        >
          {submitLabel}
        </PendingButton>
        {onUsePassword ? (
          <Button
            type="button"
            variant="link"
            className="h-auto self-center p-0 text-base font-normal text-link underline"
            onClick={() => onUsePassword(form.getValues("email").trim())}
          >
            {t("participantLogin.usePassword")}
          </Button>
        ) : null}
      </form>
    </Form>
  )
}
