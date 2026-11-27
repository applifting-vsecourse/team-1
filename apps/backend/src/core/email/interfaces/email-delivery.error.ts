/**
 * What is known about a failed send:
 * - `NOT_SENT`: the provider did not accept the message, another attempt cannot duplicate it,
 * - `UNKNOWN`: it may have been accepted (connection lost, server error),
 * - `CONFLICT`: the provider already has this key with another content, never send it again.
 */
export type DeliveryOutcome = "NOT_SENT" | "UNKNOWN" | "CONFLICT"

export class EmailDeliveryError extends Error {
  constructor(
    message: string,
    readonly outcome: DeliveryOutcome,
  ) {
    super(message)
    this.name = "EmailDeliveryError"
  }
}
