import type { BulkRoomsInput, BulkRoomsResult } from "@/features/events/api/rooms"

/** The API creates at most this many rooms per request (one transaction). */
export const BULK_REQUEST_MAX = 200
/** What the dialog accepts in one go; it is sent as several requests of up to 200 rooms. */
export const BULK_TOTAL_MAX = 1000
export const BULK_MAX_NUMBER = 999_999

export type BulkCounts = { shared?: number; female?: number; male?: number }

/**
 * Splits a big batch into consecutive requests of up to 200 rooms. The numbering continues from
 * request to request and, in a gendered term, women's rooms come before men's ones.
 */
export function splitBulkRooms(
  { shared, female = 0, male = 0 }: BulkCounts,
  capacity: number,
  firstNumber: number,
): BulkRoomsInput[] {
  const requests: BulkRoomsInput[] = []
  let sharedLeft = shared ?? 0
  let femaleLeft = female
  let maleLeft = male
  let next = firstNumber
  while (sharedLeft + femaleLeft + maleLeft > 0) {
    const size = Math.min(BULK_REQUEST_MAX, sharedLeft + femaleLeft + maleLeft)
    if (shared === undefined) {
      const countFemale = Math.min(femaleLeft, size)
      const countMale = size - countFemale
      requests.push({ capacity, firstNumber: next, countFemale, countMale })
      femaleLeft -= countFemale
      maleLeft -= countMale
    } else {
      requests.push({ capacity, firstNumber: next, count: size })
      sharedLeft -= size
    }
    next += size
  }
  return requests
}

/** Thrown when a request fails; carries what the earlier requests already created. */
export class BulkRoomsInterrupted extends Error {
  constructor(
    readonly reason: Error,
    readonly done: BulkRoomsResult,
  ) {
    super("Bulk room creation interrupted")
  }
}

/** Sends the requests one after another and stops at the first failure. */
export async function runBulkRooms(
  requests: BulkRoomsInput[],
  send: (request: BulkRoomsInput) => Promise<BulkRoomsResult>,
): Promise<BulkRoomsResult> {
  const total: BulkRoomsResult = { created: [], skipped: [] }
  for (const request of requests) {
    try {
      const result = await send(request)
      total.created.push(...result.created)
      total.skipped.push(...result.skipped)
    } catch (error) {
      throw new BulkRoomsInterrupted(
        error instanceof Error ? error : new Error(String(error)),
        total,
      )
    }
  }
  return total
}

/** `109, 110, 111, 120` → `109–111, 120`; at most `limit` groups, then an ellipsis. */
export function formatNumbers(names: string[], limit = 10): string {
  const groups: string[] = []
  let start = 0
  for (let index = 1; index <= names.length; index += 1) {
    const isRun = index < names.length && Number(names[index]) === Number(names[index - 1]) + 1
    if (isRun) continue
    groups.push(index - start > 1 ? `${names[start]}–${names[index - 1]}` : `${names[start]}`)
    start = index
  }
  return groups.length > limit ? `${groups.slice(0, limit).join(", ")}, …` : groups.join(", ")
}
