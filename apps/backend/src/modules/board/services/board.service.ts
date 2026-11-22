import {
  BoardSummary,
  BoardTerm,
  OrganizerPost,
  OrganizerPostItem,
  ParticipantPost,
} from "@/modules/board/domain/board"
import { summarize } from "@/modules/board/domain/board-summary"
import { areTermsValid, normalizePostInput } from "@/modules/board/domain/validate-post"
import { BoardRepository } from "@/modules/board/repositories/board.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { AppException } from "@/shared/errors/app.exception"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { ForbiddenException, HttpStatus, Injectable } from "@nestjs/common"

@Injectable()
export class BoardService {
  constructor(
    private readonly repository: BoardRepository,
    private readonly access: OrganizationAccessService,
  ) {}

  private async scope(user: Identity, eventId: string) {
    const { organizationId } = await this.access.assertCanAccessEvent(user, eventId)
    return { eventId, organizationId }
  }

  /** The texts fit the limits and every term is one of the event and not cancelled. */
  private async valid(
    eventId: string,
    raw: { title?: unknown; body?: unknown; termIds?: unknown },
  ) {
    const input = normalizePostInput(raw)
    if (!input) throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
    if (!areTermsValid(input.termIds, await this.repository.eventTerms(eventId))) {
      throw new AppException(HttpStatus.BAD_REQUEST, "BOARD_POST_TERM_INVALID")
    }
    return input
  }

  /**
   * A post of another organization or account and a missing one end in the same 403 with no
   * content, so the answer never reveals whether the id exists (rules of the repo).
   */
  private notFound(): ForbiddenException {
    return new ForbiddenException()
  }

  // --- Organizer ---

  /** The terms the dialog offers: the active ones of the event. */
  async activeTerms(user: Identity, eventId: string): Promise<BoardTerm[]> {
    await this.scope(user, eventId)
    return (await this.repository.eventTerms(eventId))
      .filter((term) => !term.isCancelled)
      .map(({ id, name, startsOn, endsOn }) => ({ id, name, startsOn, endsOn }))
  }

  async list(user: Identity, eventId: string): Promise<OrganizerPostItem[]> {
    return this.repository.listForEvent(await this.scope(user, eventId))
  }

  async get(user: Identity, eventId: string, id: string): Promise<OrganizerPost> {
    const post = await this.repository.findForEvent(await this.scope(user, eventId), id)
    if (!post) throw this.notFound()
    return post
  }

  async create(
    user: Identity,
    eventId: string,
    raw: { title?: unknown; body?: unknown; termIds?: unknown },
  ): Promise<OrganizerPost> {
    const scope = await this.scope(user, eventId)
    const id = await this.repository.create(scope, user.id, await this.valid(eventId, raw))
    return this.get(user, eventId, id)
  }

  async update(
    user: Identity,
    eventId: string,
    id: string,
    raw: { title?: unknown; body?: unknown; termIds?: unknown },
  ): Promise<OrganizerPost> {
    const scope = await this.scope(user, eventId)
    if (!(await this.repository.findForEvent(scope, id))) throw this.notFound()
    await this.repository.update(id, await this.valid(eventId, raw))
    return this.get(user, eventId, id)
  }

  async remove(user: Identity, eventId: string, id: string): Promise<void> {
    const scope = await this.scope(user, eventId)
    if (!(await this.repository.findForEvent(scope, id))) throw this.notFound()
    await this.repository.remove(id)
  }

  // --- Participant ---

  listForParticipant(user: Identity): Promise<ParticipantPost[]> {
    return this.repository.listForUser(user.id)
  }

  async summary(user: Identity): Promise<BoardSummary> {
    const [posts, unreadByApplication] = await Promise.all([
      this.repository.listForUser(user.id),
      this.repository.unreadByApplication(user.id),
    ])
    return summarize(posts, unreadByApplication)
  }

  /** A post of somebody else's term and a missing one look the same: 403 with no content. */
  async getForParticipant(user: Identity, id: string): Promise<ParticipantPost> {
    const post = await this.repository.findForUser(user.id, id)
    if (!post) throw this.notFound()
    return post
  }

  async markRead(user: Identity, id: string): Promise<void> {
    await this.getForParticipant(user, id)
    await this.repository.markRead(user.id, id)
  }
}
