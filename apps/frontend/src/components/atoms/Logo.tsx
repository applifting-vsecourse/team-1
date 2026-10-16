import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"

export function Logo() {
  return (
    <Link
      to={ROUTES.home}
      className="font-semibold tracking-tight"
    >
      kemp.io
    </Link>
  )
}
