import { Menu } from "lucide-react"
import { useTranslation } from "react-i18next"

import { LanguageSwitcher } from "@/components/molecules/LanguageSwitcher"
import { ThemeSwitcher } from "@/components/molecules/ThemeSwitcher"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// Figma v2: Mobile preferences menu · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK?node-id=16648-10962
export function PublicPreferences() {
  const { t } = useTranslation("common")
  return (
    <>
      <div className="hidden items-center gap-4 md:flex">
        <LanguageSwitcher />
        <ThemeSwitcher />
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className="md:hidden"
            aria-label={t("navigationPreferences")}
          >
            <Menu aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={8}
          collisionPadding={8}
          aria-label={t("navigationPreferences")}
          className="flex w-78 max-w-[calc(100vw-1rem)] items-center gap-2 rounded-lg p-4 md:hidden"
        >
          <LanguageSwitcher />
          <ThemeSwitcher isLabeled />
        </PopoverContent>
      </Popover>
    </>
  )
}
