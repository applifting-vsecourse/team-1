import {
  computeAvailablePlaces,
  computeTermCapacity,
  computeTotalBeds,
  RoomCapacity,
} from "@/modules/applications/domain/capacity"
import { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"
import { computeTermOwed } from "@/modules/applications/domain/pricing"
import { exceedsCapacityWhenConfirmed } from "@/modules/applications/domain/status-transition"
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
  debtCzk: number
  confirmationExceedsCapacity: boolean
  confirmationNextOccupied: number
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
  const freePlaces = computeAvailablePlaces(rooms, confirmedGenders)
  const confirmationOccupied = confirmationCapacity - freePlaces[gender]
  const owedCzk = computeTermOwed(term, payments)
  return {
    owedCzk,
    debtCzk: Math.max(owedCzk, 0),
    confirmationExceedsCapacity: exceedsCapacityWhenConfirmed(gender, freePlaces),
    confirmationNextOccupied: confirmationOccupied + 1,
    capacity,
    occupied: confirmedGenders.length,
    confirmationCapacity,
    confirmationOccupied,
    confirmationDueCzk: Math.max(computeTermOwed({ ...term, status: "CONFIRMED" }, payments), 0),
  }
}
