import { useId } from "react"
import { useTranslation } from "react-i18next"

import { LanguageSwitcher } from "@/components/molecules/LanguageSwitcher"
import { ThemeSegmentedControl } from "@/components/molecules/ThemeSegmentedControl"

/**
 * Language and theme at the top of the public footer on a phone. The public header keeps only the
 * logo and „Přihlásit se“ there (Luma), so the preferences live at the bottom of every public page.
 */
// Figma (Design system v2): Togena / Navigation / Preferences row · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27609-4328
export function PreferencesRow() {
  const { t } = useTranslation()
  const themeId = useId()

  return (
    <div
      role="group"
      aria-label={t("navigationPreferences")}
      className="flex items-start justify-between gap-4"
    >
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t("preferences.language")}</span>
        <LanguageSwitcher isOutlined />
      </div>
      <div className="flex flex-col gap-1">
        <span
          id={themeId}
          className="text-sm font-medium"
        >
          {t("preferences.theme")}
        </span>
        <ThemeSegmentedControl labelledBy={themeId} />
      </div>
    </div>
  )
}
