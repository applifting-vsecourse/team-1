import { useTranslation } from "react-i18next"

import { Card } from "@/components/ui/card"

import type { OrganizationContact as OrganizationContactData } from "@/features/participant/api/applications"
import { toTelHref } from "@/features/participant/lib/format"

type OrganizationContactProps = { contact: OrganizationContactData }

const linkClass =
  "flex min-w-0 flex-col gap-2 rounded-md bg-action-subtle px-3 py-2 hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
const valueClass =
  "flex min-h-11 items-center wrap-anywhere p-1 text-primary underline dark:text-link"

/** Who to call or write to about the event: the organization, its e-mail and phone. A missing line is left out; with neither e-mail nor phone a note says the contact isn't published (D-092). */
// Figma (Design system v2): US-121 / Kontakt organizace u přihlášky · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=19390-20928 (360 px: node-id=19390-21088)
// Figma (Design system v2): US-54 + US-121 / bez zveřejněného kontaktu · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=18783-627 (360 px: node-id=18783-775)
export function OrganizationContact({ contact }: OrganizationContactProps) {
  const { t } = useTranslation("participant")

  return (
    <Card className="@container gap-3 rounded-lg p-4 shadow-none">
      <h2 className="text-2xl/8 font-bold">{t("contact.title")}</h2>
      <p className="text-xl/7 font-bold">{contact.name}</p>
      {!contact.email && !contact.phone ? (
        <p className="text-sm text-muted-foreground">{t("contact.none")}</p>
      ) : (
        <div className="grid gap-3 @min-[34rem]:grid-cols-2">
          {contact.email && (
            <a
              className={linkClass}
              href={`mailto:${contact.email}`}
            >
              <span
                aria-hidden="true"
                className="text-sm text-muted-foreground"
              >
                {t("contact.email")}
              </span>
              <span className={valueClass}>{contact.email}</span>
            </a>
          )}
          {contact.phone && (
            <a
              className={linkClass}
              href={toTelHref(contact.phone)}
            >
              <span
                aria-hidden="true"
                className="text-sm text-muted-foreground"
              >
                {t("contact.phone")}
              </span>
              <span className={valueClass}>{contact.phone}</span>
            </a>
          )}
        </div>
      )}
    </Card>
  )
}
