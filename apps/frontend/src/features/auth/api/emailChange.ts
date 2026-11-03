import { api } from "@/lib/api-client"

/** US-125: asks for a new sign-in e-mail; the link goes to the new address and nothing changes until it is clicked. */
export async function requestEmailChange(newEmail: string): Promise<void> {
  await api.post("me/email-change", { json: { newEmail } })
}
