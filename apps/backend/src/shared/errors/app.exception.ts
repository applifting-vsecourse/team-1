import { HttpException, HttpStatus } from "@nestjs/common"
import { ErrorCode } from "./error-code"

/**
 * An HTTP error with a code the frontend can translate.
 *
 * @example
 * throw new AppException(HttpStatus.CONFLICT, 'EMAIL_TAKEN_BY_ORGANIZER', 'E-mail belongs to an organizer');
 */
export class AppException extends HttpException {
  constructor(
    status: HttpStatus,
    public readonly code: ErrorCode,
    message: string = code,
    /** Values the frontend interpolates into the translated message. */
    params?: Record<string, string>,
  ) {
    super({ statusCode: status, code, message, ...(params && { params }) }, status)
  }
}
