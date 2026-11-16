import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"

/** „← Domů“ above a page heading: the way back from a public page. */
export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Button
      asChild
      variant="ghost"
      className="-ml-3 w-fit"
    >
      <Link to={to}>
        <ArrowLeft aria-hidden />
        {children}
      </Link>
    </Button>
  )
}
