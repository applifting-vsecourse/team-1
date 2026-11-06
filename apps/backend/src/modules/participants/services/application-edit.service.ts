import { isValidBirthDate } from "@/modules/applications/domain/submission"
import {
  ApplicationEditRepository,
  EditableApplication,
  EditInput,
} from "@/modules/participants/repositories/application-edit.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { AppException } from "@/shared/errors/app.exception"
import { HttpStatus, Injectable } from "@nestjs/common"

@Injectable()
export class ApplicationEditService {
  constructor(private readonly edits: ApplicationEditRepository) {}

  async get(user: Identity, applicationId: string): Promise<EditableApplication> {
    const application = await this.edits.findOneOfUser(user.id, applicationId)
    if (!application) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    return application
  }

  async save(
    user: Identity,
    applicationId: string,
    input: EditInput,
  ): Promise<EditableApplication> {
    const normalized: EditInput = {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      birthDate: input.birthDate,
      phone: input.phone?.trim() ?? null,
      accommodationRequest: input.accommodationRequest?.trim() || null,
    }
    if (
      !normalized.firstName ||
      !normalized.lastName ||
      !isValidBirthDate(normalized.birthDate) ||
      !normalized.phone
    ) {
      throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
    }
    const application = await this.edits.save(
      user.id,
      user.name?.trim() || user.email,
      applicationId,
      normalized,
    )
    if (!application) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    return application
  }
}
