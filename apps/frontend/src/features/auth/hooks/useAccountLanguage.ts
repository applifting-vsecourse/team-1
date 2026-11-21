import { useTranslation } from "react-i18next"

import { notify } from "@/lib/notify"

import { localeSchema, type SessionUser } from "@/features/auth/api/authSessionQueryOptions"
import { useUpdateProfile } from "@/features/auth/hooks/useUpdateProfile"

export function useAccountLanguage(locale: SessionUser["locale"] | undefined) {
  const { t, i18n } = useTranslation("auth")
  const update = useUpdateProfile()

  const changeLanguage = async (value: string) => {
    const parsed = localeSchema.safeParse(value)
    if (!parsed.success) return
    if (parsed.data === locale) {
      await i18n.changeLanguage(parsed.data)
      return
    }
    try {
      await update.mutateAsync({ locale: parsed.data })
      notify.success(t("profile.saved.title"), t(`profile.saved.description.${parsed.data}`))
    } catch {
      notify.error(t("appearance.languageFailed"))
    }
  }
  return { changeLanguage, isPending: update.isPending }
}
