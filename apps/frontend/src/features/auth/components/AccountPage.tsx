import { useEffect, useRef, useState } from "react"
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

type Setting = "name" | "password"

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
  const [editing, setEditing] = useState<Setting | null>(null)
  const [lastEdited, setLastEdited] = useState<Setting | null>(null)
  const formRef = useRef<HTMLDivElement>(null)
  const nameButton = useRef<HTMLButtonElement>(null)
  const passwordButton = useRef<HTMLButtonElement>(null)

  // The button disappears while its form is open: focus moves into the form and back to the button.
  useEffect(() => {
    if (editing) formRef.current?.querySelector("input")?.focus()
    else if (lastEdited) (lastEdited === "name" ? nameButton : passwordButton).current?.focus()
  }, [editing, lastEdited])

  if (!user) return null

  const editButton = (setting: Setting, label: string, accessibleLabel?: string) =>
    editing === setting ? null : (
      <Button
        ref={setting === "name" ? nameButton : passwordButton}
        variant="ghost"
        aria-label={accessibleLabel}
        onClick={() => {
          setLastEdited(setting)
          setEditing(setting)
        }}
      >
        {label}
      </Button>
    )

  return (
    <div className="mx-auto flex w-full max-w-160 flex-col gap-8">
      <BrandPageHeader
        title={t("account.title")}
        hasIllustration={user.accountType === "PARTICIPANT"}
      />
      <SettingsSection
        id="account-profile"
        title={t("account.tabs.profile")}
      >
        <SettingsRow
          label={t("profile.name")}
          value={editing === "name" ? null : user.name}
          action={editButton("name", t("account.edit"), t("account.editName"))}
        >
          {editing === "name" ? (
            <div ref={formRef}>
              <ProfileForm
                user={user}
                onClose={() => setEditing(null)}
              />
            </div>
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
          {editing === "password" ? (
            <div ref={formRef}>
              <ChangePasswordForm onClose={() => setEditing(null)} />
            </div>
          ) : null}
        </SettingsRow>
      </SettingsSection>
    </div>
  )
}
