import { useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { CircleAlert, Loader2 } from "lucide-react"
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
import { notify } from "@/lib/notify"
import { cn } from "@/lib/utils"

import type { SessionUser } from "@/features/auth/api/authSessionQueryOptions"
import { useUpdateProfile } from "@/features/auth/hooks/useUpdateProfile"

// The frames draw the controls of this screen at 48 px / 12 px radius / 16 px text,
// above the kit's 44 px (DESIGN.md, Forms); built as drawn, listed in the PR.
const CONTROL = "h-12 rounded-lg text-base md:text-base"
const BUTTON = "h-12 rounded-lg"

const MAX_NAME_LENGTH = 200

const schema = (message: string) =>
  z.object({
    name: z.string().trim().min(1, message).max(MAX_NAME_LENGTH, message),
  })

type FormValues = z.infer<ReturnType<typeof schema>>

/**
 * The „Profil“ tab of the account settings: the name. The language moved to `AppearanceCard`,
 * next to the theme, and saves on its own.
 */
// Figma (Design system): US-124 / Nastavení účtu · Profil a jazyk · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16199-2145 (desktop), https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16199-2228 (mobil)
// Figma (Design system): US-124 / Nastavení účtu · Uložený jazyk English · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16199-2279 (desktop), https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16199-2366 (mobil)
export function ProfileForm({ user }: { user: SessionUser }) {
  const { t } = useTranslation("auth")
  const { t: tErrors } = useTranslation("errors")
  const update = useUpdateProfile()
  const validation = useMemo(() => schema(tErrors("VALIDATION_FAILED")), [tErrors])
  const form = useForm<FormValues>({
    resolver: zodResolver(validation),
    defaultValues: { name: user.name },
  })

  const onSubmit = async (values: FormValues) => {
    try {
      const saved = await update.mutateAsync({ name: values.name, locale: user.locale })
      form.reset({ name: saved.name ?? "" })
      notify.success(t("profile.savedDetails"))
    } catch {
      // The Alert below shows it; the form keeps its data.
    }
  }

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-4 md:flex-row">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>{t("profile.name")}</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="name"
                    className={CONTROL}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {update.isError ? (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertDescription>{tErrors("UNKNOWN")}</AlertDescription>
          </Alert>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className={cn("w-full md:w-45 md:self-start", BUTTON)}
          disabled={update.isPending}
        >
          {update.isPending ? <Loader2 className="animate-spin" /> : null}
          {t("profile.submit")}
        </Button>
      </form>
    </Form>
  )
}
