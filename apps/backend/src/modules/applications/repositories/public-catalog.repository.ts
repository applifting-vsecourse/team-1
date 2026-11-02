import { PrismaService } from "@/core/prisma/prisma.service"
import {
  CatalogEvent,
  CatalogEventDetail,
  summarizeTerms,
} from "@/modules/applications/domain/public-catalog"
import { isOpenForApplications } from "@/modules/applications/domain/public-event"
import { Injectable } from "@nestjs/common"

const isoDate = (date: Date): string => date.toISOString().slice(0, 10)

/** Only events the organizer published in the catalog (US-122) are ever read here. */
const published = { publishedInCatalog: true }

const termsInclude = {
  where: { cancelledAt: null },
  orderBy: [{ startsOn: "asc" as const }, { name: "asc" as const }],
  select: {
    id: true,
    name: true,
    startsOn: true,
    endsOn: true,
    priceCzk: true,
    _count: { select: { rooms: true } },
  },
}

@Injectable()
export class PublicCatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listPublished(): Promise<CatalogEvent[]> {
    const events = await this.prisma.event.findMany({
      where: published,
      select: {
        publicToken: true,
        name: true,
        location: true,
        organization: { select: { id: true, name: true } },
        terms: termsInclude,
      },
    })

    return events
      .map((event) => {
        return {
          publicToken: event.publicToken,
          name: event.name,
          organizationId: event.organization.id,
          organizationName: event.organization.name,
          location: event.location,
          terms: event.terms.map((term) => ({
            startsOn: isoDate(term.startsOn),
            endsOn: isoDate(term.endsOn),
          })),
          ...summarizeTerms(event.terms),
          isOpenForApplications: isOpenForApplications({
            termCount: event.terms.length,
            termsWithoutRooms: event.terms.filter((term) => term._count.rooms === 0).length,
          }),
        }
      })
      .sort(
        (a, b) =>
          (a.terms[0]?.startsOn ?? "9999").localeCompare(b.terms[0]?.startsOn ?? "9999") ||
          a.name.localeCompare(b.name, "cs"),
      )
  }

  async findPublished(publicToken: string): Promise<CatalogEventDetail | null> {
    const event = await this.prisma.event.findFirst({
      where: { publicToken, ...published },
      select: {
        publicToken: true,
        name: true,
        description: true,
        location: true,
        contactEmail: true,
        contactPhone: true,
        organization: { select: { name: true } },
        photo: { select: { id: true } },
        terms: termsInclude,
      },
    })
    if (!event) return null

    return {
      publicToken: event.publicToken,
      name: event.name,
      organizationName: event.organization.name,
      description: event.description,
      location: event.location,
      contactEmail: event.contactEmail,
      contactPhone: event.contactPhone,
      terms: event.terms.map((term) => ({
        id: term.id,
        name: term.name,
        startsOn: isoDate(term.startsOn),
        endsOn: isoDate(term.endsOn),
        priceCzk: term.priceCzk,
      })),
      hasPhoto: event.photo !== null,
      isOpenForApplications: isOpenForApplications({
        termCount: event.terms.length,
        termsWithoutRooms: event.terms.filter((term) => term._count.rooms === 0).length,
      }),
    }
  }

  async findPublishedPhoto(
    publicToken: string,
  ): Promise<{ contentType: string; data: Uint8Array; updatedAt: Date } | null> {
    const photo = await this.prisma.eventPhoto.findFirst({
      where: { event: { publicToken, ...published } },
      select: { contentType: true, data: true, updatedAt: true },
    })
    return photo
  }
}
