/**
 * Thrown from a route's `beforeLoad` when the signed-in account may not see
 * the area (403). Throwing — rather than rendering — stops the child routes'
 * loaders, so not even a request for the area's data is made.
 */
export class ForbiddenError extends Error {
  constructor() {
    super("Forbidden")
    this.name = "ForbiddenError"
  }
}
