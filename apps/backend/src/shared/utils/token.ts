import { randomBytes } from 'node:crypto';

/**
 * URL-safe, unguessable token for public links: the application link of an
 * event (`Event.publicToken`) and the confirmation page (`Application.accessToken`).
 */
export function generateToken(bytes = 16): string {
  return randomBytes(bytes).toString('base64url');
}
