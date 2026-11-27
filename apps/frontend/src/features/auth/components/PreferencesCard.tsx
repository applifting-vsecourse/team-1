import { Globe } from "lucide-react"
import { useTranslation } from "react-i18next"

import { SettingsRow, SettingsSection } from "@/components/molecules/SettingsRows"
import { ThemeSegmentedControl } from "@/components/molecules/ThemeSegmentedControl"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LANGUAGES } from "@/i18n"

import type { SessionUser } from "@/features/auth/api/authSessionQueryOptions"
import { useAccountLanguage } from "@/features/auth/hooks/useAccountLanguage"

/**
 * „Předvolby“ of the account settings: the language and the appearance, each a row with its control
 * at the right — the participant area has them only here (Figma F4). Both apply at once, so there is
 * no save button: the theme is kept in this browser, the language is saved to the account (it is
 * also the language of e-mails, D-069). An account without a language says so until one is chosen.
 */
// Figma (Design system v2): Sekce · Předvolby · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27652-34087
export function PreferencesCard({ user }: { user: SessionUser }) {
  const { t } = useTranslation("auth")
  const { t: tCommon } = useTranslation("common")
  const { changeLanguage, isPending } = useAccountLanguage(user.locale)

  return (
    <SettingsSection
      id="account-preferences"
      title={t("appearance.title")}
    >
      <SettingsRow
        id="preference-language"
        label={t("profile.language")}
        value={t("profile.languageHint")}
        action={
          <Select
            value={user.locale ?? ""}
            onValueChange={(value) => void changeLanguage(value)}
            disabled={isPending}
          >
            <SelectTrigger
              aria-labelledby="preference-language"
              className="h-10 w-40"
            >
              <SelectValue placeholder={t("profile.languageUnset")} />
            </SelectTrigger>
            <SelectContent align="end">
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
        }
      />
      <SettingsRow
        id="preference-theme"
        label={t("appearance.theme")}
        value={t("appearance.hint")}
        action={<ThemeSegmentedControl labelledBy="preference-theme" />}
      />
    </SettingsSection>
  )
}
