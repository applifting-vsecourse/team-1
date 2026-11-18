import { ChevronDown, Monitor, Moon, Sun } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/hooks/useTheme"

export function ThemeSwitcher({ labeled = false }: { labeled?: boolean }) {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const mode = theme === "light" || theme === "dark" ? theme : "system"
  const ModeIcon = { light: Sun, dark: Moon, system: Monitor }[mode]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={labeled ? "lg" : "icon-lg"}
          className={labeled ? "w-full justify-start gap-4 px-3 text-base font-normal" : undefined}
          aria-label={t("theme.toggle")}
        >
          {labeled ? (
            <>
              <ModeIcon className="size-5" />
              <span className="flex-1 text-left">{t(`theme.${mode}`)}</span>
              <ChevronDown className="size-4" />
            </>
          ) : (
            <>
              <Sun className="size-4 dark:hidden" />
              <Moon className="hidden size-4 dark:block" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="size-4" /> {t("theme.light")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="size-4" /> {t("theme.dark")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="size-4" /> {t("theme.system")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
