export type EventPostSource = "MANUAL" | "BULK_MESSAGE"

/** A term as the board shows it: the name is optional (an unnamed term shows just its dates). */
export type BoardTerm = {
  id: string
  name: string | null
  startsOn: string
  endsOn: string
}

/** What the organizer writes: the terms are the ones the post is shown for. */
export type PostInput = {
  title: string
  body: string
  termIds: string[]
}

export type OrganizerPostItem = {
  id: string
  title: string
  createdAt: Date
  source: EventPostSource
  terms: BoardTerm[]
}

export type OrganizerPost = OrganizerPostItem & { body: string }

/** A post as one account sees it; `terms` are only the ones the account is in. */
export type ParticipantPost = {
  id: string
  title: string
  body: string
  createdAt: Date
  eventName: string
  terms: BoardTerm[]
  isNew: boolean
}

export type BoardSummary = {
  unreadCount: number
  latest: { id: string; title: string } | null
}
