import {
  buildSubmissionStatus,
  SubmissionStatus,
} from "@/modules/applications/domain/submission-status"
import { SubmissionStatusRepository } from "@/modules/applications/repositories/submission-status.repository"
import { AppException } from "@/shared/errors/app.exception"
import { HttpStatus, Injectable } from "@nestjs/common"

/** US-25: the page after sending, reached by the secret token of one of its applications. */
@Injectable()
export class SubmissionStatusService {
  constructor(private readonly repository: SubmissionStatusRepository) {}

  async get(accessToken: string): Promise<SubmissionStatus> {
    const submission = await this.repository.findByAccessToken(accessToken)
    if (!submission) throw new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND")
    return buildSubmissionStatus(submission)
  }
}
