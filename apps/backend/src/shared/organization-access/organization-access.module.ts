import { PrismaModule } from '@/core/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { OrganizationAccessRepository } from './organization-access.repository';
import { OrganizationAccessService } from './organization-access.service';

@Module({
  imports: [PrismaModule],
  providers: [OrganizationAccessService, OrganizationAccessRepository],
  exports: [OrganizationAccessService],
})
export class OrganizationAccessModule {}
