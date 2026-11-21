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
      className="h-9 w-fit rounded-full bg-accent px-4 text-sm leading-5 font-medium text-link hover:bg-accent/80 has-[>svg]:px-4"
    >
      <Link to={to}>
        <ArrowLeft aria-hidden />
        {children}
      </Link>
    </Button>
  )
}
