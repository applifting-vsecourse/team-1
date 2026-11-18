import { isValidBirthDate } from "@/modules/applications/domain/submission"
import {
  ApplicationEditRepository,
  EditableApplication,
  EditInput,
} from "@/modules/participants/repositories/application-edit.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { normalizeAccommodation } from "@/shared/domain/accommodation"
import { isValidPhone, normalizePhone } from "@/shared/domain/phone"
import { AppException } from "@/shared/errors/app.exception"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { HttpStatus, Injectable } from "@nestjs/common"

/** What the client sends: the phone is optional, an empty one means none. */
type EditRequest = Omit<EditInput, "phone"> & { phone?: string | null }

@Injectable()
export class ApplicationEditService {
  constructor(
    private readonly edits: ApplicationEditRepository,
    private readonly access: OrganizationAccessService,
  ) {}

  async get(user: Identity, applicationId: string): Promise<EditableApplication> {
    const application = await this.edits.findOneOfUser(user.id, applicationId)
    if (!application) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    return application
  }

  async save(
    user: Identity,
    applicationId: string,
    input: EditRequest,
  ): Promise<EditableApplication> {
    const application = await this.edits.save(
      { userId: user.id },
      this.editor(user),
      applicationId,
      this.validated(input),
    )
    if (!application) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    return application
  }

  /** An organizer of the application's organization edits it (D-141); the applicant is not e-mailed (D-104). */
  async saveByOrganizer(
    user: Identity,
    applicationId: string,
    input: EditRequest,
  ): Promise<EditableApplication> {
    const { organizationId } = await this.access.assertCanAccessApplication(user, applicationId)
    const application = await this.edits.save(
      { organizationId },
      this.editor(user),
      applicationId,
      this.validated(input),
    )
    if (!application) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    return application
  }

  private editor(user: Identity) {
    return { id: user.id, name: user.name?.trim() || user.email }
  }

  private validated(input: EditRequest): EditInput {
    const normalized: EditInput = {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      birthDate: input.birthDate,
      phone: normalizePhone(input.phone),
      ...normalizeAccommodation(input.individualAccommodation, input.accommodationRequest),
    }
    if (!normalized.firstName || !normalized.lastName || !isValidBirthDate(normalized.birthDate)) {
      throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
    }
    // The phone is optional; a filled-in one has to be a phone.
    if (!isValidPhone(normalized.phone)) {
      throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_PHONE")
    }
    return normalized
  }
}
