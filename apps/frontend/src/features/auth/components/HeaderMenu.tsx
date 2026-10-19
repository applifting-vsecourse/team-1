import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { useSession } from "@/features/auth/hooks/useSession"
import { useSignOut } from "@/features/auth/hooks/useSignOut"

// Figma (Design system): DS / Account dropdown · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12011-625
export function HeaderMenu() {
  const { t } = useTranslation(["auth", "common"])
  const { user } = useSession()
  const signOut = useSignOut()

  if (!user) return null

  const accountRoute =
    user.accountType === "PARTICIPANT" ? ROUTES.participant.account : ROUTES.organizer.account

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="border-border bg-card"
        >
          {user.name}
          <span aria-hidden="true">▾</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="flex w-60 flex-col gap-4 rounded-lg p-4"
      >
        <DropdownMenuLabel className="flex flex-col gap-4 p-0 font-normal">
          <span className="font-medium">{t(`common:accountRole.${user.accountType}`)}</span>
          <span className="text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuItem
          asChild
          className="h-11 font-medium"
        >
          <Link to={accountRoute}>{t("menu.accountSettings")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => signOut.mutate()}
          disabled={signOut.isPending}
          className="h-11 font-medium text-destructive focus:text-destructive"
        >
          {t("menu.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
