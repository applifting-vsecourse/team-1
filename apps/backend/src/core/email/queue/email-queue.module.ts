import { PrismaModule } from "@/core/prisma/prisma.module"
import { Module } from "@nestjs/common"
import { PrismaEmailJobRepository } from "./prisma-email-job.repository"

@Module({
  imports: [PrismaModule],
  providers: [PrismaEmailJobRepository],
  exports: [PrismaEmailJobRepository],
})
export class EmailQueueModule {}
