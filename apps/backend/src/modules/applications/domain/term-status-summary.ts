import {
  computeAvailablePlaces,
  computeTermCapacity,
  computeTotalBeds,
  RoomCapacity,
} from "@/modules/applications/domain/capacity"
import { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"
import { computeTermOwed } from "@/modules/applications/domain/pricing"
import { Gender } from "@/shared/domain/gender"

/** Read-only status card and confirmation preview; the write checks again under the event lock. */
export function termStatusSummary(
  term: { status: ApplicationTermStatus; priceCzk: number },
  payments: { amountCzk: number }[],
  rooms: RoomCapacity[],
  confirmedGenders: Gender[],
  gender: Gender,
): {
  owedCzk: number
  capacity: number
  occupied: number
  confirmationCapacity: number
  confirmationOccupied: number
  confirmationDueCzk: number
} {
  const capacity = computeTotalBeds(rooms)
  const confirmationCapacity = rooms.some((room) => room.gender === null)
    ? capacity
    : computeTermCapacity(rooms)[gender]
  const free = computeAvailablePlaces(rooms, confirmedGenders)[gender]
  return {
    owedCzk: computeTermOwed(term, payments),
    capacity,
    occupied: confirmedGenders.length,
    confirmationCapacity,
    confirmationOccupied: confirmationCapacity - free,
    confirmationDueCzk: Math.max(computeTermOwed({ ...term, status: "CONFIRMED" }, payments), 0),
  }
}
