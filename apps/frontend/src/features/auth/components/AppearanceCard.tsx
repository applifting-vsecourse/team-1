import { Languages, Monitor, Moon, Palette, Sun } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Card } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
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

const CHOICE = "h-12 flex-1 rounded-lg text-base"

/**
 * Language and colour theme of the app. They moved here from the top bar of the signed-in
 * areas, which keeps only the notification bell. Both apply at once, so there is no save button:
 * the theme is kept in this browser, the language is saved to the account (it is also the language
 * of e-mails, D-069).
 */
export function AppearanceCard({ user }: { user: SessionUser }) {
  const { t } = useTranslation("auth")
  const { t: tCommon } = useTranslation("common")
  const { theme, setTheme } = useTheme()
  const update = useUpdateProfile()

  const changeLanguage = async (value: string) => {
    const parsed = localeSchema.safeParse(value)
    // A toggle group reports an empty value when the chosen item is clicked again.
    if (!parsed.success || parsed.data === user.locale) return
    try {
      const saved = await update.mutateAsync({ locale: parsed.data })
      notify.success(t("profile.saved.title"), t(`profile.saved.description.${saved.locale}`))
    } catch {
      notify.error(t("appearance.languageFailed"))
    }
  }

  return (
    <Card className="gap-4 p-4 md:col-span-2">
      <h2 className="text-2xl font-bold">{t("appearance.title")}</h2>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <p
            id="language-label"
            className="flex items-center gap-2 text-sm leading-none font-medium"
          >
            <Languages
              aria-hidden
              className="size-4 text-muted-foreground"
            />
            {t("profile.language")}
          </p>
          <ToggleGroup
            type="single"
            variant="outline"
            aria-labelledby="language-label"
            value={user.locale}
            onValueChange={(value) => void changeLanguage(value)}
            disabled={update.isPending}
            className="w-full"
          >
            {LANGUAGES.map((language) => (
              <ToggleGroupItem
                key={language}
                value={language}
                // The language names stay in their own language.
                lang={language}
                className={CHOICE}
              >
                <span className="font-mono text-xs text-muted-foreground uppercase">
                  {language}
                </span>
                {tCommon(`language.${language}`)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <p className="text-sm text-muted-foreground">{t("profile.languageHint")}</p>
        </div>

        <div className="flex flex-col gap-2">
          <p
            id="theme-label"
            className="flex items-center gap-2 text-sm leading-none font-medium"
          >
            <Palette
              aria-hidden
              className="size-4 text-muted-foreground"
            />
            {t("appearance.theme")}
          </p>
          <ToggleGroup
            type="single"
            variant="outline"
            aria-labelledby="theme-label"
            value={theme ?? "system"}
            onValueChange={(value) => {
              if (value) setTheme(value)
            }}
            className="w-full"
          >
            {THEMES.map(({ value, icon: Icon }) => (
              <ToggleGroupItem
                key={value}
                value={value}
                className={CHOICE}
              >
                <Icon aria-hidden />
                {tCommon(`theme.${value}`)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <p className="text-sm text-muted-foreground">{t("appearance.hint")}</p>
        </div>
      </div>
    </Card>
  )
}
