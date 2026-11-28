import { PrismaService } from "@/core/prisma/prisma.service"
import { isTermEditable } from "@/modules/applications/domain/edit-window"
import { todayInPrague } from "@/modules/applications/domain/waitlist-expiry"
import { canWriteRoomWishes, canWriteStay } from "@/modules/participants/domain/arrangement-rules"
import { Injectable } from "@nestjs/common"

export type TermArrangement = {
  termId: string
  name: string | null
  startsOn: Date
  endsOn: Date
  status: string
  /** The term is not over or cancelled: wishes and stay can still be changed. */
  editable: boolean
  /** Only for a confirmed term of a participant without individual accommodation (US-146). */
  roomWishes?: { names: string[]; noRoomWishes: boolean; canDecline: boolean }
  /** Prague wall time or `null`; absent for a cancelled or archived term (US-143). */
  stay?: { lateArrivalAt: Date | null; earlyDepartureAt: Date | null }
}

export type Arrangements = {
  applicationId: string
  eventName: string
  firstName: string
  lastName: string
  terms: TermArrangement[]
}

/** What the participant writes in each term, read for the organizer who can write it too (D-191). */
@Injectable()
export class ArrangementsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(organizationId: string, applicationId: string): Promise<Arrangements | null> {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, organizationId },
      select: {
        firstName: true,
        lastName: true,
        individualAccommodation: true,
        event: { select: { name: true } },
        terms: {
          orderBy: { term: { startsOn: "asc" } },
          select: {
            status: true,
            roomWishes: true,
            noRoomWishes: true,
            lateArrivalAt: true,
            earlyDepartureAt: true,
            term: {
              select: {
                id: true,
                name: true,
                startsOn: true,
                endsOn: true,
                cancelledAt: true,
                roomsPublishedAt: true,
              },
            },
          },
        },
      },
    })
    if (!application) return null
    return {
      applicationId,
      eventName: application.event.name,
      firstName: application.firstName,
      lastName: application.lastName,
      terms: application.terms.map((row) => {
        const state = { status: row.status, termCancelled: row.term.cancelledAt !== null }
        const isOpen = canWriteStay(state)
        const hasWishes = canWriteRoomWishes(state, application.individualAccommodation)
        const names = row.roomWishes
        const editable = isTermEditable(
          { status: row.status, endsOn: row.term.endsOn, cancelledAt: row.term.cancelledAt },
          todayInPrague(new Date()),
        )
        return {
          termId: row.term.id,
          name: row.term.name,
          startsOn: row.term.startsOn,
          endsOn: row.term.endsOn,
          status: row.status,
          editable,
          ...(hasWishes
            ? {
                roomWishes: {
                  names,
                  noRoomWishes: row.noRoomWishes,
                  canDecline:
                    editable &&
                    names.length === 0 &&
                    !row.noRoomWishes &&
                    row.term.roomsPublishedAt === null,
                },
              }
            : {}),
          ...(isOpen
            ? { stay: { lateArrivalAt: row.lateArrivalAt, earlyDepartureAt: row.earlyDepartureAt } }
            : {}),
        }
      }),
    }
  }
}
