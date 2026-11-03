import { useEffect } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { notify } from "@/lib/notify"

/**
 * The link of the verification e-mail ends on the account settings with `?emailChanged`:
 * say once that the address has changed (a toast), then drop the parameter so a reload
 * does not repeat it.
 */
export function useEmailChangedNotice(isEmailChanged: boolean, email: string | undefined) {
  const { t } = useTranslation("auth")
  const navigate = useNavigate()

  useEffect(() => {
    if (!isEmailChanged || !email) return
    notify.success(
      t("changeEmail.confirmed.title"),
      t("changeEmail.confirmed.description", { email }),
    )
    void navigate({ to: ".", search: {}, replace: true })
  }, [isEmailChanged, email, t, navigate])
}
