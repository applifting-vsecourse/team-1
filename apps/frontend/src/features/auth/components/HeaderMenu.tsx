import { Link } from "@tanstack/react-router"
import { ChevronDown, LogOut, Settings } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { useSession } from "@/features/auth/hooks/useSession"
import { useSignOut } from "@/features/auth/hooks/useSignOut"

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")

// Figma (Design system): DS / Account dropdown · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12011-625
// Figma (Remake): Account dropdown · https://www.figma.com/design/Oxlrm0tdW7aWH6C1rbP0fO/?node-id=21-138
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
          size="lg"
          className="gap-2 pr-2.5 pl-1.5 data-[state=open]:bg-muted"
        >
          <Avatar>
            <AvatarFallback className="bg-accent text-xs font-medium text-accent-foreground">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          {user.name}
          <ChevronDown className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-60"
      >
        <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
          <span className="font-medium">{t(`common:accountRole.${user.accountType}`)}</span>
          <span className="text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          asChild
          className="h-10 font-medium"
        >
          <Link to={accountRoute}>
            <Settings />
            {t("menu.accountSettings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => signOut.mutate()}
          disabled={signOut.isPending}
          className="h-10 font-medium"
        >
          <LogOut />
          {t("menu.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
