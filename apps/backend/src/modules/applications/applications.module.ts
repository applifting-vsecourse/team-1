import { PrismaModule } from '@/core/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { PublicEventsController } from './controllers/public-events.controller';
import { PublicEventsRepository } from './repositories/public-events.repository';
import { PublicEventsService } from './services/public-events.service';

@Module({
  imports: [PrismaModule],
  controllers: [PublicEventsController],
  providers: [PublicEventsService, PublicEventsRepository],
})
export class ApplicationsModule {}
