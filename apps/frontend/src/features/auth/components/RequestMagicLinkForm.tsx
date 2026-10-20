import { useMemo } from "react"
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import { useRequestMagicLink } from "@/features/auth/hooks/useRequestMagicLink"

const createSchema = (t: TFunction<"auth">) =>
  z.object({
    email: z
      .string()
      .trim()
      .min(1, t("form.errors.emailRequired"))
      .email(t("form.errors.emailInvalid")),
  })

type FormValues = z.infer<ReturnType<typeof createSchema>>

/** "Send me a new link" (S10, link page): e-mail in, the same answer out, always. */
// Figma (Design system): S10 Přihlášení účastníka · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=11968-273
// Figma (Design system): S10a Přihlašovací odkaz odeslán · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13183-333
// Figma (Design system): S10b Odkaz se nepodařilo poslat · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13183-399
export function RequestMagicLinkForm() {
  const { t } = useTranslation("auth")
  const schema = useMemo(() => createSchema(t), [t])
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "" } })
  const request = useRequestMagicLink()

  if (request.isSuccess) {
    return (
      <Alert role="status">
        <AlertTitle>{t("requestLink.sentTitle")}</AlertTitle>
        <AlertDescription>{t("requestLink.sentBody")}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(({ email }) => request.mutate(email))}
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

        <Button
          type="submit"
          variant="outline"
          size="lg"
          className="self-start"
          disabled={request.isPending}
        >
          {request.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("requestLink.submit")}
        </Button>

        {request.isError ? (
          <Alert
            variant="destructive"
            className="border-destructive/30 bg-destructive/10"
          >
            <CircleAlert />
            <AlertTitle>{t("requestLink.failedTitle")}</AlertTitle>
            <AlertDescription className="text-destructive/90">
              {t("requestLink.failedBody")}
            </AlertDescription>
          </Alert>
        ) : null}
      </form>
    </Form>
  )
}
