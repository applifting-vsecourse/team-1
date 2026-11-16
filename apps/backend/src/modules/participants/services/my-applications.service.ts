import { buildMyApplication, MyApplication } from "@/modules/participants/domain/my-application"
import { MyApplicationsRepository } from "@/modules/participants/repositories/my-applications.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { Config } from "@/shared/config/config.service"
import { AppException } from "@/shared/errors/app.exception"
import { HttpStatus, Injectable } from "@nestjs/common"

/** US-54: the signed-in participant sees only the applications attached to their own account. */
@Injectable()
export class MyApplicationsService {
  constructor(
    private readonly applications: MyApplicationsRepository,
    private readonly config: Config,
  ) {}

  async list(user: Identity): Promise<MyApplication[]> {
    const records = await this.applications.findAllOfUser(user.id)
    return records.map((record) => buildMyApplication(record, this.config.paymentSimulationEnabled))
  }

  /** Someone else's application and a missing one look the same: 403 with no content. */
  async get(user: Identity, applicationId: string): Promise<MyApplication> {
    const record = await this.applications.findOneOfUser(user.id, applicationId)
    if (!record) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Not your application")
    return buildMyApplication(record, this.config.paymentSimulationEnabled)
  }
}
