import { useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LANGUAGES } from "@/i18n"
import { cn } from "@/lib/utils"

import {
  localeSchema,
  type Locale,
  type SessionUser,
} from "@/features/auth/api/authSessionQueryOptions"
import { useUpdateProfile } from "@/features/auth/hooks/useUpdateProfile"

// The frames draw the controls of this screen at 48 px / 12 px radius / 16 px text,
// above the kit's 44 px (DESIGN.md, Forms); built as drawn, listed in the PR.
const CONTROL = "h-12 rounded-lg text-base md:text-base"
const BUTTON = "h-12 rounded-lg"

const MAX_NAME_LENGTH = 200

const schema = (message: string) =>
  z.object({
    name: z.string().trim().min(1, message).max(MAX_NAME_LENGTH, message),
    locale: localeSchema,
  })

type FormValues = z.infer<ReturnType<typeof schema>>

/**
 * The „Profil“ tab of the account settings: name and preferred language
 * (the language of the UI and of e-mails, D-069). The e-mail is shown, not
 * edited here (changing it is US-125).
 */
// Figma (Design system): US-124 / Nastavení účtu · Profil a jazyk · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16199-2145 (desktop), https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16199-2228 (mobil)
// Figma (Design system): US-124 / Nastavení účtu · Uložený jazyk English · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16199-2279 (desktop), https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16199-2366 (mobil)
export function ProfileForm({ user }: { user: SessionUser }) {
  const { t } = useTranslation("auth")
  const { t: tErrors } = useTranslation("errors")
  const update = useUpdateProfile()
  const validation = useMemo(() => schema(tErrors("VALIDATION_FAILED")), [tErrors])
  const [savedLocale, setSavedLocale] = useState<Locale | null>(null)
  const form = useForm<FormValues>({
    resolver: zodResolver(validation),
    defaultValues: { name: user.name, locale: user.locale },
  })

  const onSubmit = async (values: FormValues) => {
    const isLanguageChanged = values.locale !== user.locale
    setSavedLocale(null)
    try {
      const saved = await update.mutateAsync({ name: values.name, locale: values.locale })
      form.reset({ name: saved.name ?? "", locale: saved.locale })
      // The frames confirm only the language; a saved name alone has no drawn state.
      if (isLanguageChanged) setSavedLocale(saved.locale)
    } catch {
      // The Alert below shows it; the form keeps its data.
    }
  }

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        onChange={() => setSavedLocale(null)}
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

          <FormField
            control={form.control}
            name="locale"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>{t("profile.language")}</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value)
                    setSavedLocale(null)
                  }}
                >
                  <FormControl>
                    <SelectTrigger className={cn("w-full", CONTROL)}>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {LANGUAGES.map((language) => (
                      // The language names stay in their own language.
                      <SelectItem
                        key={language}
                        value={language}
                        lang={language}
                      >
                        {t(`language.${language}`, { ns: "common" })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </div>

        <p className="text-sm text-muted-foreground">{t("profile.languageHint")}</p>

        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">{t("profile.email")}</p>
          <p>{user.email}</p>
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

        {savedLocale ? (
          // Togena / Alert: wash fill, 1 px line border; the check mark is a text glyph.
          <Alert
            role="status"
            className="rounded-lg border-border bg-accent/30 p-4"
          >
            <AlertTitle>
              <span aria-hidden="true">✓ </span>
              {t("profile.saved.title")}
            </AlertTitle>
            <AlertDescription>{t(`profile.saved.description.${savedLocale}`)}</AlertDescription>
          </Alert>
        ) : null}
      </form>
    </Form>
  )
}
