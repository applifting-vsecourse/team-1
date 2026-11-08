import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import {
  createOrganization,
  myOnboardingOrganizationsQueryOptions,
  organizationProfileQueryOptions,
  saveOrganizationProfile,
  type OrganizationProfile,
} from "@/features/auth/api/organizationOnboarding"
import { RegistrationLayout } from "@/features/auth/components/RegistrationLayout"

const bankAccountPattern = /^(?:\d{1,6}-)?\d{1,10}\/\d{4}$/

// Figma (Design system): #69 / Založit organizaci / Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-23249
// Figma (Design system): #69 / Doplňte profil organizace / Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-23375
// Figma (Design system): #69 / Organizace je připravená / Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-23521
export function OrganizationOnboarding() {
  const { t } = useTranslation("auth")
  const memberships = useQuery(myOnboardingOrganizationsQueryOptions())
  const [created, setCreated] = useState<OrganizationProfile | null>(null)
  const organizationId = created?.id ?? memberships.data?.[0]?.id
  const profileQuery = useQuery({
    ...organizationProfileQueryOptions(organizationId ?? ""),
    enabled: Boolean(organizationId) && !created,
  })
  const profile = created ?? profileQuery.data

  if (memberships.isPending || (organizationId && profileQuery.isPending && !created)) {
    return (
      <RegistrationLayout>
        <p>{t("registration.loading")}</p>
      </RegistrationLayout>
    )
  }
  if (memberships.error || profileQuery.error) {
    return (
      <RegistrationLayout>
        <Alert variant="destructive">
          <AlertDescription>{t("registration.loadFailed")}</AlertDescription>
        </Alert>
        <Button
          variant="outline"
          onClick={() => {
            void memberships.refetch()
            if (organizationId) void profileQuery.refetch()
          }}
        >
          {t("registration.retry")}
        </Button>
      </RegistrationLayout>
    )
  }
  if (!profile) return <CreateOrganizationForm onCreated={setCreated} />
  if (!profile.contactEmail || !profile.bankAccount) {
    return (
      <OrganizationProfileForm
        key={profile.id}
        profile={profile}
        onSaved={setCreated}
      />
    )
  }
  return <OrganizationReady profile={profile} />
}

function CreateOrganizationForm({
  onCreated,
}: {
  onCreated: (profile: OrganizationProfile) => void
}) {
  const { t } = useTranslation("auth")
  const [name, setName] = useState("")
  const [isSubmitted, setSubmitted] = useState(false)
  const [isPending, setPending] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
    setFailure(null)
    if (!name.trim()) return
    setPending(true)
    try {
      const organization = await createOrganization(name.trim())
      queryClient.setQueryData(myOnboardingOrganizationsQueryOptions().queryKey, [
        { id: organization.id, name: organization.name },
      ])
      onCreated(organization)
    } catch (error) {
      setFailure(error instanceof Error ? error.message : t("registration.failed"))
    } finally {
      setPending(false)
    }
  }

  return (
    <RegistrationLayout>
      <Seo title={t("registration.createOrganizationTitle")} />
      <h1 className="text-2xl font-bold tracking-tight">
        {t("registration.createOrganizationTitle")}
      </h1>
      <form
        noValidate
        onSubmit={(event) => void submit(event)}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <label
            htmlFor="organization-name"
            className="text-sm font-medium"
          >
            {t("registration.organizationName")}
          </label>
          <Input
            id="organization-name"
            className="h-12"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Lipno Events"
            aria-invalid={isSubmitted && !name.trim()}
          />
          {isSubmitted && !name.trim() ? (
            <p className="text-sm text-destructive">{t("registration.nameRequired")}</p>
          ) : null}
        </div>
        {failure ? (
          <Alert variant="destructive">
            <AlertDescription>{failure}</AlertDescription>
          </Alert>
        ) : null}
        <Button
          type="submit"
          size="lg"
          disabled={isPending}
          className="h-12 w-full"
        >
          {t("registration.createOrganization")}
        </Button>
      </form>
    </RegistrationLayout>
  )
}

function OrganizationProfileForm({
  profile,
  onSaved,
}: {
  profile: OrganizationProfile
  onSaved: (profile: OrganizationProfile) => void
}) {
  const { t } = useTranslation("auth")
  const [contactEmail, setContactEmail] = useState(profile.contactEmail ?? "")
  const [contactPhone, setContactPhone] = useState(profile.contactPhone ?? "")
  const [bankAccount, setBankAccount] = useState(profile.bankAccount)
  const [isSubmitted, setSubmitted] = useState(false)
  const [isPending, setPending] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const isValidEmail = z.string().email().safeParse(contactEmail.trim()).success
  const isValidBank = bankAccountPattern.test(bankAccount.trim())

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
    setFailure(null)
    if (!isValidEmail || !isValidBank) return
    setPending(true)
    try {
      const saved = await saveOrganizationProfile(profile.id, {
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        bankAccount: bankAccount.trim(),
      })
      queryClient.setQueryData(organizationProfileQueryOptions(profile.id).queryKey, saved)
      onSaved(saved)
    } catch (error) {
      setFailure(error instanceof Error ? error.message : t("registration.failed"))
    } finally {
      setPending(false)
    }
  }

  return (
    <RegistrationLayout>
      <Seo title={t("registration.profileTitle")} />
      <h1 className="text-2xl font-bold tracking-tight">{t("registration.profileTitle")}</h1>
      <form
        noValidate
        onSubmit={(event) => void submit(event)}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <label
            htmlFor="organization-contact"
            className="text-sm font-medium"
          >
            {t("registration.contactEmail")}
          </label>
          <Input
            id="organization-contact"
            className="h-12"
            type="email"
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
            placeholder="info@lipno.example.cz"
            aria-invalid={isSubmitted && !isValidEmail}
          />
          {isSubmitted && !isValidEmail ? (
            <p className="text-sm text-destructive">{t("registration.emailInvalid")}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <label
            htmlFor="organization-phone"
            className="text-sm font-medium"
          >
            {t("registration.phone")}
          </label>
          <Input
            id="organization-phone"
            className="h-12"
            type="tel"
            value={contactPhone}
            onChange={(event) => setContactPhone(event.target.value)}
            placeholder="+420 777 123 456"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label
            htmlFor="organization-bank"
            className="text-sm font-medium"
          >
            {t("registration.bankAccount")}
          </label>
          <Input
            id="organization-bank"
            className="h-12"
            value={bankAccount}
            onChange={(event) => setBankAccount(event.target.value)}
            placeholder="2900123456/2010"
            aria-invalid={isSubmitted && !isValidBank}
          />
          {isSubmitted && !isValidBank ? (
            <p className="text-sm text-destructive">{t("registration.bankInvalid")}</p>
          ) : null}
        </div>
        {failure ? (
          <Alert variant="destructive">
            <AlertDescription>{failure}</AlertDescription>
          </Alert>
        ) : null}
        <Button
          type="submit"
          size="lg"
          disabled={isPending}
          className="h-12 w-full"
        >
          {t("registration.saveProfile")}
        </Button>
      </form>
    </RegistrationLayout>
  )
}

function OrganizationReady({ profile }: { profile: OrganizationProfile }) {
  const { t } = useTranslation("auth")
  return (
    <RegistrationLayout>
      <Seo title={t("registration.readyTitle")} />
      <h1 className="text-2xl font-bold tracking-tight">{t("registration.readyTitle")}</h1>
      <h2 className="text-2xl font-bold tracking-tight">{profile.name}</h2>
      <p>{t("registration.readyDescription")}</p>
      <Button
        asChild
        size="lg"
        className="h-12 w-full"
      >
        <Link to={ROUTES.organizer.newEvent}>{t("registration.createFirstEvent")}</Link>
      </Button>
    </RegistrationLayout>
  )
}
