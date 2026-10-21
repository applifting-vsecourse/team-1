import { api } from "@/lib/api-client"

/** US-04: the signed-in participant without a password chooses one. Answers 204. */
export async function setPassword(password: string): Promise<void> {
  await api.post("participant/password", { json: { password } })
}
