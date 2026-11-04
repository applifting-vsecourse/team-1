import { eligibleSubstitutes, freeBedsOf } from "@/modules/applications/domain/substitutes"
import {
  SubstituteApplication,
  SubstitutesRepository,
  SubstituteTermState,
} from "@/modules/applications/repositories/substitutes.repository"
import { TermStatusService } from "@/modules/applications/services/term-status.service"
import { Identity } from "@/shared/auth/domain/identity"
import { GenderCounts } from "@/shared/domain/gender"
import { AppException } from "@/shared/errors/app.exception"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { HttpStatus, Injectable } from "@nestjs/common"

export type SubstituteList = {
  termId: string
  evaluationMode: "AUTOMATIC" | "MANUAL"
  roomMode: "GENDERED" | "SHARED"
  freeBeds: GenderCounts
  items: (SubstituteApplication & { position: number })[]
}

/**
 * Manual filling of a freed bed by a waitlisted application (US-104, process step "ručně
 * potvrdit"). Who is eligible is `eligibleSubstitutes`; the confirmation itself is the single
 * status change of `TermStatusService`, which locks the event and re-checks the beds.
 */
@Injectable()
export class SubstitutesService {
  constructor(
    private readonly repository: SubstitutesRepository,
    private readonly access: OrganizationAccessService,
    private readonly statuses: TermStatusService,
  ) {}

  async list(user: Identity, eventId: string, termId: string): Promise<SubstituteList> {
    const { state } = await this.load(user, eventId, termId)
    const byId = new Map(state.waitlisted.map((row) => [row.applicationId, row]))
    // Filling by hand is for the manual evaluation mode only; nobody is offered otherwise.
    const eligible =
      state.evaluationMode === "MANUAL" ? eligibleSubstitutes(state, state.waitlisted) : []
    return {
      termId,
      evaluationMode: state.evaluationMode,
      roomMode: state.roomMode,
      freeBeds: freeBedsOf(state),
      items: eligible.map((row) => ({ ...byId.get(row.applicationId)!, position: row.position })),
    }
  }

  async confirm(
    user: Identity,
    eventId: string,
    termId: string,
    applicationId: string,
  ): Promise<void> {
    const { organizationId, state } = await this.load(user, eventId, termId)
    if (state.evaluationMode !== "MANUAL")
      throw new AppException(HttpStatus.CONFLICT, "MANUAL_FILL_NOT_AVAILABLE")
    if (!state.waitlisted.some((row) => row.applicationId === applicationId))
      throw new AppException(HttpStatus.CONFLICT, "INVALID_STATUS_TRANSITION")
    try {
      await this.statuses.applyChange({
        organizationId,
        applicationId,
        termId,
        to: "CONFIRMED",
        actorId: user.id,
        isOverCapacityConfirmed: false,
      })
    } catch (error) {
      // Checked under the event lock: someone took the bed since the list was shown.
      if (error instanceof AppException && error.code === "CAPACITY_EXCEEDED")
        throw new AppException(HttpStatus.CONFLICT, "BED_ALREADY_TAKEN")
      throw error
    }
  }

  private async load(
    user: Identity,
    eventId: string,
    termId: string,
  ): Promise<{ organizationId: string; state: SubstituteTermState }> {
    const { organizationId } = await this.access.assertCanAccessEvent(user, eventId)
    const state = await this.repository.findTermState(organizationId, eventId, termId)
    if (!state) throw new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND")
    return { organizationId, state }
  }
}
