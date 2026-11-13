import {
  eligibleSubstitutes,
  freeBedsOf,
  proposedSubstitutes,
} from "@/modules/applications/domain/substitutes"
import { BedGroup } from "@/modules/applications/domain/waitlist"
import { isWaitlistExpired } from "@/modules/applications/domain/waitlist-expiry"
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

/** A free bed of a term and the substitute it is proposed to (US-31); the organizer's notice. */
export type SubstituteProposal = {
  termId: string
  termName: string | null
  startsOn: Date
  endsOn: Date
  group: BedGroup
  /** Free beds of the group; in shared rooms the one common pool. */
  freeBeds: number
  substitute: Pick<
    SubstituteApplication,
    "applicationId" | "firstName" | "lastName" | "gender" | "priceCzk"
  >
}

export type SubstituteList = {
  termId: string
  evaluationMode: "AUTOMATIC" | "MANUAL"
  roomMode: "GENDERED" | "SHARED"
  freeBeds: GenderCounts
  /** `isProposed`: the first of its bed group, whom the freed bed is offered to (US-31). */
  items: (SubstituteApplication & { position: number; isProposed: boolean })[]
}

/**
 * Filling a free bed by a waitlisted application at the organizer's confirmation (US-104, process
 * step "ručně potvrdit"; US-31 adds the proposal and the notice). Who is eligible is
 * `eligibleSubstitutes`, who is proposed `proposedSubstitutes`. It works in both evaluation modes:
 * the automatic one confirms by itself only the beds an action freed (`TermStatusService.
 * fillFreedBeds`), the rest, a bed a bigger capacity made, is left to the organizer. The
 * confirmation itself is the single status change of `TermStatusService`, which locks the event
 * and re-checks the beds.
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
    // Both evaluation modes: the automatic one fills only the beds an action freed, so a bed that
    // got there otherwise (a bigger capacity) is left to the organizer (US-31).
    const eligible = eligibleSubstitutes(state, state.waitlisted)
    const proposed = new Set(
      proposedSubstitutes(state, state.waitlisted).map((row) => row.applicationId),
    )
    return {
      termId,
      evaluationMode: state.evaluationMode,
      roomMode: state.roomMode,
      freeBeds: freeBedsOf(state),
      items: eligible.map((row) => ({
        ...byId.get(row.applicationId)!,
        position: row.position,
        isProposed: proposed.has(row.applicationId),
      })),
    }
  }

  /**
   * The notice of the organizer in the event administration (US-31): every open term with a free
   * bed that a waitlisted application of its bed group can take, with the first of them. In both
   * evaluation modes: the automatic one fills freed beds itself, but never one that a bigger
   * capacity made, and a bed it could not fill stays proposed. Terms that have started are left
   * out, their waitlist is cancelled (D-064).
   */
  async proposals(user: Identity, eventId: string): Promise<SubstituteProposal[]> {
    const { organizationId } = await this.access.assertCanAccessEvent(user, eventId)
    const states = await this.repository.findEventTermStates(organizationId, eventId)
    const now = new Date()
    return states
      .filter((state) => !isWaitlistExpired(state.startsOn, now))
      .flatMap((state) => {
        const byId = new Map(state.waitlisted.map((row) => [row.applicationId, row]))
        const free = freeBedsOf(state)
        return proposedSubstitutes(state, state.waitlisted).map((row) => {
          const substitute = byId.get(row.applicationId)!
          return {
            termId: state.termId,
            termName: state.name,
            startsOn: state.startsOn,
            endsOn: state.endsOn,
            group: row.group,
            freeBeds: free[substitute.gender],
            substitute: {
              applicationId: substitute.applicationId,
              firstName: substitute.firstName,
              lastName: substitute.lastName,
              gender: substitute.gender,
              priceCzk: substitute.priceCzk,
            },
          }
        })
      })
  }

  async confirm(
    user: Identity,
    eventId: string,
    termId: string,
    applicationId: string,
  ): Promise<void> {
    const { organizationId, state } = await this.load(user, eventId, termId)
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
