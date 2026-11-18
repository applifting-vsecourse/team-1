import { Globe, Menu, Sun } from "lucide-react"
import { useTranslation } from "react-i18next"

import { LanguageSwitcher } from "@/components/molecules/LanguageSwitcher"
import { ThemeSwitcher } from "@/components/molecules/ThemeSwitcher"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/hooks/useTheme"
import { LANGUAGES } from "@/i18n"

export function PublicPreferences() {
  const { t, i18n } = useTranslation("common")
  const { theme, setTheme } = useTheme()

  return (
    <>
      <div className="hidden items-center gap-4 md:flex">
        <LanguageSwitcher />
        <ThemeSwitcher />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className="md:hidden"
            aria-label={t("navigationPreferences")}
          >
            <Menu aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="md:hidden"
        >
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Globe aria-hidden="true" />
              {t("language.toggle")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={i18n.resolvedLanguage ?? "en"}
                onValueChange={(language) => void i18n.changeLanguage(language)}
              >
                {LANGUAGES.map((language) => (
                  <DropdownMenuRadioItem
                    key={language}
                    value={language}
                    lang={language}
                  >
                    {t(`language.${language}`)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Sun aria-hidden="true" />
              {t("theme.toggle")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={theme ?? "system"}
                onValueChange={setTheme}
              >
                {(["light", "dark", "system"] as const).map((mode) => (
                  <DropdownMenuRadioItem
                    key={mode}
                    value={mode}
                  >
                    {t(`theme.${mode}`)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
