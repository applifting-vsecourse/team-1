import { Monitor, Moon, Sun } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/hooks/useTheme"

export function ThemeSwitcher({ isLabeled = false }: { isLabeled?: boolean }) {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const mode = theme === "light" || theme === "dark" ? theme : "system"
  const ModeIcon = { light: Sun, dark: Moon, system: Monitor }[mode]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={isLabeled ? "lg" : "icon-lg"}
          className={
            isLabeled
              ? "min-w-0 justify-start gap-2 p-0 text-base font-normal has-[>svg]:px-0"
              : undefined
          }
          aria-label={t("theme.toggle")}
        >
          {isLabeled ? (
            <>
              <span className="grid size-11 shrink-0 place-items-center">
                <ModeIcon className="size-5" />
              </span>
              <span className="truncate text-left">{t(`theme.${mode}`)}</span>
            </>
          ) : (
            <ModeIcon className="size-5" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={12}
        collisionPadding={8}
        className="w-60 rounded-md p-1"
      >
        <DropdownMenuRadioGroup
          value={mode}
          onValueChange={setTheme}
        >
          <DropdownMenuRadioItem value="light">{t("theme.light")}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">{t("theme.dark")}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">{t("theme.system")}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
