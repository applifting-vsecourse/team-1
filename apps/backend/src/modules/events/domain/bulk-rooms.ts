import { RoomInput, RoomMode } from "@/modules/events/domain/rooms"

/** Cap on the rooms of one bulk create (one dialog submit, one transaction); in a gendered term it applies to the sum. */
export const BULK_ROOMS_MAX_COUNT = 200
export const BULK_ROOMS_MAX_FIRST_NUMBER = 999_999

/** Shared term: `count`. Gendered term: `countFemale` + `countMale`. The cap applies to their sum. */
export type BulkRoomsPlan = {
  capacity: number
  firstNumber: number
  count?: number
  countFemale?: number
  countMale?: number
}

/** What a bulk create did: the names it created and the ones it skipped because the term already had them. */
export type BulkRoomsResult = { created: string[]; skipped: string[] }

/**
 * Rooms a bulk request produces, numbered one after another from `firstNumber` (women's rooms first,
 * then men's), all with the same capacity. Null when the counts do not fit the term's room mode or
 * the cap.
 */
export function planBulkRooms(
  { capacity, firstNumber, count, countFemale, countMale }: BulkRoomsPlan,
  mode: RoomMode,
): RoomInput[] | null {
  const groups =
    mode === "SHARED"
      ? countFemale === undefined && countMale === undefined && count !== undefined
        ? [{ gender: null, size: count }]
        : null
      : count === undefined
        ? [
            { gender: "FEMALE" as const, size: countFemale ?? 0 },
            { gender: "MALE" as const, size: countMale ?? 0 },
          ]
        : null
  if (!groups) return null
  const total = groups.reduce((sum, group) => sum + group.size, 0)
  if (total < 1 || total > BULK_ROOMS_MAX_COUNT) return null
  return groups
    .flatMap(({ gender, size }) => Array.from({ length: size }, () => gender))
    .map((gender, index) => ({ name: String(firstNumber + index), capacity, gender }))
}
