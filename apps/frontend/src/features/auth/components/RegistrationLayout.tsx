import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/atoms/BackLink"
import { Logo } from "@/components/atoms/Logo"
import { PublicPreferences } from "@/components/molecules/PublicPreferences"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import { useSignOut } from "@/features/auth/hooks/useSignOut"

const steps = ["accountStep", "organizationStep", "profileStep"] as const

type Props = {
  children: ReactNode
  step?: (typeof steps)[number]
  /** Signed-in organizer setting up the organization: there is no way home, only sign-out. */
  isSignedIn?: boolean
}

// Home and sign-in both bounce a signed-in organizer back into onboarding, so the only way out is sign-out.
function SignOutBack() {
  const { t } = useTranslation("auth")
  const signOut = useSignOut()
  return (
    <Button
      variant="outline"
      size="lg"
      className="max-w-full self-start whitespace-normal"
      disabled={signOut.isPending}
      onClick={() => signOut.mutate()}
    >
      <ArrowLeft aria-hidden="true" />
      {t("menu.signOut")}
    </Button>
  )
}

// Figma v2: registration · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22456-10994 (mobile 22456-11097).
// Figma (Design system): #69 / Vytvořit účet organizátora · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-22977
// Figma (Design system): #69 / Vytvořit účet organizátora / Mobile · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-23052
export function RegistrationLayout({ children, step = "accountStep", isSignedIn = false }: Props) {
  const { t } = useTranslation("auth")

  return (
    <>
      <header className="flex h-[76px] items-center gap-4 bg-card px-4 md:h-[116px] md:px-8">
        <div className="[&_svg]:size-6 md:[&_svg]:size-10">
          <Logo />
        </div>
        {!isSignedIn && (
          <Link
            to={ROUTES.organizer.login}
            className="ml-auto hidden text-sm font-medium text-foreground hover:underline md:mr-4 md:inline-flex"
          >
            {t("registration.signIn")}
          </Link>
        )}
        <div className={isSignedIn ? "ml-auto" : "ml-auto md:ml-0"}>
          <PublicPreferences />
        </div>
      </header>
      <main className="min-h-[calc(100svh-76px)] bg-background px-4 py-6 md:py-10">
        <div className="mx-auto flex w-full max-w-140 flex-col gap-4">
          {isSignedIn ? (
            <SignOutBack />
          ) : (
            <BackLink to={ROUTES.home}>{t("registration.homeLink")}</BackLink>
          )}
          <ol className="flex min-h-11 items-center gap-2 rounded-lg border bg-card p-0.5 text-sm">
            {steps.map((item, index) => (
              <li
                key={item}
                aria-current={step === item ? "step" : undefined}
                className={cn(
                  "flex min-h-10 flex-1 items-center justify-center rounded-md px-1 whitespace-nowrap",
                  step === item && "bg-accent font-semibold text-accent-foreground",
                )}
              >
                {index + 1}. {t(`registration.${item}`)}
              </li>
            ))}
          </ol>
          <Card className="gap-4 p-4 md:p-8">{children}</Card>
        </div>
      </main>
    </>
  )
}
