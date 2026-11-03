import type { ListedApplication } from "@/features/event-overview/api/applications"

/** What the organizer sees after a bulk confirmation (US-107): the term and who got which outcome. */
export type BulkResultView = {
  term: { id: string; startsOn: string; endsOn: string }
  confirmed: ListedApplication[]
  unchanged: ListedApplication[]
}
