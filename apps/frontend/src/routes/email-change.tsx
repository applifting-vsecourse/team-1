import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { EmailChangeLinkInvalid } from "@/features/auth/components/EmailChangeLinkInvalid"
import { leaveEmailChangeLanding } from "@/features/auth/lib/email-change-landing"

const searchSchema = z.object({
  error: z.string().optional(),
})

// US-125: the link from the verification e-mail. Public — whoever clicks it may be signed out.
export const Route = createFileRoute("/email-change")({
  validateSearch: searchSchema,
  beforeLoad: ({ context, search }) => leaveEmailChangeLanding(context.queryClient, search.error),
  component: EmailChangeLinkInvalid,
})
