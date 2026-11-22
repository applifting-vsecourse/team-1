import { PrismaService } from "@/core/prisma/prisma.service"
import { Prisma } from "@/generated/prisma/client"
import {
  BoardTerm,
  EventPostSource,
  OrganizerPost,
  OrganizerPostItem,
  ParticipantPost,
  PostInput,
} from "@/modules/board/domain/board"
import {
  pickRecipients,
  RecipientRow,
  ViewerTerm,
  visibleTermIds,
} from "@/modules/board/domain/visibility"
import { buildNotification, isoDay } from "@/modules/notifications/domain/notification"
import { NotificationsRepository } from "@/modules/notifications/repositories/notifications.repository"
import { Injectable } from "@nestjs/common"

type Scope = { eventId: string; organizationId: string }

const termSelect = { id: true, name: true, startsOn: true, endsOn: true } as const
const postTermsInclude = {
  terms: { include: { term: { select: termSelect } }, orderBy: { term: { number: "asc" } } },
} satisfies Prisma.EventPostInclude
const participantInclude = {
  ...postTermsInclude,
  event: { select: { name: true } },
} satisfies Prisma.EventPostInclude

type PostRow = Prisma.EventPostGetPayload<{ include: typeof postTermsInclude }>
type ParticipantRow = Prisma.EventPostGetPayload<{ include: typeof participantInclude }>

const toTerm = (term: {
  id: string
  name: string | null
  startsOn: Date
  endsOn: Date
}): BoardTerm => ({
  id: term.id,
  name: term.name,
  startsOn: isoDay(term.startsOn),
  endsOn: isoDay(term.endsOn),
})

const toOrganizerItem = (row: PostRow): OrganizerPostItem => ({
  id: row.id,
  title: row.title,
  createdAt: row.createdAt,
  source: row.source as EventPostSource,
  terms: row.terms.map((item) => toTerm(item.term)),
})

/** The only place of the board (US-91) that touches the database. */
@Injectable()
export class BoardRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsRepository,
  ) {}

  // --- Organizer ---

  /** The terms of the event as the dialog offers them. */
  async eventTerms(eventId: string): Promise<(BoardTerm & { isCancelled: boolean })[]> {
    const rows = await this.prisma.term.findMany({
      where: { eventId },
      orderBy: { number: "asc" },
      select: { ...termSelect, cancelledAt: true },
    })
    return rows.map((row) => ({ ...toTerm(row), isCancelled: row.cancelledAt !== null }))
  }

  async listForEvent({ eventId, organizationId }: Scope): Promise<OrganizerPostItem[]> {
    const rows = await this.prisma.eventPost.findMany({
      where: { eventId, organizationId },
      include: postTermsInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    })
    return rows.map(toOrganizerItem)
  }

  async findForEvent(
    { eventId, organizationId }: Scope,
    id: string,
  ): Promise<OrganizerPost | null> {
    const row = await this.prisma.eventPost.findFirst({
      where: { id, eventId, organizationId },
      include: postTermsInclude,
    })
    return row ? { ...toOrganizerItem(row), body: row.body } : null
  }

  /**
   * Writes the post and, in the same transaction, one notification for every account that sees it
   * (US-118 bell): the accounts with an application in a chosen term that is confirmed or a
   * substitute. An account with several applications is told once.
   */
  async create(
    { eventId, organizationId }: Scope,
    createdById: string,
    input: PostInput,
  ): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const post = await tx.eventPost.create({
        data: {
          organizationId,
          eventId,
          createdById,
          title: input.title,
          body: input.body,
          terms: { create: input.termIds.map((termId) => ({ termId })) },
        },
        include: { event: { select: { name: true } } },
      })
      const rows = await tx.applicationTerm.findMany({
        where: { termId: { in: input.termIds }, application: { eventId, userId: { not: null } } },
        select: {
          status: true,
          application: {
            select: { id: true, userId: true, createdAt: true, firstName: true, lastName: true },
          },
        },
      })
      const recipientRows: RecipientRow[] = rows.map((row) => ({
        userId: row.application.userId,
        applicationId: row.application.id,
        applicationCreatedAt: row.application.createdAt,
        status: row.status,
      }))
      const names = new Map(
        rows.map((row) => [
          row.application.id,
          `${row.application.firstName} ${row.application.lastName}`,
        ]),
      )
      for (const { userId, applicationId } of pickRecipients(recipientRows)) {
        await this.notifications.create(
          tx,
          buildNotification({
            userId,
            applicationId,
            eventPostId: post.id,
            kind: "BOARD_POST_PUBLISHED",
            params: {
              eventName: post.event.name,
              participantName: names.get(applicationId) ?? "",
              eventId,
              postId: post.id,
              postTitle: post.title,
            },
          }),
        )
      }
      return post.id
    })
  }

  /** Changes the texts and the terms; nobody is notified again and nobody's "read" is lost. */
  async update(id: string, input: PostInput): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.eventPostTerm.deleteMany({
        where: { postId: id, termId: { notIn: input.termIds } },
      }),
      this.prisma.eventPostTerm.createMany({
        data: input.termIds.map((termId) => ({ postId: id, termId })),
        skipDuplicates: true,
      }),
      this.prisma.eventPost.update({
        where: { id },
        data: { title: input.title, body: input.body },
      }),
    ])
  }

  /** The reads and the notifications of the post go with it. */
  async remove(id: string): Promise<void> {
    await this.prisma.eventPost.delete({ where: { id } })
  }

  // --- Participant ---

  /** The account's applications in terms, whatever their status: the domain decides what is seen. */
  private async viewerTerms(userId: string): Promise<ViewerTerm[]> {
    const rows = await this.prisma.applicationTerm.findMany({
      where: { application: { userId } },
      select: { termId: true, status: true, term: { select: { cancelledAt: true } } },
    })
    return rows.map((row) => ({
      termId: row.termId,
      status: row.status,
      termCancelled: row.term.cancelledAt !== null,
    }))
  }

  private toParticipantPost(
    row: ParticipantRow,
    visible: Set<string>,
    read: boolean,
  ): ParticipantPost {
    return {
      id: row.id,
      title: row.title,
      body: row.body,
      createdAt: row.createdAt,
      eventName: row.event.name,
      terms: row.terms.filter((item) => visible.has(item.termId)).map((item) => toTerm(item.term)),
      isNew: !read,
    }
  }

  private async readIds(userId: string, postIds: string[]): Promise<Set<string>> {
    const reads = await this.prisma.eventPostRead.findMany({
      where: { userId, postId: { in: postIds } },
      select: { postId: true },
    })
    return new Set(reads.map((read) => read.postId))
  }

  /** The posts of the terms the account sees, newest first. */
  async listForUser(userId: string): Promise<ParticipantPost[]> {
    const visible = visibleTermIds(await this.viewerTerms(userId))
    if (visible.size === 0) return []
    const rows = await this.prisma.eventPost.findMany({
      where: { terms: { some: { termId: { in: [...visible] } } } },
      include: participantInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    })
    const read = await this.readIds(
      userId,
      rows.map((row) => row.id),
    )
    return rows.map((row) => this.toParticipantPost(row, visible, read.has(row.id)))
  }

  /** Null when the post does not exist or the account does not see it: the same answer. */
  async findForUser(userId: string, id: string): Promise<ParticipantPost | null> {
    const visible = visibleTermIds(await this.viewerTerms(userId))
    if (visible.size === 0) return null
    const row = await this.prisma.eventPost.findFirst({
      where: { id, terms: { some: { termId: { in: [...visible] } } } },
      include: participantInclude,
    })
    if (!row) return null
    return this.toParticipantPost(row, visible, (await this.readIds(userId, [id])).has(id))
  }

  /** Opening a post: remembered once per account, and its notification is read with it. */
  async markRead(userId: string, postId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.eventPostRead.upsert({
        where: { postId_userId: { postId, userId } },
        create: { postId, userId },
        update: {},
      }),
      this.prisma.notification.updateMany({
        where: { userId, eventPostId: postId, readAt: null },
        data: { readAt: new Date() },
      }),
    ])
  }
}
