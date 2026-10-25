import { Link } from "@tanstack/react-router"
import { ChevronsUpDown, LogOut, Settings } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { useSession } from "@/features/auth/hooks/useSession"
import { useSignOut } from "@/features/auth/hooks/useSignOut"
import { initials } from "@/features/auth/lib/initials"

/**
 * The account at the bottom of the sidebar and of the mobile drawer: avatar,
 * name and e-mail; the menu opens above it with the account settings and
 * sign-out (the "Podpora Togeny" item waits until a support channel exists).
 */
// Figma (Design system): N / Sidebar account · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=14178-43608
// Figma (Design system): N / Sidebar account menu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=14178-43617
export function SidebarAccount() {
  const { t } = useTranslation("auth")
  const { user } = useSession()
  const signOut = useSignOut()

  if (!user) return null

  const accountRoute =
    user.accountType === "PARTICIPANT" ? ROUTES.participant.account : ROUTES.organizer.account

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={user.name}
          className="flex w-full items-center gap-2.5 rounded-md p-2 text-left transition-colors outline-none group-data-[collapsed=true]/sidebar:justify-center hover:bg-sidebar-accent/60 focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-sidebar-accent/60"
        >
          <Avatar>
            <AvatarFallback className="bg-accent text-xs font-semibold text-link">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="flex min-w-0 flex-1 flex-col group-data-[collapsed=true]/sidebar:hidden">
            <span className="truncate text-sm font-medium">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
          </span>
          <ChevronsUpDown
            aria-hidden
            className="size-4 shrink-0 text-muted-foreground group-data-[collapsed=true]/sidebar:hidden"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="start"
        className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
      >
        <DropdownMenuItem
          asChild
          className="h-10 font-medium"
        >
          <Link to={accountRoute}>
            <Settings />
            {t("menu.accountSettings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
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
