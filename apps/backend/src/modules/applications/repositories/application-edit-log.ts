import { Prisma } from "@/generated/prisma/client"
import { LogisticsField } from "@/modules/applications/domain/application-history"

/** Anything that can create rows: the Prisma service or a transaction. */
type Db = Pick<Prisma.TransactionClient, "applicationEdit">

export type LoggedEdit = {
  organizationId: string
  applicationId: string
  /** The organizer who wrote the value for the participant. */
  editor: { id: string; name: string }
  field: LogisticsField
  /** The term the value belongs to; `null` for a value of the whole application. */
  termId: string | null
  /** Text of the value before and after; `null` when empty. Never the health note itself. */
  from: string | null
  to: string | null
}

/**
 * An organizer wrote transport, roommate wishes, a stay or the health restriction for the
 * participant (D-191): the history of the application says who and what. It reuses the record of
 * edits of the details, a row that carries one of the `LogisticsField`s.
 */
export async function logOrganizerEdit(db: Db, entry: LoggedEdit): Promise<void> {
  await db.applicationEdit.create({
    data: {
      organizationId: entry.organizationId,
      applicationId: entry.applicationId,
      changedById: entry.editor.id,
      authorName: entry.editor.name,
      changedFields: [entry.field],
      before: { value: entry.from, termId: entry.termId },
      after: { value: entry.to, termId: entry.termId },
    },
  })
}
