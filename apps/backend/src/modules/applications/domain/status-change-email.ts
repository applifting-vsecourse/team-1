import { changeEmailKind } from "@/modules/applications/domain/status-transition"
import { StatusChangeResult } from "@/modules/applications/domain/term-status"
import { ApplicationChange } from "@/modules/participants/domain/submission-confirmation"

/** The e-mail about one stored status change, whether it is sent at once or queued. */
export function statusChangeEmail(
  result: StatusChangeResult,
  actorId: string | null,
): ApplicationChange {
  return {
    email: result.email,
    locale: result.locale,
    eventName: result.eventName,
    organizationName: result.organizationName,
    termName: result.termName,
    hadPayment: result.hadPayment,
    gender: result.gender,
    bankAccount: result.bankAccount,
    kind: changeEmailKind(result.to, result.from, actorId === null ? "SYSTEM" : "ORGANIZER"),
    application: result.application,
    // Payment details only where the application became confirmed (EMAILY.md, rows 2 and 5).
    isAmountChanged: result.to === "CONFIRMED",
  }
}
