import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { AuthLayout } from "@/components/templates/AuthLayout"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { useSignOut } from "@/features/auth/hooks/useSignOut"

const STEPS = ["accountStep", "organizationStep", "profileStep"] as const

type Props = {
  children: ReactNode
  /** The step of the wizard; `null` on the final „Organizace je připravená“, which has no dots. */
  step?: (typeof STEPS)[number] | null
  /** Signed-in organizer setting up the organization: „Odhlásit se“ in the header. */
  isSignedIn?: boolean
}

// Home and sign-in both bounce a signed-in organizer back into onboarding, so the only way out is sign-out.
function SignOutButton() {
  const { t } = useTranslation("auth")
  const signOut = useSignOut()
  return (
    <Button
      variant="ghost"
      disabled={signOut.isPending}
      onClick={() => signOut.mutate()}
    >
      {t("menu.signOut")}
    </Button>
  )
}

/**
 * Three fixed dots under the card (Cal.com onboarding): the steps done are ink dots, the current
 * one an elongated ink dot, the steps ahead grey.
 */
function StepDots({ step }: { step: (typeof STEPS)[number] }) {
  const { t } = useTranslation("auth")
  const current = STEPS.indexOf(step)
  return (
    <div
      role="img"
      aria-label={t("registration.step", { step: current + 1, total: STEPS.length })}
      className="flex items-center gap-2"
    >
      {STEPS.map((item, index) => (
        <span
          key={item}
          data-state={index < current ? "done" : index === current ? "current" : "waiting"}
          className={cn(
            "h-1.5 rounded-full",
            index === current ? "w-4" : "w-1.5",
            index <= current ? "bg-foreground" : "bg-border",
          )}
        />
      ))}
    </div>
  )
}

/** The organizer registration wizard: account, organization, profile — one card on the Backdrop. */
// Figma (Design system v2): Rozpracované návrhy / Registrace organizátora · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27462-8762 (Účet; Organizace 27462-8916, Profil 27462-9055, Hotovo 27462-9214)
export function RegistrationLayout({ children, step = "accountStep", isSignedIn = false }: Props) {
  return (
    <AuthLayout
      headerAction={isSignedIn ? <SignOutButton /> : undefined}
      below={step ? <StepDots step={step} /> : undefined}
    >
      {children}
    </AuthLayout>
  )
}
