import { useTranslation } from "react-i18next"

import { notify } from "@/lib/notify"

import { localeSchema, type SessionUser } from "@/features/auth/api/authSessionQueryOptions"
import { useUpdateProfile } from "@/features/auth/hooks/useUpdateProfile"

export function useAccountLanguage(locale: SessionUser["locale"] | undefined) {
  const { t } = useTranslation("auth")
  const update = useUpdateProfile()

  const changeLanguage = async (value: string) => {
    const parsed = localeSchema.safeParse(value)
    if (!parsed.success || parsed.data === locale) return
    try {
      const saved = await update.mutateAsync({ locale: parsed.data })
      notify.success(t("profile.saved.title"), t(`profile.saved.description.${saved.locale}`))
    } catch {
      notify.error(t("appearance.languageFailed"))
    }
  }
  return { changeLanguage, isPending: update.isPending }
}
