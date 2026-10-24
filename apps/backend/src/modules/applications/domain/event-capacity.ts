import { Gender, GenderCounts } from "@/shared/domain/gender"
import { computeFreePlaces, computeTermCapacity, countByGender, RoomCapacity } from "./capacity"

export type CapacitySnapshot = {
  roomMode?: "GENDERED" | "SHARED"
  rooms: RoomCapacity[]
  terms: { id: string; confirmed: { gender: Gender }[] }[]
}

export type TermCapacity = {
  termId: string
  capacity: GenderCounts
  freePlaces: GenderCounts
}

export type CapacityDetailsSnapshot = {
  eventName: string
  roomMode?: "GENDERED" | "SHARED"
  rooms: (RoomCapacity & { id: string; name: string })[]
  terms: (CapacitySnapshot["terms"][number] & { name: string; startsOn: Date; endsOn: Date })[]
}

export type EventCapacityDetails = {
  eventName: string
  roomMode: "GENDERED" | "SHARED"
  rooms: CapacityDetailsSnapshot["rooms"]
  terms: (TermCapacity & { name: string; startsOn: string; endsOn: string })[]
}

export function computeCapacityDetails(snapshot: CapacityDetailsSnapshot): EventCapacityDetails {
  const terms = snapshot.roomMode === "SHARED" ? [] : computeEventCapacity(snapshot)
  return {
    eventName: snapshot.eventName,
    roomMode: snapshot.roomMode ?? "GENDERED",
    rooms: snapshot.rooms,
    terms: terms.map((term, index) => ({
      ...term,
      name: snapshot.terms[index].name,
      startsOn: snapshot.terms[index].startsOn.toISOString().slice(0, 10),
      endsOn: snapshot.terms[index].endsOn.toISOString().slice(0, 10),
    })),
  }
}

export function computeEventCapacity(snapshot: CapacitySnapshot): TermCapacity[] {
  if (snapshot.roomMode === "SHARED") return []
  const capacity = computeTermCapacity(snapshot.rooms)
  return snapshot.terms.map((term) => ({
    termId: term.id,
    capacity: { ...capacity },
    freePlaces: computeFreePlaces(capacity, countByGender(term.confirmed)),
  }))
}
