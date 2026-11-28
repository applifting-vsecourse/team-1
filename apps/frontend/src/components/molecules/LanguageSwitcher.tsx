import { ChevronDown, Globe } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { currentLanguage, LANGUAGES, type Language } from "@/i18n"
import { cn } from "@/lib/utils"

export function LanguageSwitcher({
  value,
  onChange,
  disabled: isDisabled = false,
  isOutlined = false,
}: {
  value?: Language
  onChange?: (language: Language) => void
  disabled?: boolean
  /** The ink-edged trigger of the preferences row in the public footer (Figma 27609:4328). */
  isOutlined?: boolean
}) {
  const { t, i18n } = useTranslation()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={isOutlined ? "outline" : "ghost"}
          size="lg"
          className={
            value
              ? "w-full justify-start gap-4 px-3 text-base font-normal"
              : cn(
                  "w-28 gap-3 px-2 text-base font-normal has-[>svg]:px-2",
                  isOutlined ? "gap-2 pr-2.5 pl-3 has-[>svg]:pr-2.5 has-[>svg]:pl-3" : "rounded-md",
                )
          }
          disabled={isDisabled}
          aria-label={t("language.toggle")}
        >
          <Globe className="size-5" />
          {value ? (
            <span className="flex-1 text-left">{t(`language.${value}`)}</span>
          ) : (
            <span className="flex-1 text-left uppercase">{currentLanguage()}</span>
          )}
          <ChevronDown className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={12}
        collisionPadding={8}
        className="w-60 rounded-md p-1"
      >
        <DropdownMenuRadioGroup value={value ?? currentLanguage()}>
          {LANGUAGES.map((language) => (
            <DropdownMenuRadioItem
              value={language}
              key={language}
              // The language names stay in their own language, so a visitor
              // who can't read the current one still finds theirs.
              lang={language}
              onSelect={() => {
                if (onChange) onChange(language)
                else void i18n.changeLanguage(language)
              }}
            >
              {t(`language.${language}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
