import { useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { CircleAlert, Loader2, TriangleAlert } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { DetailItem } from "@/components/molecules/DetailItem"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

const createSchema = (invalid: string) =>
  z.object({ newEmail: z.string().trim().pipe(z.email(invalid)) })

type FormValues = z.infer<ReturnType<typeof createSchema>>

type ChangeEmailSectionProps = {
  user: SessionUser
}

/**
 * The „Přihlašovací e-mail“ card of the account settings and the note under it. The card
 * only shows the current e-mail, so it never changes size; the new address is entered in
 * a dialog, which then tells that the link is on its way. The old e-mail keeps working
 * until the link is clicked. Sits in the two-column grid of the page.
 */
// Figma (Design system): US-125 / Nastavení účtu · Profil · změna e-mailu · Zadat nový e-mail · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16244-2632 (desktop), https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16244-2699 (mobil)
// Figma (Design system): US-125 / Nastavení účtu · Profil · změna e-mailu · Čeká na ověření · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16244-2736 (desktop), https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16244-2799 (mobil)
// Figma (Design system): US-125 / Nastavení účtu · Profil · změna e-mailu · Neplatná nová adresa · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16244-2930 (desktop), https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16244-3000 (mobil)
export function ChangeEmailSection({ user }: ChangeEmailSectionProps) {
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
  const [isOpen, setIsOpen] = useState(false)
  // Errors shown under the field; the rest (delivery, unknown) is an alert above the buttons.
  const errorCode = request.isError ? apiErrorCode(request.error) : undefined
  const isFieldError = errorCode === "EMAIL_TAKEN" || errorCode === "VALIDATION_FAILED"

  const onSubmit = async ({ newEmail }: FormValues) => {
    try {
      await request.mutateAsync(newEmail)
      setPendingEmail(newEmail)
    } catch (error) {
      const code = apiErrorCode(error)
      // The address is the current one or already belongs to an account (PO, #218).
      if (code === "EMAIL_TAKEN") form.setError("newEmail", { message: tErrors("EMAIL_TAKEN") })
      else if (code === "VALIDATION_FAILED") {
        form.setError("newEmail", { message: t("changeEmail.errors.invalid") })
      }
    }
  }

  const setOpen = (isNowOpen: boolean) => {
    setIsOpen(isNowOpen)
    if (isNowOpen) return
    setPendingEmail(null)
    form.reset()
    request.reset()
  }

  return (
    <>
      <Card className="gap-4 p-4">
        <h2 className="text-2xl font-bold">{t("changeEmail.title")}</h2>
        <DetailItem label={t("changeEmail.current")}>{user.email}</DetailItem>
        {/* Fills the space between the e-mail and the button, so the card is as tall as its neighbour. */}
        <DetailItem label={t("changeEmail.footer.label")}>
          {t("changeEmail.footer.default")}
        </DetailItem>
        <Button
          type="button"
          size="lg"
          // Looks like „Uložit údaje“ of the neighbouring card, and sits at the same height.
          className="mt-auto h-12 w-full rounded-lg md:w-45 md:self-start"
          onClick={() => setOpen(true)}
        >
          {t("changeEmail.start")}
        </Button>
      </Card>

      <Dialog
        open={isOpen}
        onOpenChange={setOpen}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] gap-4 overflow-y-auto p-6 sm:max-w-130">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{t("changeEmail.title")}</DialogTitle>
            <DialogDescription>{t("changeEmail.hint")}</DialogDescription>
          </DialogHeader>

          {pendingEmail ? (
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
              <DetailItem label={t("changeEmail.pending.original")}>{user.email}</DetailItem>
              <DetailItem label={t("changeEmail.pending.new")}>{pendingEmail}</DetailItem>
              <Button
                type="button"
                size="lg"
                className="h-12 w-full rounded-lg"
                onClick={() => setOpen(false)}
              >
                {t("changeEmail.pending.close")}
              </Button>
            </>
          ) : (
            <Form {...form}>
              <form
                noValidate
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col gap-4"
              >
                <DetailItem label={t("changeEmail.current")}>{user.email}</DetailItem>
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

                {request.isError && !isFieldError ? (
                  <Alert variant="destructive">
                    <CircleAlert />
                    <AlertDescription>
                      {tErrors(
                        errorCode === "EMAIL_DELIVERY_FAILED" ? "EMAIL_DELIVERY_FAILED" : "UNKNOWN",
                      )}
                    </AlertDescription>
                  </Alert>
                ) : null}

                {/* Desktop: secondary left, primary right; phone: primary on top (Togena / Dialog actions). */}
                <div className="flex flex-col-reverse gap-3 md:flex-row">
                  <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    className="h-12 w-full rounded-lg md:flex-1"
                    onClick={() => setOpen(false)}
                  >
                    {t("changeEmail.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    className="h-12 w-full rounded-lg md:flex-1"
                    disabled={request.isPending}
                  >
                    {request.isPending ? <Loader2 className="animate-spin" /> : null}
                    {t("changeEmail.submit")}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
