/** The last room added in this tab; both current totals must still match. */
export type RoomCapacityIncrease = {
  gender: "FEMALE" | "MALE"
  addedBeds: number
  capacity: Record<"FEMALE" | "MALE", number>
}
export const roomCapacityIncreaseKey = (eventId: string, termId: string) =>
  ["roomCapacityIncrease", eventId, termId] as const
