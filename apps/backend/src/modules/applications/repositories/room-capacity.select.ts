import { Prisma } from "@/generated/prisma/client"

/**
 * What the capacity of a term needs from its rooms (`RoomCapacity`): the beds, the gender, the
 * individual flag (US-145) and, for individual rooms only, the genders of the confirmed people
 * who sleep there, since their beds count into the capacity of those genders by occupancy.
 * The one select every query that feeds a capacity calculation uses.
 */
export const ROOM_CAPACITY_SELECT = {
  capacity: true,
  extraBeds: true,
  gender: true,
  individual: true,
  assignments: {
    where: { room: { individual: true }, applicationTerm: { status: "CONFIRMED" } },
    select: { applicationTerm: { select: { application: { select: { gender: true } } } } },
  },
} satisfies Prisma.RoomSelect
