import { PrismaService } from "@/core/prisma/prisma.service"
import { Prisma } from "@/generated/prisma/client"
import { computeTotalBeds } from "@/modules/applications/domain/capacity"
import {
  EvaluationMode,
  isEvaluationModeLocked,
} from "@/modules/applications/domain/evaluation-mode"
import { sortTerms } from "@/modules/events/domain/event-term"
import { NewEvent, StoredEvent } from "@/modules/events/domain/organizer-event"
import { PhotoContentType, PublicPageInput } from "@/modules/events/domain/public-page"
import { AppException } from "@/shared/errors/app.exception"
import { HttpStatus, Injectable } from "@nestjs/common"

const include = {
  organization: { select: { name: true } },
  terms: {
    where: { cancelledAt: null },
    select: {
      id: true,
      name: true,
      startsOn: true,
      endsOn: true,
      roomMode: true,
      rooms: { select: { capacity: true, gender: true } },
      _count: { select: { applicationTerms: { where: { status: "CONFIRMED" } } } },
    },
  },
  photo: { select: { fileName: true } },
  _count: { select: { applications: true } },
} as const

type EventRow = Prisma.EventGetPayload<{ include: typeof include }>

const isoDate = (date: Date): string => date.toISOString().slice(0, 10)

function toStored(row: EventRow): StoredEvent {
  const starts = row.terms.map((term) => isoDate(term.startsOn)).sort()
  const ends = row.terms.map((term) => isoDate(term.endsOn)).sort()
  const terms = row.terms.map((term) => ({
    id: term.id,
    name: term.name,
    startsOn: isoDate(term.startsOn),
    endsOn: isoDate(term.endsOn),
    roomMode: term.roomMode,
    roomCount: term.rooms.length,
    capacity: computeTotalBeds(term.rooms),
    confirmedCount: term._count.applicationTerms,
  }))
  return {
    id: row.id,
    organizationId: row.organizationId,
    organizationName: row.organization.name,
    name: row.name,
    description: row.description,
    location: row.location,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    publishedInCatalog: row.publishedInCatalog,
    photoFileName: row.photo?.fileName ?? null,
    publicToken: row.publicToken,
    createdAt: row.createdAt,
    termCount: row.terms.length,
    termsWithoutRooms: row.terms.filter((term) => term.rooms.length === 0).length,
    applicationCount: row._count.applications,
    evaluationMode: row.evaluationMode,
    cancellationStartsOn: row.cancellationStartsOn ? isoDate(row.cancellationStartsOn) : null,
    startsOn: starts[0] ?? null,
    endsOn: ends[ends.length - 1] ?? null,
    terms: sortTerms(terms),
  }
}

@Injectable()
export class EventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<StoredEvent | null> {
    const row = await this.prisma.event.findUnique({ where: { id }, include })
    return row ? toStored(row) : null
  }

  async findByOrganizations(organizationIds: string[]): Promise<StoredEvent[]> {
    const rows = await this.prisma.event.findMany({
      where: { organizationId: { in: organizationIds } },
      include,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    })
    return rows.map(toStored)
  }

  async create(event: NewEvent): Promise<StoredEvent> {
    const row = await this.prisma.event.create({ data: event, include })
    return toStored(row)
  }

  /** Saves the public page content of an event of the organization (US-122). */
  async updatePublicPage(id: string, organizationId: string, page: PublicPageInput): Promise<void> {
    const { count } = await this.prisma.event.updateMany({
      where: { id, organizationId },
      data: page,
    })
    if (count !== 1) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
  }

  async setCancellationStart(
    id: string,
    organizationId: string,
    cancellationStartsOn: string | null,
  ): Promise<void> {
    const { count } = await this.prisma.event.updateMany({
      where: { id, organizationId },
      data: {
        cancellationStartsOn: cancellationStartsOn
          ? new Date(`${cancellationStartsOn}T00:00:00.000Z`)
          : null,
      },
    })
    if (count !== 1) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
  }

  async savePhoto(
    eventId: string,
    photo: { fileName: string; contentType: PhotoContentType; data: Buffer },
  ): Promise<void> {
    const data = new Uint8Array(photo.data)
    await this.prisma.eventPhoto.upsert({
      where: { eventId },
      create: { eventId, ...photo, data },
      update: { ...photo, data },
    })
  }

  async deletePhoto(eventId: string): Promise<void> {
    await this.prisma.eventPhoto.deleteMany({ where: { eventId } })
  }

  async findPhoto(eventId: string): Promise<{ contentType: string; data: Uint8Array } | null> {
    return this.prisma.eventPhoto.findUnique({
      where: { eventId },
      select: { contentType: true, data: true },
    })
  }

  /**
   * Deletes the event with its terms and rooms, but only while it has no application;
   * the condition is part of the delete, so an application arriving meanwhile wins.
   */
  async deleteWithoutApplications(id: string): Promise<boolean> {
    const { count } = await this.prisma.event.deleteMany({
      where: { id, applications: { none: {} } },
    })
    return count === 1
  }

  /**
   * Changes the evaluation mode unless the event is locked (US-101). The check runs under the
   * event lock that applications and room writes take too, so it cannot race an opening write.
   */
  async setEvaluationMode(
    id: string,
    organizationId: string,
    evaluationMode: EvaluationMode,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM event WHERE id = ${id} AND "organizationId" = ${organizationId} FOR UPDATE`
      const row = await tx.event.findFirst({
        where: { id, organizationId },
        include: {
          terms: {
            where: { cancelledAt: null },
            select: { id: true, _count: { select: { rooms: true } } },
          },
          _count: { select: { applications: true } },
        },
      })
      if (!row) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
      if (row.evaluationMode === evaluationMode) return
      const locked = isEvaluationModeLocked({
        termCount: row.terms.length,
        termsWithoutRooms: row.terms.filter((term) => term._count.rooms === 0).length,
        applicationCount: row._count.applications,
      })
      if (locked) throw new AppException(HttpStatus.CONFLICT, "EVALUATION_MODE_LOCKED")
      await tx.event.update({ where: { id }, data: { evaluationMode } })
    })
  }
}
