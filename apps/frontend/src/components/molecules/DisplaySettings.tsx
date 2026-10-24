import { useId } from "react"
import { useTranslation } from "react-i18next"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useTheme } from "@/hooks/useTheme"
import { LANGUAGES } from "@/i18n"

const THEMES = ["system", "light", "dark"] as const

/**
 * Language and theme at the bottom of the mobile drawer. On wider screens
 * the same choices are the switchers in the top bar.
 */
// Figma (Design system): DS / Mobile drawer · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=14057-1204
export function DisplaySettings() {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useTheme()
  const languageId = useId()
  const themeId = useId()

  return (
    <div className="flex flex-col gap-4 border-t border-sidebar-border pt-4">
      <div className="flex flex-col gap-2">
        <span
          id={languageId}
          className="text-sm font-medium"
        >
          {t("language.label")}
        </span>
        <ToggleGroup
          type="single"
          variant="outline"
          aria-labelledby={languageId}
          value={i18n.resolvedLanguage}
          onValueChange={(language) => {
            if (language) void i18n.changeLanguage(language)
          }}
          className="w-full bg-card"
        >
          {/* Language names stay in their own language (see LanguageSwitcher). */}
          {[...LANGUAGES].reverse().map((language) => (
            <ToggleGroupItem
              key={language}
              value={language}
              lang={language}
              className="h-10 flex-1"
            >
              {t(`language.${language}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={themeId}>{t("theme.label")}</Label>
        <Select
          value={theme ?? "system"}
          onValueChange={setTheme}
        >
          <SelectTrigger
            id={themeId}
            className="h-10 w-full bg-card"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {THEMES.map((value) => (
              <SelectItem
                key={value}
                value={value}
              >
                {t(`theme.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
