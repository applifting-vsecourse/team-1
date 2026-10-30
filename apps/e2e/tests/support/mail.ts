import { readFile } from "node:fs/promises"
import { mailLogPath } from "../../scripts/database-url.mjs"

/**
 * Subject of the newest e-mail sent to `to`. E-mails go to the backend console
 * (console mailer); `scripts/start-backend.mjs` keeps a copy of that output.
 */
export async function latestEmailSubject(to: string): Promise<string | undefined> {
  const log = await readFile(mailLogPath, "utf8")
  const subjects = [...log.matchAll(/To: (\S+)\s+Subject: ([^\n]*)/g)]
    .filter(([, recipient]) => recipient === to)
    .map(([, , subject]) => subject.trim())
  return subjects.at(-1)
}
