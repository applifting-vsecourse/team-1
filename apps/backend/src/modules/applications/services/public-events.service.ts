import {
  isOpenForApplications,
  PublicEvent,
} from '@/modules/applications/domain/public-event';
import { PublicEventsRepository } from '@/modules/applications/repositories/public-events.repository';
import { AppException } from '@/shared/errors/app.exception';
import { HttpStatus, Injectable } from '@nestjs/common';

@Injectable()
export class PublicEventsService {
  constructor(private readonly repository: PublicEventsRepository) {}

  /** The event behind an application link; an unknown or not yet open link is a 404. */
  async getByPublicToken(publicToken: string): Promise<PublicEvent> {
    const found = await this.repository.findByPublicToken(publicToken);
    if (
      !found ||
      !isOpenForApplications({
        termCount: found.event.terms.length,
        roomCount: found.roomCount,
      })
    ) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    }
    return found.event;
  }
}
