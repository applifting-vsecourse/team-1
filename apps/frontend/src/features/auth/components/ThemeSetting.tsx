import { useId } from "react"
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

const THEMES = ["light", "dark", "system"] as const

/**
 * The colour theme of the app (light, dark or the system one). It moved here from the top bar
 * of the signed-in areas, which keeps only the notification bell. The choice applies at once and
 * is kept in this browser, so there is no save button.
 */
export function ThemeSetting() {
  const { t } = useTranslation("auth")
  const { t: tCommon } = useTranslation("common")
  const { theme, setTheme } = useTheme()
  const selectId = useId()

  return (
    <Card className="gap-4 p-4">
      <h2 className="text-2xl font-bold">{t("appearance.title")}</h2>
      <div className="flex flex-col gap-2">
        <Label htmlFor={selectId}>{t("appearance.theme")}</Label>
        <Select
          value={theme ?? "system"}
          onValueChange={setTheme}
        >
          <SelectTrigger
            id={selectId}
            className="h-12 w-full rounded-lg text-base md:text-base"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {THEMES.map((value) => (
              <SelectItem
                key={value}
                value={value}
              >
                {tCommon(`theme.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">{t("appearance.hint")}</p>
      </div>
    </Card>
  )
}
