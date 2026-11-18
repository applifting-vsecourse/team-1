import { ChevronDown, Globe } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { currentLanguage, LANGUAGES, type Language } from "@/i18n"

export function LanguageSwitcher({
  value,
  onChange,
  disabled: isDisabled = false,
}: {
  value?: Language
  onChange?: (language: Language) => void
  disabled?: boolean
}) {
  const { t, i18n } = useTranslation()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="lg"
          className={value ? "w-full justify-start gap-4 px-3 text-base font-normal" : "px-3"}
          disabled={isDisabled}
          aria-label={t("language.toggle")}
        >
          <Globe className={value ? "size-5" : "size-4"} />
          {value ? (
            <span className="flex-1 text-left">{t(`language.${value}`)}</span>
          ) : (
            <span className="uppercase">{currentLanguage()}</span>
          )}
          <ChevronDown className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGES.map((language) => (
          <DropdownMenuItem
            key={language}
            // The language names stay in their own language, so a visitor
            // who can't read the current one still finds theirs.
            lang={language}
            onClick={() => {
              if (onChange) onChange(language)
              else void i18n.changeLanguage(language)
            }}
          >
            {t(`language.${language}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
