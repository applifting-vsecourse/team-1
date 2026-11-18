import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BandBackdrop } from "@/components/atoms/BandBackdrop"
import { Logo } from "@/components/atoms/Logo"
import { PublicPreferences } from "@/components/molecules/PublicPreferences"

type Props = { children: ReactNode }

// Figma (Design system): #69 / Vytvořit účet organizátora · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-22977
// Figma (Design system): #69 / Vytvořit účet organizátora / Mobile · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-23052
export function RegistrationLayout({ children }: Props) {
  const { t } = useTranslation("auth")

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
        <PublicPreferences />
      </header>
      <main className="relative min-h-[calc(100svh-5rem)] overflow-hidden bg-background p-4 md:p-12">
        <BandBackdrop className="h-40 lg:h-56" />
        <div className="relative mx-auto flex w-full max-w-110 flex-col gap-4">{children}</div>
      </main>
    </>
  )
}
