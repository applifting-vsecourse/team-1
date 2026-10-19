import { ConfigModule } from "@applifting-io/nestjs-decorated-config"
import { Module } from "@nestjs/common"
import { AccountModule } from "./modules/account/account.module"
import { ApplicationsModule } from "./modules/applications/applications.module"
import { WelcomeModule } from "./modules/welcome/welcome.module"
import { AuthModule } from "./shared/auth/auth.module"
import { Config } from "./shared/config/config.service"

const imports = [
  ConfigModule.forRootAsync(Config, { validate: true }),
  AuthModule,
  WelcomeModule,
  AccountModule,
  ApplicationsModule,
]

@Module({
  imports,
})
export class AppModule {}
