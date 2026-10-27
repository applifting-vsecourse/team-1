import ky, { HTTPError } from "ky"
import { z } from "zod"

import { env } from "@/config/env"
import { queryClient } from "@/config/react-query"
import { currentLanguage, i18n } from "@/i18n"
import { resources } from "@/i18n/resources"
import { authKeys } from "@/lib/auth-keys"

// Single shared HTTP client. Per the Applifting frontend playbook:
// - send credentials so better-auth's session cookie travels with every request
// - on 401 invalidate the auth session query so route loaders re-resolve auth
//   and redirect through the login flow
// - turn API errors into readable messages (see beforeError below)
//
// Paths are joined onto `prefix`, and a leading slash is normalised away, so
// both `api.get("organizer/events")` and `api.get("/organizer/events")` hit the same endpoint.
type ErrorCode = keyof (typeof resources)["en"]["errors"]

export const isKnownErrorCode = (code: unknown): code is ErrorCode =>
  typeof code === "string" && code in resources.en.errors

const errorBodySchema = z.object({
  code: z.string().optional(),
  message: z.union([z.string(), z.array(z.string())]).optional(),
})

export const api = ky.create({
  prefix: env.VITE_API_URL,
  credentials: "include",
  retry: { limit: 0 },
  hooks: {
    // The API tells the frontend which language the user reads, e.g. for the
    // language of the confirmation e-mail (docs/PROJEKT.md, localization).
    beforeRequest: [
      ({ request }) => {
        request.headers.set("Accept-Language", currentLanguage())
      },
    ],
    // The API answers errors with { code, message }. The code is translated
    // here (locales/*/errors.json), so the user reads the message in their
    // language; the English `message` is the fallback for unknown codes.
    // Without this the user would see ky's generic "Request failed with status
    // code 400" and never learn what was actually wrong.
    beforeError: [
      ({ error }) => {
        if (!(error instanceof HTTPError)) return error
        // Ky 2 consumes the response before this hook and exposes its parsed body as data.
        const parsed = errorBodySchema.safeParse(error.data)
        if (parsed.success) {
          const body = parsed.data
          const message = Array.isArray(body.message) ? body.message.join(", ") : body.message
          if (isKnownErrorCode(body.code)) {
            error.message = i18n.t(`errors:${body.code}`)
          } else if (message) {
            error.message = message
          }
          Object.assign(error, { code: body.code })
        }
        return error
      },
    ],
    afterResponse: [
      ({ response }) => {
        if (response.status === 401) {
          void queryClient.invalidateQueries({ queryKey: authKeys.session() })
        }
      },
    ],
  },
})

export { HTTPError }

/** Machine-readable error code from the API, e.g. `FORBIDDEN`. */
export function apiErrorCode(error: unknown): string | undefined {
  if (!(error instanceof HTTPError)) return undefined
  const { code } = error as HTTPError & { code?: unknown }
  return typeof code === "string" ? code : undefined
}
