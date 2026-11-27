import { Link, type LinkProps } from "@tanstack/react-router"
import { LogOut, Settings, type LucideIcon } from "lucide-react"
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

export type AccountMenuItem = Pick<LinkProps, "to" | "activeOptions"> & {
  label: string
  icon: LucideIcon
}

const ITEM = "h-12 gap-4 rounded-sm px-3 text-base [&_svg:not([class*='size-'])]:size-5"

/**
 * The avatar in the participant's mobile header and the menu it opens: who is signed in, the area
 * navigation (the active page as in the sidebar: grey surface, Semi Bold and the orange bar), the
 * account settings and sign-out. On a phone it replaces the drawer, so there is no menu icon.
 */
// Figma (Design system v2): US-54 / Moje přihlášky · menu účtu otevřené / Mobil · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27681-33558
export function AccountMenu({ items }: { items: AccountMenuItem[] }) {
  const { t } = useTranslation("auth")
  const { user } = useSession()
  const signOut = useSignOut()

  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex size-11 items-center justify-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Avatar aria-hidden>
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
          <span className="sr-only">
            {t("menu.account")}, {user.name}, {user.email}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="flex w-60 flex-col gap-1 p-2"
      >
        <div className="flex min-w-0 flex-col gap-0.5 px-3 py-2">
          <span className="truncate text-sm font-semibold">{user.name}</span>
          <span className="truncate text-xs text-muted-foreground">{user.email}</span>
        </div>
        <DropdownMenuSeparator className="my-0" />
        {items.map(({ label, icon: Icon, ...link }) => (
          <DropdownMenuItem
            key={label}
            asChild
            className={ITEM}
          >
            <Link
              {...link}
              className="group data-[status=active]:bg-nav-active data-[status=active]:font-semibold"
            >
              <span
                aria-hidden="true"
                className="absolute top-1/2 left-1 hidden h-6 w-1 -translate-y-1/2 rounded-xs bg-nav-indicator group-data-[status=active]:block"
              />
              <Icon className="group-data-[status=active]:text-foreground" />
              {label}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="my-0" />
        <DropdownMenuItem
          asChild
          className={ITEM}
        >
          <Link to={ROUTES.participant.account}>
            <Settings />
            {t("menu.accountSettings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => signOut.mutate()}
          disabled={signOut.isPending}
          className={ITEM}
        >
          <LogOut />
          {t("menu.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
