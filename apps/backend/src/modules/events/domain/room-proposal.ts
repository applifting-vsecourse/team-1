import { Gender } from "@/shared/domain/gender"
import { normalizeName } from "@/shared/domain/room-wishes"

export type ProposalRoom = {
  id: string
  gender: Gender | null
  /** Beds left without any extra bed: a proposal never overfills a room. */
  freeBeds: number
  /** Who sleeps there already; they are never moved, but they can be the person a wish names. */
  occupants: { applicationTermId: string; firstName: string; lastName: string }[]
}

export type ProposalParticipant = {
  applicationTermId: string
  firstName: string
  lastName: string
  gender: Gender
  /** Asked to settle the accommodation individually (US-38): never proposed. */
  individualAccommodation: boolean
  /** Names they wish to room with (US-146), free text. */
  wishes: string[]
}

export type ProposalUnplacedReason = "INDIVIDUAL_ACCOMMODATION" | "NO_FREE_BED"

export type ProposalWish = {
  /** Who wished it; always somebody who got a bed in the proposal. */
  applicationTermId: string
  name: string
  /** People of the term the name stands for (usually one), so a client can re-check the wish. */
  matches: string[]
  fulfilled: boolean
}

export type RoomProposal = {
  placements: { applicationTermId: string; roomId: string }[]
  unplaced: { applicationTermId: string; reason: ProposalUnplacedReason }[]
  wishes: ProposalWish[]
}

const MAX_PASSES = 20

const byName = (a: ProposalParticipant, b: ProposalParticipant): number =>
  a.lastName.localeCompare(b.lastName, "cs") ||
  a.firstName.localeCompare(b.firstName, "cs") ||
  a.applicationTermId.localeCompare(b.applicationTermId)

/**
 * Proposes rooms for the confirmed participants without one (US-147), keeping the rules of US-37:
 * a room with a gender takes only that gender, nobody goes over the beds (no extra bed is added)
 * and people with individual accommodation are left out. Within that it fulfils as many wishes to
 * room together as it can: people who wish each other are grouped and put into one room that fits
 * them best, then single moves and swaps are tried while they fulfil more wishes. Optimising by
 * age or anything else is not done. Pure and deterministic: the same input gives the same
 * proposal.
 */
export function proposeRoomAssignments(input: {
  rooms: readonly ProposalRoom[]
  participants: readonly ProposalParticipant[]
}): RoomProposal {
  const { rooms } = input
  const unplaced: RoomProposal["unplaced"] = []
  const candidates = input.participants
    .filter((person) => {
      if (!person.individualAccommodation) return true
      unplaced.push({
        applicationTermId: person.applicationTermId,
        reason: "INDIVIDUAL_ACCOMMODATION",
      })
      return false
    })
    .sort(byName)
  const candidateById = new Map(candidates.map((person) => [person.applicationTermId, person]))

  const fits = (room: ProposalRoom, person: ProposalParticipant): boolean =>
    room.gender === null || room.gender === person.gender

  // Who a wish names: the person's "first last" or "last first" (ignoring case and diacritics).
  const idsByName = new Map<string, string[]>()
  const register = (id: string, firstName: string, lastName: string) => {
    for (const key of new Set([
      normalizeName(`${firstName} ${lastName}`),
      normalizeName(`${lastName} ${firstName}`),
    ])) {
      idsByName.set(key, [...(idsByName.get(key) ?? []), id])
    }
  }
  for (const room of rooms) {
    for (const person of room.occupants) {
      register(person.applicationTermId, person.firstName, person.lastName)
    }
  }
  for (const person of candidates) {
    register(person.applicationTermId, person.firstName, person.lastName)
  }
  const wishesOf = (person: ProposalParticipant) =>
    person.wishes.map((name) => ({
      name,
      matches: (idsByName.get(normalizeName(name)) ?? []).filter(
        (id) => id !== person.applicationTermId,
      ),
    }))
  const wishes = new Map(candidates.map((person) => [person.applicationTermId, wishesOf(person)]))

  const roomOf = new Map<string, string>()
  const free = new Map(rooms.map((room) => [room.id, room.freeBeds]))
  const members = new Map<string, Set<string>>(rooms.map((room) => [room.id, new Set()]))
  const place = (id: string, roomId: string) => {
    unplace(id)
    roomOf.set(id, roomId)
    members.get(roomId)?.add(id)
    free.set(roomId, (free.get(roomId) ?? 0) - 1)
  }
  const unplace = (id: string) => {
    const roomId = roomOf.get(id)
    if (roomId === undefined) return
    roomOf.delete(id)
    members.get(roomId)?.delete(id)
    free.set(roomId, (free.get(roomId) ?? 0) + 1)
  }
  for (const room of rooms) {
    for (const person of room.occupants) {
      roomOf.set(person.applicationTermId, room.id)
      members.get(room.id)?.add(person.applicationTermId)
    }
  }
  const isFixed = (id: string) => !candidateById.has(id)
  const roomById = new Map(rooms.map((room) => [room.id, room]))

  // 1. Whoever names somebody already sleeping in a room with a free bed goes there.
  for (const person of candidates) {
    const target = (wishes.get(person.applicationTermId) ?? [])
      .flatMap((wish) => wish.matches)
      .filter(isFixed)
      .map((id) => roomById.get(roomOf.get(id) ?? ""))
      .find((room) => room && (free.get(room.id) ?? 0) > 0 && fits(room, person))
    if (target) place(person.applicationTermId, target.id)
  }

  // 2. The rest is grouped by who wishes whom, biggest groups first, singles last.
  const waiting = candidates.filter((person) => !roomOf.has(person.applicationTermId))
  const canShare = (a: ProposalParticipant, b: ProposalParticipant) =>
    a.gender === b.gender || rooms.some((room) => room.gender === null)
  const parent = new Map(
    waiting.map((person) => [person.applicationTermId, person.applicationTermId]),
  )
  const find = (id: string): string => {
    let root = id
    while (parent.get(root) !== root) root = parent.get(root) ?? root
    return root
  }
  for (const person of waiting) {
    for (const wish of wishes.get(person.applicationTermId) ?? []) {
      for (const id of wish.matches) {
        const other = candidateById.get(id)
        if (other && parent.has(id) && canShare(person, other)) {
          parent.set(find(id), find(person.applicationTermId))
        }
      }
    }
  }
  const groups = new Map<string, ProposalParticipant[]>()
  for (const person of waiting) {
    const root = find(person.applicationTermId)
    groups.set(root, [...(groups.get(root) ?? []), person])
  }
  const orderedGroups = [...groups.values()].sort((a, b) => b.length - a.length)
  for (const group of orderedGroups) {
    let rest = group
    while (rest.length > 0) {
      const options = rooms
        .map((room) => ({
          room,
          takes: Math.min(free.get(room.id) ?? 0, rest.filter((p) => fits(room, p)).length),
        }))
        .filter((option) => option.takes > 0)
      if (options.length === 0) break
      // Whole group in the tightest room that holds it; otherwise the room that takes most.
      const whole = options
        .filter((option) => option.takes === rest.length)
        .sort((a, b) => (free.get(a.room.id) ?? 0) - (free.get(b.room.id) ?? 0))[0]
      const best = whole ?? options.sort((a, b) => b.takes - a.takes)[0]
      if (!best) break
      const chosen = rest.filter((p) => fits(best.room, p)).slice(0, best.takes)
      for (const person of chosen) place(person.applicationTermId, best.room.id)
      rest = rest.filter((person) => !chosen.includes(person))
    }
  }

  // 3. Moves and swaps of the proposed people while they fulfil more wishes.
  const score = (): number => {
    let total = 0
    for (const [id, list] of wishes) {
      const room = roomOf.get(id)
      if (room === undefined) continue
      for (const wish of list) {
        if (wish.matches.some((match) => roomOf.get(match) === room)) total += 1
      }
    }
    return total
  }
  const tryInto = (id: string, roomId: string): boolean => {
    const person = candidateById.get(id)
    const target = roomById.get(roomId)
    const from = roomOf.get(id)
    if (!person || !target || from === undefined || from === roomId || !fits(target, person)) {
      return false
    }
    const before = score()
    if ((free.get(roomId) ?? 0) > 0) {
      place(id, roomId)
      if (score() > before) return true
      place(id, from)
    }
    for (const otherId of [...(members.get(roomId) ?? [])]) {
      const other = candidateById.get(otherId)
      const source = roomById.get(from)
      if (!other || !source || !fits(source, other)) continue
      place(id, roomId)
      place(otherId, from)
      if (score() > before) return true
      place(otherId, roomId)
      place(id, from)
    }
    return false
  }
  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    let isImproved = false
    for (const person of candidates) {
      const id = person.applicationTermId
      if (!roomOf.has(id)) continue
      for (const wish of wishes.get(id) ?? []) {
        for (const match of wish.matches) {
          const matchRoom = roomOf.get(match)
          const ownRoom = roomOf.get(id)
          if (matchRoom === undefined || ownRoom === undefined || matchRoom === ownRoom) continue
          if (tryInto(id, matchRoom) || (!isFixed(match) && tryInto(match, ownRoom))) {
            isImproved = true
          }
        }
      }
    }
    if (!isImproved) break
  }

  const placed = candidates.filter((person) => roomOf.has(person.applicationTermId))
  for (const person of candidates) {
    if (!roomOf.has(person.applicationTermId)) {
      unplaced.push({ applicationTermId: person.applicationTermId, reason: "NO_FREE_BED" })
    }
  }
  return {
    placements: placed.map((person) => ({
      applicationTermId: person.applicationTermId,
      roomId: roomOf.get(person.applicationTermId) ?? "",
    })),
    unplaced,
    wishes: placed.flatMap((person) =>
      (wishes.get(person.applicationTermId) ?? []).map((wish) => ({
        applicationTermId: person.applicationTermId,
        name: wish.name,
        matches: wish.matches,
        fulfilled: wish.matches.some(
          (id) => roomOf.get(id) === roomOf.get(person.applicationTermId),
        ),
      })),
    ),
  }
}
