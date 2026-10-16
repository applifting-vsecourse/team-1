import { PrismaModule } from '@/core/prisma/prisma.module';
import { AuthModule } from '@/shared/auth/auth.module';
import { Module } from '@nestjs/common';
import { MeController } from './controllers/me.controller';
import { AccountRepository } from './repositories/account.repository';
import { AccountService } from './services/account.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [MeController],
  providers: [AccountService, AccountRepository],
})
export class AccountModule {}
