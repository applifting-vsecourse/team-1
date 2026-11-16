import type { ReactNode } from "react"
import { Globe, Monitor, Moon, Sun } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTheme } from "@/hooks/useTheme"
import { LANGUAGES } from "@/i18n"
import { notify } from "@/lib/notify"

import { localeSchema, type SessionUser } from "@/features/auth/api/authSessionQueryOptions"
import { useUpdateProfile } from "@/features/auth/hooks/useUpdateProfile"

const THEMES = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
] as const

const CONTROL = "h-12 w-full rounded-lg text-base md:text-base"

/** One preference: the name and what it does on the left, the control on the right. */
function PreferenceRow({
  id,
  label,
  description,
  children,
}: {
  id: string
  label: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4 first:border-t-0 first:pt-0 md:flex-row md:items-center md:justify-between md:gap-8">
      <div className="flex flex-col gap-1">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="md:w-64 md:shrink-0">{children}</div>
    </div>
  )
}

/**
 * The „Předvolby“ tab of the account settings: language and colour theme, each a select in a row.
 * They moved here from the top bar of the signed-in areas, which keeps only the notification bell.
 * Both apply at once, so there is no save button: the theme is kept in this browser, the language
 * is saved to the account (it is also the language of e-mails, D-069).
 */
export function PreferencesCard({ user }: { user: SessionUser }) {
  const { t } = useTranslation("auth")
  const { t: tCommon } = useTranslation("common")
  const { theme, setTheme } = useTheme()
  const update = useUpdateProfile()

  const changeLanguage = async (value: string) => {
    const parsed = localeSchema.safeParse(value)
    if (!parsed.success || parsed.data === user.locale) return
    try {
      const saved = await update.mutateAsync({ locale: parsed.data })
      notify.success(t("profile.saved.title"), t(`profile.saved.description.${saved.locale}`))
    } catch {
      notify.error(t("appearance.languageFailed"))
    }
  }

  return (
    <Card className="max-w-196 gap-4 p-4 md:p-6">
      <h2 className="text-2xl font-bold">{t("appearance.title")}</h2>
      <PreferenceRow
        id="preference-language"
        label={t("profile.language")}
        description={t("profile.languageHint")}
      >
        <Select
          value={user.locale}
          onValueChange={(value) => void changeLanguage(value)}
          disabled={update.isPending}
        >
          <SelectTrigger
            id="preference-language"
            className={CONTROL}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((language) => (
              // The language names stay in their own language.
              <SelectItem
                key={language}
                value={language}
                lang={language}
              >
                <Globe aria-hidden />
                {tCommon(`language.${language}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PreferenceRow>

      <PreferenceRow
        id="preference-theme"
        label={t("appearance.theme")}
        description={t("appearance.hint")}
      >
        <Select
          value={theme ?? "system"}
          onValueChange={setTheme}
        >
          <SelectTrigger
            id="preference-theme"
            className={CONTROL}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {THEMES.map(({ value, icon: Icon }) => (
              <SelectItem
                key={value}
                value={value}
              >
                <Icon aria-hidden />
                {tCommon(`theme.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PreferenceRow>
    </Card>
  )
}
