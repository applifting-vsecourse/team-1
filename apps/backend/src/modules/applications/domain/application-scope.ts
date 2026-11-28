/**
 * Whose application a write goes to: the participant's own (`userId`, from the session) or any
 * application of the organizer's organization (checked by `OrganizationAccessService`). Both roles
 * share one set of rules; only the way the application is found differs (D-191).
 */
export type ApplicationScope = { userId: string } | { organizationId: string }

/** The organizer's edits are written to the history; the participant's own are not. */
export type OrganizerEditor = { id: string; name: string }

export const editorOf = (user: {
  id: string
  name: string | null
  email: string
}): OrganizerEditor => ({ id: user.id, name: user.name?.trim() || user.email })
