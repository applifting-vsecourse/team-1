/** What an organizer sets for the public page of an event (US-122): the web and the catalog read it. */
export type PublicPageInput = {
  name: string
  description: string | null
  location: string | null
  contactEmail: string | null
  contactPhone: string | null
  publishedInCatalog: boolean
}

/** A phone number: optional `+`, digits with spaces, dashes or brackets, 9–20 characters. */
export const PHONE_PATTERN = /^\+?[0-9][0-9 ()-]{7,18}[0-9]$/

/** Fields the catalog needs before an event may be listed there (decision on #215). */
export type MissingForCatalog = "DESCRIPTION" | "LOCATION" | "CONTACT_EMAIL"

/** Only these may go to the catalog: what a visitor sees there has to be filled in. */
export function missingForCatalog(
  page: Pick<PublicPageInput, "description" | "location" | "contactEmail">,
): MissingForCatalog[] {
  const missing: MissingForCatalog[] = []
  if (!page.description) missing.push("DESCRIPTION")
  if (!page.location) missing.push("LOCATION")
  if (!page.contactEmail) missing.push("CONTACT_EMAIL")
  return missing
}

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024

export type PhotoContentType = "image/jpeg" | "image/png"
export const PHOTO_CONTENT_TYPES: readonly PhotoContentType[] = ["image/jpeg", "image/png"]

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff]

const startsWith = (data: Uint8Array, signature: number[]): boolean =>
  data.length >= signature.length && signature.every((byte, index) => data[index] === byte)

/** The type the bytes really are, whatever the client claims; `null` for anything but JPEG / PNG. */
export function detectPhotoType(data: Uint8Array): PhotoContentType | null {
  if (startsWith(data, PNG_SIGNATURE)) return "image/png"
  if (startsWith(data, JPEG_SIGNATURE)) return "image/jpeg"
  return null
}

export type PhotoProblem = "TOO_LARGE" | "INVALID_TYPE"

/** `null` when the photo may be stored. */
export function photoProblem(data: Uint8Array): PhotoProblem | null {
  if (data.length > MAX_PHOTO_BYTES) return "TOO_LARGE"
  if (data.length === 0 || !detectPhotoType(data)) return "INVALID_TYPE"
  return null
}

/** A file name without a path, so it can be shown and sent back in a header safely. */
export function cleanFileName(raw: string | undefined, contentType: PhotoContentType): string {
  const base = (raw ?? "")
    .split(/[\\/]/)
    .pop()
    ?.replace(/[^\p{L}\p{N}._ -]/gu, "")
    .trim()
  return base ? base.slice(0, 100) : contentType === "image/png" ? "photo.png" : "photo.jpg"
}
