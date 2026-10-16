import "i18next"

import type { defaultNS, resources } from "@/i18n/resources"

// Type-checked keys: t("pages.notFound.title") fails to compile if the key is
// missing from the English resources.
declare module "i18next" {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS
    resources: (typeof resources)["en"]
  }
}
