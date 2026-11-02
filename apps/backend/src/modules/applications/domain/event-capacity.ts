import { Gender, GenderCounts } from "@/shared/domain/gender"
import {
  computeAvailablePlaces,
  computeTermCapacity,
  computeTotalBeds,
  RoomCapacity,
} from "./capacity"
import { RoomMode } from "./waitlist"

export type TermCapacitySource = {
  id: string
  roomMode: RoomMode
  rooms: RoomCapacity[]
  confirmed: { gender: Gender }[]
}

export type CapacitySnapshot = {
  terms: TermCapacitySource[]
}

export type TermCapacity = {
  termId: string
  roomMode: RoomMode
  capacity: GenderCounts
  freePlaces: GenderCounts
}

export type NamedRoom = RoomCapacity & { id: string; name: string }

export type CapacityDetailsSnapshot = {
  eventName: string
  terms: (Omit<TermCapacitySource, "rooms"> & {
    name: string
    startsOn: Date
    endsOn: Date
    rooms: NamedRoom[]
  })[]
}

export type EventCapacityDetails = {
  eventName: string
  terms: (TermCapacity & {
    name: string
    startsOn: string
    endsOn: string
    rooms: NamedRoom[]
  })[]
}

/**
 * Capacity of one term from its own rooms and mode (US-99). Gendered: beds per
 * gender. Shared: the one common pool, reported on both genders (D-063).
 */
export function computeTermCapacityOf(term: TermCapacitySource): TermCapacity {
  const freePlaces = computeAvailablePlaces(
    term.rooms,
    term.confirmed.map((person) => person.gender),
  )
  const capacity =
    term.roomMode === "SHARED"
      ? { FEMALE: computeTotalBeds(term.rooms), MALE: computeTotalBeds(term.rooms) }
      : computeTermCapacity(term.rooms)
  return { termId: term.id, roomMode: term.roomMode, capacity, freePlaces }
}

export function computeEventCapacity(snapshot: CapacitySnapshot): TermCapacity[] {
  return snapshot.terms.map(computeTermCapacityOf)
}

export function computeCapacityDetails(snapshot: CapacityDetailsSnapshot): EventCapacityDetails {
  return {
    eventName: snapshot.eventName,
    terms: snapshot.terms.map((term) => ({
      ...computeTermCapacityOf(term),
      name: term.name,
      startsOn: term.startsOn.toISOString().slice(0, 10),
      endsOn: term.endsOn.toISOString().slice(0, 10),
      rooms: term.rooms,
    })),
  }
}
