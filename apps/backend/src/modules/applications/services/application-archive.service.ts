import { todayInPrague } from "@/modules/applications/domain/waitlist-expiry"
import { ApplicationArchiveRepository } from "@/modules/applications/repositories/application-archive.repository"
import { Injectable } from "@nestjs/common"

/** Archives confirmed, paid terms from the calendar day after their end; sends no e-mail. */
@Injectable()
export class ApplicationArchiveService {
  constructor(private readonly repository: ApplicationArchiveRepository) {}

  archiveFinished(now: Date = new Date()): Promise<number> {
    return this.repository.archiveFinished(todayInPrague(now))
  }
}
