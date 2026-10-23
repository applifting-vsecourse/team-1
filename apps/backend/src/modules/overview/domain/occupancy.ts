import {
  computeAvailablePlaces,
  computeFreePlaces,
  computeRoomCapacity,
  computeTermCapacity,
  countByGender,
  RoomCapacity,
} from "@/modules/applications/domain/capacity"
import { RoomMode } from "@/modules/events/domain/rooms"
import { Gender, GENDERS } from "@/shared/domain/gender"

/** What the repository reads for one term: the genders of its applicants per status. */
export type TermApplicants = {
  id: string
  name: string
  startsOn: string
  endsOn: string
  confirmed: Gender[]
  waitlisted: Gender[]
}

export type EventOccupancySource = {
  eventId: string
  roomMode: RoomMode
  rooms: RoomCapacity[]
  terms: TermApplicants[]
}

export type OccupancyFigures = {
  capacity: number
  confirmed: number
  /** Not clamped at zero: an overbooked term shows a negative number (docs/PROJEKT.md, section 10). */
  free: number
  waitlisted: number
}

export type TermOccupancy = OccupancyFigures & {
  id: string
  name: string
  startsOn: string
  endsOn: string
  /** Per gender in gendered rooms, `null` with shared rooms (one summary per term). */
  byGender: Record<Gender, OccupancyFigures> | null
}

export type EventOccupancy = {
  eventId: string
  roomMode: RoomMode
  /** Number of rooms of the event (the same in every term). */
  roomCount: number
  terms: TermOccupancy[]
}

/**
 * Occupancy per term for the overview (US-29). Capacity and free places come
 * from `capacity.ts`, so the numbers always match the applications list.
 */
export function computeEventOccupancy(source: EventOccupancySource): EventOccupancy {
  const { rooms, roomMode } = source
  const shared = roomMode === "SHARED"
  const sharedCapacity = computeRoomCapacity(rooms).total
  const genderedCapacity = computeTermCapacity(rooms)

  const terms = source.terms.map((term): TermOccupancy => {
    const confirmed = countByGender(term.confirmed.map((gender) => ({ gender })))
    const waitlisted = countByGender(term.waitlisted.map((gender) => ({ gender })))
    const base = { id: term.id, name: term.name, startsOn: term.startsOn, endsOn: term.endsOn }

    if (shared) {
      const free = computeFreePlaces(
        { FEMALE: sharedCapacity, MALE: 0 },
        { FEMALE: term.confirmed.length, MALE: 0 },
      ).FEMALE
      return {
        ...base,
        capacity: sharedCapacity,
        confirmed: term.confirmed.length,
        free,
        waitlisted: term.waitlisted.length,
        byGender: null,
      }
    }

    const free = computeAvailablePlaces(rooms, term.confirmed)
    const byGender = {} as Record<Gender, OccupancyFigures>
    for (const gender of GENDERS) {
      byGender[gender] = {
        capacity: genderedCapacity[gender],
        confirmed: confirmed[gender],
        free: free[gender],
        waitlisted: waitlisted[gender],
      }
    }
    return {
      ...base,
      capacity: byGender.FEMALE.capacity + byGender.MALE.capacity,
      confirmed: term.confirmed.length,
      free: byGender.FEMALE.free + byGender.MALE.free,
      waitlisted: term.waitlisted.length,
      byGender,
    }
  })

  return { eventId: source.eventId, roomMode, roomCount: rooms.length, terms }
}
