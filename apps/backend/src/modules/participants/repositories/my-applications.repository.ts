import { PrismaService } from "@/core/prisma/prisma.service"
import { Prisma } from "@/generated/prisma/client"
import { computeVisibleRoomBeds } from "@/modules/applications/domain/capacity"
import { MyApplicationRecord, RoomOccupancy } from "@/modules/participants/domain/my-application"
import { toPragueWallTime } from "@/shared/domain/prague-wall-time"
import { Injectable } from "@nestjs/common"

const include = {
  _count: { select: { mealOptions: true } },
  health: { select: { id: true } },
  event: {
    select: { name: true, contactEmail: true, contactPhone: true, paymentPeriodDays: true },
  },
  organization: { select: { name: true, bankAccount: true } },
  terms: {
    include: {
      term: { include: { _count: { select: { transports: true } } } },
      roomAssignment: { select: { room: { select: { name: true } } } },
      payments: {
        where: { cancelledAt: null },
        select: { amountCzk: true, source: true, createdAt: true },
      },
      statusChanges: {
        where: { toStatus: "CONFIRMED" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  },
} as const

const roomDetailSelect = (applicationId: string) =>
  ({
    name: true,
    capacity: true,
    extraBeds: true,
    _count: { select: { assignments: true } },
    assignments: {
      where: {
        room: { term: { roomsPublishedAt: { not: null }, cancelledAt: null } },
        applicationTerm: {
          status: "CONFIRMED",
          OR: [{ applicationId }, { application: { individualAccommodation: false } }],
        },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        applicationTermId: true,
        applicationTerm: {
          select: { application: { select: { firstName: true, lastName: true } } },
        },
      },
    },
  }) satisfies Prisma.RoomSelect

const detailInclude = (applicationId: string) =>
  ({
    ...include,
    terms: {
      include: {
        ...include.terms.include,
        roomAssignment: { select: { room: { select: roomDetailSelect(applicationId) } } },
      },
    },
  }) satisfies Prisma.ApplicationInclude

type Row = Prisma.ApplicationGetPayload<{ include: typeof include }>
type DetailRow = Prisma.ApplicationGetPayload<{ include: ReturnType<typeof detailInclude> }>
type DetailRoom = Prisma.RoomGetPayload<{ select: ReturnType<typeof roomDetailSelect> }>

function roomOccupancy(room: DetailRoom, ownApplicationTermId: string): RoomOccupancy {
  const occupants = room.assignments
    .map(
      ({
        applicationTermId,
        applicationTerm: {
          application: { firstName, lastName },
        },
      }) => ({
        firstName,
        initials: `${Array.from(firstName)[0] ?? ""}${Array.from(lastName)[0] ?? ""}`.toUpperCase(),
        isSelf: applicationTermId === ownApplicationTermId,
      }),
    )
    .sort((a, b) => Number(b.isSelf) - Number(a.isSelf))
  return {
    beds: computeVisibleRoomBeds(room, room._count.assignments, occupants.length),
    occupants,
  }
}

/** The only place of the participant's application overview that touches the database. */
@Injectable()
export class MyApplicationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Newest first. Only applications attached to this account. */
  async findAllOfUser(userId: string): Promise<MyApplicationRecord[]> {
    const rows = await this.prisma.application.findMany({
      where: { userId },
      include,
      orderBy: { submittedAt: "desc" },
    })
    return rows.map(toRecord)
  }

  /** `null` when the application does not exist or belongs to someone else. */
  async findOneOfUser(userId: string, applicationId: string): Promise<MyApplicationRecord | null> {
    const row = await this.findRow(userId, applicationId)
    return row ? toRecord(row) : null
  }

  private findRow(userId: string, applicationId: string): Promise<DetailRow | null> {
    return this.prisma.application.findFirst({
      where: { id: applicationId, userId },
      include: detailInclude(applicationId),
    })
  }
}

function toRecord(row: Row | DetailRow): MyApplicationRecord {
  return {
    id: row.id,
    number: row.number,
    submittedAt: row.submittedAt,
    firstName: row.firstName,
    lastName: row.lastName,
    individualAccommodation: row.individualAccommodation,
    eventName: row.event.name,
    eventId: row.eventId,
    applicantEmail: row.email,
    birthDate: row.birthDate.toISOString().slice(0, 10),
    gender: row.gender,
    bankAccount: row.organization.bankAccount,
    paymentPeriodDays: row.event.paymentPeriodDays,
    organizationName: row.organization.name,
    contactEmail: row.event.contactEmail,
    contactPhone: row.event.contactPhone,
    mealsFilled:
      row._count.mealOptions > 0 ||
      Boolean(row.allergies?.trim()) ||
      Boolean(row.specialRequest?.trim()) ||
      row.noMealRestrictions,
    healthFilled: row.health !== null || row.noHealthRestriction,
    terms: row.terms.map(
      ({
        id,
        term,
        status,
        priceCzk,
        payments,
        statusChanges,
        evaluatedAt,
        paymentPeriodStartedAt,
        transportId,
        roomAssignment,
        roomWishes,
        lateArrivalAt,
        earlyDepartureAt,
      }) => ({
        termId: term.id,
        termNumber: term.number,
        name: term.name,
        startsOn: term.startsOn,
        endsOn: term.endsOn,
        status,
        priceCzk,
        payments,
        // A term confirmed without a recorded change (older data) counts from its evaluation.
        confirmedAt: statusChanges[0]?.createdAt ?? evaluatedAt,
        paymentPeriodStartedAt,
        // A cancelled term keeps the status of its applications, but nothing is arranged for it.
        transportOffered: term.cancelledAt === null && term._count.transports > 0,
        transportDecided: transportId !== null,
        roomsPublished: term.roomsPublishedAt !== null,
        roomName: roomAssignment?.room.name ?? null,
        ...(status === "CONFIRMED" &&
        term.roomsPublishedAt !== null &&
        term.cancelledAt === null &&
        roomAssignment &&
        "assignments" in roomAssignment.room
          ? { roomOccupancy: roomOccupancy(roomAssignment.room, id) }
          : {}),
        termCancelled: term.cancelledAt !== null,
        roomWishes,
        lateArrival: lateArrivalAt && toPragueWallTime(lateArrivalAt),
        earlyDeparture: earlyDepartureAt && toPragueWallTime(earlyDepartureAt),
      }),
    ),
  }
}
