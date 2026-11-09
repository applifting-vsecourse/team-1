import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { Globe, Menu, Sun } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BandBackdrop } from "@/components/atoms/BandBackdrop"
import { Logo } from "@/components/atoms/Logo"
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

type Props = { children: ReactNode }

// Figma (Design system): #69 / Vytvořit účet organizátora · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-22977
// Figma (Design system): #69 / Vytvořit účet organizátora / Mobile · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-23052
export function RegistrationLayout({ children }: Props) {
  const { t, i18n } = useTranslation("auth")
  const { t: tCommon } = useTranslation("common")
  const { theme, setTheme } = useTheme()

  return (
    <>
      <header className="flex h-20 items-center gap-4 bg-card px-4 md:h-28 md:px-8">
        <div className="[&_svg]:size-6 md:[&_svg]:size-10">
          <Logo />
        </div>
        <Link
          to={ROUTES.organizer.login}
          className="ml-auto text-sm font-medium text-foreground hover:underline md:mr-4"
        >
          {t("registration.signIn")}
        </Link>
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
              aria-label={t("registration.preferences")}
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
                {tCommon("language.toggle")}
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
                      {tCommon(`language.${language}`)}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Sun aria-hidden="true" />
                {tCommon("theme.toggle")}
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
                      {tCommon(`theme.${mode}`)}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <main className="relative min-h-[calc(100svh-5rem)] overflow-hidden bg-background p-4 md:p-12">
        <BandBackdrop className="h-40 lg:h-56" />
        <div className="relative mx-auto flex w-full max-w-110 flex-col gap-4">{children}</div>
      </main>
    </>
  )
}
