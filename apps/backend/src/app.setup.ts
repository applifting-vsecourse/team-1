import { INestApplication } from "@nestjs/common"
import { toNodeHandler } from "better-auth/node"
import * as cookieParser from "cookie-parser"
import * as express from "express"
import { BetterAuth } from "./shared/auth/providers/better-auth.provider"
import { Config } from "./shared/config/config.service"
import { HttpErrorFilter } from "./shared/errors/http-error.filter"

/**
 * Everything the HTTP app needs besides its modules. Shared by `main.ts` and
 * the integration tests, so tests exercise exactly what production serves.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get(Config)

  // Configure CORS - Allows cross-origin requests from specific origins
  app.enableCors({
    origin: [config.backendUrl, config.frontendUrl],
    credentials: true,
  })

  // Setup cookie parser middleware
  app.use(cookieParser())

  const appInstance = app.getHttpAdapter().getInstance()
  const betterAuth = app.get<BetterAuth>("BetterAuth")
  // Express 5 (via NestJS 11) requires named wildcards — a bare `*` throws.
  appInstance.all("/api/auth/*splat", toNodeHandler(betterAuth))
  appInstance.use(express.json())
  // The photo of an event's public page is sent as the raw image (US-122). The limit is a bit above
  // the 2 MB the domain allows, so a slightly larger file gets the translated PHOTO_TOO_LARGE.
  appInstance.use(
    "/api/organizer/events/:eventId/photo",
    express.raw({ type: ["image/jpeg", "image/png"], limit: "4mb" }),
  )

  // Configure API prefix for all routes
  app.setGlobalPrefix("api")

  // Every error response is { statusCode, code, message } (shared/errors).
  app.useGlobalFilters(new HttpErrorFilter())
}
