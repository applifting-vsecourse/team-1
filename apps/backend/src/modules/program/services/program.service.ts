import {
  ApplicationProgram,
  EventProgram,
  isDayWithinTerm,
  isEndAfterStart,
  normalizeInput,
  ProgramInput,
} from "@/modules/program/domain/program"
import { ProgramRepository } from "@/modules/program/repositories/program.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { AppException } from "@/shared/errors/app.exception"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { HttpStatus, Injectable } from "@nestjs/common"

@Injectable()
export class ProgramService {
  constructor(
    private readonly repository: ProgramRepository,
    private readonly access: OrganizationAccessService,
  ) {}

  private async scope(user: Identity, eventId: string) {
    const { organizationId } = await this.access.assertCanAccessEvent(user, eventId)
    return { eventId, organizationId }
  }

  /** A block lives in an active term, on a day of the term, and ends after it starts. */
  private valid(
    term: { startsOn: string; endsOn: string; isCancelled: boolean },
    raw: Partial<ProgramInput>,
  ): ProgramInput {
    if (term.isCancelled) throw new AppException(HttpStatus.BAD_REQUEST, "TERM_CANCELLED")
    const input = normalizeInput(raw)
    if (!input) throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
    if (!isEndAfterStart(input.startTime, input.endTime)) {
      throw new AppException(HttpStatus.BAD_REQUEST, "PROGRAM_END_BEFORE_START")
    }
    if (!isDayWithinTerm(input.date, term)) {
      throw new AppException(HttpStatus.BAD_REQUEST, "PROGRAM_DAY_OUTSIDE_TERM", undefined, {
        startsOn: term.startsOn,
        endsOn: term.endsOn,
      })
    }
    return input
  }

  async list(user: Identity, eventId: string): Promise<EventProgram> {
    return this.repository.list(await this.scope(user, eventId))
  }

  async create(
    user: Identity,
    eventId: string,
    termId: string,
    raw: Partial<ProgramInput>,
  ): Promise<void> {
    const scope = await this.scope(user, eventId)
    const term = await this.repository.findTerm(scope, termId)
    if (!term) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    await this.repository.create(scope, termId, this.valid(term, raw))
  }

  async update(
    user: Identity,
    eventId: string,
    id: string,
    raw: Partial<ProgramInput>,
  ): Promise<void> {
    const scope = await this.scope(user, eventId)
    const term = await this.repository.termOfBlock(scope, id)
    if (!term) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    await this.repository.update(scope, id, this.valid(term, raw))
  }

  async remove(user: Identity, eventId: string, id: string): Promise<void> {
    const scope = await this.scope(user, eventId)
    if (!(await this.repository.termOfBlock(scope, id))) {
      throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    }
    await this.repository.remove(scope, id)
  }

  /** Someone else's application and a missing one look the same: 403 with no content. */
  async ofApplication(user: Identity, applicationId: string): Promise<ApplicationProgram> {
    const result = await this.repository.ofApplication(user.id, applicationId)
    if (!result) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Not your application")
    return result
  }
}
