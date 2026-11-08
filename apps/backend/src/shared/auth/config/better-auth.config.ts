import { openAPI } from "better-auth/plugins"
import { BetterAuthOptions } from "better-auth/types"

export const betterAuthCoreConfig: BetterAuthOptions = {
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  user: {
    additionalFields: {
      // Both are set by the server only (`input: false`) and travel with the
      // session, so the frontend can route by account type without an extra call.
      accountType: {
        type: "string",
        required: true,
        // Public e-mail/password sign-up is reserved for organizers. Participant
        // accounts are created by the application flow with an explicit type.
        defaultValue: "ORGANIZER",
        input: false,
      },
      mustSetPassword: {
        type: "boolean",
        required: true,
        defaultValue: false,
        input: false,
      },
      locale: {
        type: "string",
        required: true,
        defaultValue: "en",
        input: false,
      },
    },
  },
  plugins: [openAPI()],
}
