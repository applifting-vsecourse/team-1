import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { MagicLinkLanding } from "@/features/auth/components/MagicLinkLanding"

const searchSchema = z.object({
  token: z.string().optional(),
  error: z.string().optional(),
})

// US-01: the link from the confirmation e-mail. Public — nobody is signed in yet.
export const Route = createFileRoute("/participant/magic-link")({
  validateSearch: searchSchema,
  component: MagicLinkPage,
})

function MagicLinkPage() {
  const { token, error } = Route.useSearch()
  return (
    <MagicLinkLanding
      token={token}
      error={error}
    />
  )
}
