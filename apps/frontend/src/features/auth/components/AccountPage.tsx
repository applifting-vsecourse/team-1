import { useState } from "react"
import { useTranslation } from "react-i18next"

import { BrandPageHeader } from "@/components/molecules/BrandPageHeader"
import { SettingsRow, SettingsSection } from "@/components/molecules/SettingsRows"
import { Button } from "@/components/ui/button"
import { useConnectionFeedback } from "@/hooks/useConnectionFeedback"

import { ChangeEmailSection } from "@/features/auth/components/ChangeEmailSection"
import { ChangePasswordForm } from "@/features/auth/components/ChangePasswordForm"
import { PreferencesCard } from "@/features/auth/components/PreferencesCard"
import { ProfileForm } from "@/features/auth/components/ProfileForm"
import { useEmailChangedNotice } from "@/features/auth/hooks/useEmailChangedNotice"
import { useSession } from "@/features/auth/hooks/useSession"

/**
 * Account settings of every signed-in account on one page, without tabs: „Profil“ (name, sign-in
 * e-mail), „Předvolby“ (language, appearance) and „Zabezpečení“ (password). Each setting is a row
 * with its value; the name and the password open an inline form, the e-mail its dialog. Signing out
 * stays in the account menu.
 */
// Figma (Design system v2): US-124 / Nastavení účtu · výchozí · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=19504-8672 (360 px: node-id=19504-8792)
// Figma (Design system v2): US-124 / Změnit heslo · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=19504-9261 (360 px: node-id=19504-9400); US-125 / Změna e-mailu · node-id=22404-23993
export function AccountPage({ isEmailChanged = false }: { isEmailChanged?: boolean }) {
  useConnectionFeedback()
  const { t } = useTranslation("auth")
  const { user } = useSession()
  useEmailChangedNotice(isEmailChanged, user?.email)
  const [editing, setEditing] = useState<"name" | "password" | null>(null)

  if (!user) return null

  const editButton = (setting: "name" | "password", label: string) =>
    editing === setting ? null : (
      <Button
        variant="ghost"
        onClick={() => setEditing(setting)}
      >
        {label}
      </Button>
    )

  return (
    <div className="mx-auto flex w-full max-w-160 flex-col gap-8">
      <BrandPageHeader title={t("account.title")} />
      <SettingsSection
        id="account-profile"
        title={t("account.tabs.profile")}
      >
        <SettingsRow
          label={t("profile.name")}
          value={editing === "name" ? null : user.name}
          action={editButton("name", t("account.edit"))}
        >
          {editing === "name" ? (
            <ProfileForm
              user={user}
              onClose={() => setEditing(null)}
            />
          ) : null}
        </SettingsRow>
        <ChangeEmailSection user={user} />
      </SettingsSection>
      <PreferencesCard user={user} />
      <SettingsSection
        id="account-security"
        title={t("account.tabs.security")}
      >
        <SettingsRow
          label={t("account.password")}
          action={editButton("password", t("changePassword.submit"))}
        >
          {editing === "password" ? <ChangePasswordForm onClose={() => setEditing(null)} /> : null}
        </SettingsRow>
      </SettingsSection>
    </div>
  )
}
