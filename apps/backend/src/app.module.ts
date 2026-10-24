import { ConfigModule } from "@applifting-io/nestjs-decorated-config"
import { Module } from "@nestjs/common"
import { AccountModule } from "./modules/account/account.module"
import { ApplicationsModule } from "./modules/applications/applications.module"
import { RoomsModule } from "./modules/events/rooms.module"
import { EventsModule } from "./modules/events/events.module"
import { OverviewModule } from "./modules/overview/overview.module"
import { ParticipantsModule } from "./modules/participants/participants.module"
import { PaymentsModule } from "./modules/payments/payments.module"
import { WelcomeModule } from "./modules/welcome/welcome.module"
import { AuthModule } from "./shared/auth/auth.module"
import { Config } from "./shared/config/config.service"

const imports = [
  ConfigModule.forRootAsync(Config, { validate: true }),
  AuthModule,
  WelcomeModule,
  AccountModule,
  EventsModule,
  ApplicationsModule,
  RoomsModule,
  EventsModule,
  ParticipantsModule,
  PaymentsModule,
  OverviewModule,
]

@Module({
  imports,
})
export class AppModule {}
