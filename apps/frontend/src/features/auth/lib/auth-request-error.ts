/** A failed BetterAuth call, keeping the HTTP status the client reported. */
export class AuthRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = "AuthRequestError"
  }
}

/** BetterAuth refused the call because of its rate limit (429, #294). */
export function isRateLimited(error: unknown): boolean {
  return error instanceof AuthRequestError && error.status === 429
}
