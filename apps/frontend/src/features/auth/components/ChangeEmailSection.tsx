import { useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "@tanstack/react-router"
import { CircleAlert, Loader2, TriangleAlert } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { DetailItem } from "@/components/molecules/DetailItem"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { apiErrorCode } from "@/lib/api-client"

import type { SessionUser } from "@/features/auth/api/authSessionQueryOptions"
import { useRequestEmailChange } from "@/features/auth/hooks/useRequestEmailChange"
import { accountHome } from "@/features/auth/lib/account-home"

const createSchema = (invalid: string) =>
  z.object({ newEmail: z.string().trim().pipe(z.email(invalid)) })

type FormValues = z.infer<ReturnType<typeof createSchema>>

type ChangeEmailSectionProps = {
  user: SessionUser
  /** The link of the e-mail was clicked and the change applied (the page was reopened with `?emailChanged`). */
  isConfirmed?: boolean
}

/**
 * The „Přihlašovací e-mail“ card of the account settings and the note under it: the
 * signed-in user enters a new e-mail, the link goes to it, and the old e-mail keeps
 * working until the link is clicked. Sits in the two-column grid of the page.
 */
// Figma (Design system): US-125 / Nastavení účtu · Profil · změna e-mailu · Zadat nový e-mail · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16244-2632 (desktop), https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16244-2699 (mobil)
// Figma (Design system): US-125 / Nastavení účtu · Profil · změna e-mailu · Čeká na ověření · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16244-2736 (desktop), https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16244-2799 (mobil)
// Figma (Design system): US-125 / Nastavení účtu · Profil · změna e-mailu · Změna potvrzená · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16244-2833 (desktop), https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16244-2896 (mobil)
// Figma (Design system): US-125 / Nastavení účtu · Profil · změna e-mailu · Neplatná nová adresa · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16244-2930 (desktop), https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16244-3000 (mobil)
export function ChangeEmailSection({ user, isConfirmed = false }: ChangeEmailSectionProps) {
  const { t } = useTranslation("auth")
  const { t: tErrors } = useTranslation("errors")
  const request = useRequestEmailChange()
  const schema = useMemo(() => createSchema(t("changeEmail.errors.invalid")), [t])
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newEmail: "" },
  })
  // Only the browser knows a change is waiting: the link is a signed token, nothing is stored.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const { errors } = form.formState

  const onSubmit = async ({ newEmail }: FormValues) => {
    try {
      await request.mutateAsync(newEmail)
      setPendingEmail(newEmail)
    } catch (error) {
      // The address is the current one or belongs to another account; the answer is the same for both.
      if (apiErrorCode(error) === "VALIDATION_FAILED") {
        form.setError("newEmail", { message: t("changeEmail.errors.invalid") })
      }
    }
  }

  const backToForm = () => {
    setPendingEmail(null)
    form.reset()
    request.reset()
  }

  return (
    <>
      <Card className="gap-4 p-4">
        <h2 className="text-2xl font-bold">{t("changeEmail.title")}</h2>
        <DetailItem label={t("changeEmail.current")}>{user.email}</DetailItem>

        {isConfirmed ? (
          <>
            <Alert
              role="status"
              className="rounded-lg border-border bg-accent/30 p-4"
            >
              <TriangleAlert />
              <AlertTitle>{t("changeEmail.confirmed.title")}</AlertTitle>
              <AlertDescription>
                {t("changeEmail.confirmed.description", { email: user.email })}
              </AlertDescription>
            </Alert>
            <Button
              asChild
              size="lg"
              className="h-12 w-full rounded-lg"
            >
              <Link to={accountHome(user)}>{t("changeEmail.confirmed.continue")}</Link>
            </Button>
          </>
        ) : pendingEmail ? (
          <>
            <Alert
              role="status"
              className="rounded-lg border-border bg-accent/30 p-4"
            >
              <TriangleAlert />
              <AlertTitle>{t("changeEmail.pending.title")}</AlertTitle>
              <AlertDescription>
                {t("changeEmail.pending.description", { email: pendingEmail })}
              </AlertDescription>
            </Alert>
            <DetailItem label={t("changeEmail.pending.change")}>
              {user.email} → {pendingEmail}
            </DetailItem>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="h-12 w-full rounded-lg"
              onClick={backToForm}
            >
              {t("changeEmail.pending.back")}
            </Button>
          </>
        ) : (
          <Form {...form}>
            <form
              noValidate
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-4"
            >
              <FormField
                control={form.control}
                name="newEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("changeEmail.new")}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        className="h-12 rounded-lg text-base md:text-base"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <p>{t("changeEmail.hint")}</p>
              <p className="text-sm text-muted-foreground">{t("changeEmail.note")}</p>

              {request.isError && !errors.newEmail ? (
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
                  className="h-12 flex-1 rounded-lg"
                  onClick={backToForm}
                >
                  {t("changeEmail.cancel")}
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  className="h-12 flex-1 rounded-lg"
                  disabled={request.isPending}
                >
                  {request.isPending ? <Loader2 className="animate-spin" /> : null}
                  {t("changeEmail.submit")}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </Card>

      {/* The „Neplatná nová adresa“ frame draws no note. */}
      {errors.newEmail ? null : (
        <DetailItem
          label={t("changeEmail.footer.label")}
          className="md:col-span-2"
        >
          {t(isConfirmed ? "changeEmail.footer.confirmed" : "changeEmail.footer.default")}
        </DetailItem>
      )}
    </>
  )
}
