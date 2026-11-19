import { RoomInput } from "@/modules/events/domain/rooms"
import { Gender } from "@/shared/domain/gender"

/** Technical cap on one bulk create; a typical event has tens of identical rooms. */
export const BULK_ROOMS_MAX_COUNT = 200
export const BULK_ROOMS_MAX_FIRST_NUMBER = 999_999

export type BulkRoomsPlan = { count: number; capacity: number; firstNumber: number }

/** Rooms a bulk create produces: numbered one after another from `firstNumber`, all with the same capacity. */
export function planBulkRooms(
  { count, capacity, firstNumber }: BulkRoomsPlan,
  gender: Gender | null,
): RoomInput[] {
  return Array.from({ length: count }, (_, index) => ({
    name: String(firstNumber + index),
    capacity,
    gender,
  }))
}
