import {
  buildSubmissionStatus,
  SubmissionStatus,
} from "@/modules/participants/domain/my-application"
import { MyApplicationsRepository } from "@/modules/participants/repositories/my-applications.repository"
import { AppException } from "@/shared/errors/app.exception"
import { HttpStatus, Injectable } from "@nestjs/common"

/** US-25: the page after sending, reached by the secret token of one of its applications. */
@Injectable()
export class SubmissionStatusService {
  constructor(private readonly applications: MyApplicationsRepository) {}

  async get(accessToken: string): Promise<SubmissionStatus> {
    const submission = await this.applications.findSubmissionByAccessToken(accessToken)
    if (!submission) throw new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND")
    return buildSubmissionStatus(submission)
  }
}
