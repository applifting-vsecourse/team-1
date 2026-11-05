import { todayInPrague } from "@/modules/applications/domain/waitlist-expiry"
import { canChangeImmediately } from "@/modules/events/domain/cancellation-start"

export type ParticipantTermOption = {
  id: string
  name: string | null
  startsOn: string
  endsOn: string
  selected: boolean
}

export type ParticipantChangeOptions = {
  canChangeImmediately: boolean
  terms: ParticipantTermOption[]
}

/** One Prague calendar day controls both the options and the write. */
export function participantChangeAllowed(startsOn: Date | null, now: Date): boolean {
  return canChangeImmediately(startsOn, todayInPrague(now))
}
