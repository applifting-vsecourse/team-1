import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common"
import { Response } from "express"
import { AppException } from "./app.exception"
import { ErrorCode } from "./error-code"

export type ErrorBody = {
  statusCode: number
  code: ErrorCode
  message: string | string[]
  params?: Record<string, string>
}

const CODE_BY_STATUS: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: "VALIDATION_FAILED",
  [HttpStatus.UNAUTHORIZED]: "UNAUTHORIZED",
  [HttpStatus.FORBIDDEN]: "FORBIDDEN",
  [HttpStatus.NOT_FOUND]: "NOT_FOUND",
}

/** Maps any exception to the shape the frontend expects (see ErrorBody). */
export function toErrorBody(exception: unknown): ErrorBody {
  if (exception instanceof AppException) {
    return exception.getResponse() as ErrorBody
  }
  if (exception instanceof HttpException) {
    const status = exception.getStatus()
    const response = exception.getResponse()
    const message =
      typeof response === "object" && response !== null && "message" in response
        ? (response as { message: string | string[] }).message
        : exception.message
    return {
      statusCode: status,
      code: CODE_BY_STATUS[status] ?? (status >= 500 ? "INTERNAL" : "VALIDATION_FAILED"),
      message,
    }
  }
  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    code: "INTERNAL",
    message: "Internal server error",
  }
}

/**
 * Global filter: every Nest error response is `{ statusCode, code, message }`.
 * BetterAuth routes (/api/auth/*) are outside Nest and keep their own codes
 * (e.g. INVALID_EMAIL_OR_PASSWORD), which the frontend translates the same way.
 */
@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpErrorFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const body = toErrorBody(exception)
    if (body.statusCode >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : exception)
    }
    host.switchToHttp().getResponse<Response>().status(body.statusCode).json(body)
  }
}
