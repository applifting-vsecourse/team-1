import { PrismaService } from "@/core/prisma/prisma.service"
import { Gender, Term } from "@/generated/prisma/client"
import { computeFreePlaces, computeTermCapacity } from "@/modules/applications/domain/capacity"
import { evaluateApplication } from "@/modules/applications/domain/evaluation"
import { computeAmountDue } from "@/modules/applications/domain/pricing"
import { BetterAuth } from "@/shared/auth/providers/better-auth.provider"
import { Config } from "@/shared/config/config.service"
import { emptyGenderCounts, GenderCounts } from "@/shared/domain/gender"
import { generateToken } from "@/shared/utils/token"
import { createUser } from "./create-user"

type SeedRoom = { name: string; capacity: number; gender: Gender }
type SeedTerm = {
  name: string
  startsOn: string
  endsOn: string
  priceCzk: number
}
type SeedApplicant = {
  firstName: string
  lastName: string
  birthDate: string
  gender: Gender
  email: string
  /** Indexes into the event's terms. */
  termIndexes: number[]
  userId?: string
}

const date = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`)

const rooms = (gender: Gender, ...entries: [name: string, capacity: number][]): SeedRoom[] =>
  entries.map(([name, capacity]) => ({ name, capacity, gender }))

export const seedDatabase = async (
  prisma: PrismaService,
  config: Config,
  betterAuth: BetterAuth,
): Promise<void> => {
  // `pnpm dev` and every staging start run the seed, so never clobber a
  // database that already has data. Organizations only come from the seed in
  // sprint 1, so "has an organization" means "already seeded" — stray users
  // (e.g. from the old starter on staging) don't block the first seed.
  const existingOrganizations = await prisma.organization.count()
  if (existingOrganizations > 0) {
    console.log(
      `Database already has ${existingOrganizations} organization(s) — skipping seed. ` +
        "Run `pnpm backend db:reset` to wipe and start over.",
    )
    return
  }

  // Drop existing database data from all tables
  try {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "organization", "session", "account", "verification", "user" RESTART IDENTITY CASCADE;',
    )
  } catch (error) {
    console.error("Error truncating tables:", error)
  }

  console.log("Creating accounts")

  // Create a superadmin user. This should be delete in prod app.
  // Optional: staging may not define SUPERADMIN_* (its env is managed by the course).
  if (config.superadminEmail && config.superadminPassword) {
    await createUser(betterAuth, {
      email: config.superadminEmail,
      password: config.superadminPassword,
      name: "Admin (Delete in Prod)",
      accountType: "ADMIN",
    })
  }

  const organizerA = await createUser(betterAuth, {
    email: "organizator@example.com",
    password: "password1",
    name: "Olga Organizátorová",
    accountType: "ORGANIZER",
  })
  const organizerB = await createUser(betterAuth, {
    email: "organizator2@example.com",
    password: "password2",
    name: "Ondřej Horský",
    accountType: "ORGANIZER",
  })
  // Acts for both organizations — events are grouped by organizer (O02, US-10).
  const organizerBoth = await createUser(betterAuth, {
    email: "organizator3@example.com",
    password: "password3",
    name: "Oskar Obojí",
    accountType: "ORGANIZER",
  })
  const participant = await createUser(betterAuth, {
    email: "ucastnik@example.com",
    password: "password4",
    name: "Jana Nováková",
    accountType: "PARTICIPANT",
  })

  console.log("Creating organizations and events")

  const summerCamp = await prisma.organization.create({
    data: { name: "Letní kemp z. s.", bankAccount: "2900123456/2010" },
  })
  const mountainClub = await prisma.organization.create({
    data: { name: "Horský spolek Sněžka", bankAccount: "123456789/0100" },
  })
  await prisma.organizationMember.createMany({
    data: [
      { organizationId: summerCamp.id, userId: organizerA.id },
      { organizationId: mountainClub.id, userId: organizerB.id },
      { organizationId: summerCamp.id, userId: organizerBoth.id },
      { organizationId: mountainClub.id, userId: organizerBoth.id },
    ],
  })

  await createEvent(prisma, {
    organizationId: summerCamp.id,
    recordedById: organizerA.id,
    name: "Letní kemp 2027",
    description: "Dva týdny her, výletů a táboráků pro 15–26 let.",
    location: "Tábořiště Pod Lesem, Sázava",
    // Fixed so the demo link stays the same after `db:reset`. Real events get
    // a random token (generateToken).
    publicToken: "demo-letni-kemp-2027",
    terms: [
      {
        name: "1. týden",
        startsOn: "2027-07-04",
        endsOn: "2027-07-10",
        priceCzk: 4500,
      },
      {
        name: "2. týden",
        startsOn: "2027-07-11",
        endsOn: "2027-07-17",
        priceCzk: 4900,
      },
    ],
    rooms: [
      ...rooms("FEMALE", ["1", 5], ["2", 5], ["3", 4]),
      ...rooms("MALE", ["11", 5], ["12", 5]),
    ],
    applicants: [
      {
        firstName: "Jana",
        lastName: "Nováková",
        birthDate: "2005-03-14",
        gender: "FEMALE",
        email: "ucastnik@example.com",
        termIndexes: [0, 1],
        userId: participant.id,
      },
      {
        firstName: "Tomáš",
        lastName: "Dvořák",
        birthDate: "2004-11-02",
        gender: "MALE",
        email: "tomas.dvorak@example.com",
        termIndexes: [0],
      },
      {
        firstName: "Eliška",
        lastName: "Svobodová",
        birthDate: "2007-06-21",
        gender: "FEMALE",
        email: "eliska.svobodova@example.com",
        termIndexes: [1],
      },
      {
        firstName: "Matěj",
        lastName: "Černý",
        birthDate: "2006-01-30",
        gender: "MALE",
        email: "matej.cerny@example.com",
        termIndexes: [0, 1],
      },
      {
        firstName: "Klára",
        lastName: "Procházková",
        birthDate: "2003-09-09",
        gender: "FEMALE",
        email: "klara.prochazkova@example.com",
        termIndexes: [0],
      },
    ],
    // Payments by applicant index: full, partial, none…
    payments: { 0: "full", 1: 2000 },
  })

  await createEvent(prisma, {
    organizationId: mountainClub.id,
    recordedById: organizerB.id,
    name: "Horský víkend 2027",
    description: "Prodloužený víkend na horách.",
    location: "Chata Sněžka, Pec pod Sněžkou",
    publicToken: "demo-horsky-vikend-2027",
    terms: [
      {
        name: "Září",
        startsOn: "2027-09-24",
        endsOn: "2027-09-26",
        priceCzk: 1800,
      },
      {
        name: "Říjen",
        startsOn: "2027-10-01",
        endsOn: "2027-10-03",
        priceCzk: 1800,
      },
    ],
    // Deliberately tiny: the third woman becomes a waitlisted applicant.
    rooms: [...rooms("FEMALE", ["A", 2]), ...rooms("MALE", ["B", 2])],
    applicants: [
      {
        firstName: "Petra",
        lastName: "Malá",
        birthDate: "1998-04-04",
        gender: "FEMALE",
        email: "petra.mala@example.com",
        termIndexes: [0],
      },
      {
        firstName: "Lucie",
        lastName: "Veselá",
        birthDate: "1999-12-12",
        gender: "FEMALE",
        email: "lucie.vesela@example.com",
        termIndexes: [0, 1],
      },
      {
        firstName: "Hana",
        lastName: "Králová",
        birthDate: "2001-08-18",
        gender: "FEMALE",
        email: "hana.kralova@example.com",
        termIndexes: [0],
      },
      {
        firstName: "Jakub",
        lastName: "Novotný",
        birthDate: "2000-02-29",
        gender: "MALE",
        email: "jakub.novotny@example.com",
        termIndexes: [1],
      },
      // Second application under the participant account (US-54): the only
      // free women's beds are taken, so she is waitlisted in every term.
      {
        firstName: "Jana",
        lastName: "Nováková",
        birthDate: "2005-03-14",
        gender: "FEMALE",
        email: "ucastnik@example.com",
        termIndexes: [0],
        userId: participant.id,
      },
    ],
    payments: { 0: "full" },
  })

  // Third event for the participant account (US-54): confirmed, but only part
  // of it paid — something is still left to pay.
  await createEvent(prisma, {
    organizationId: mountainClub.id,
    recordedById: organizerB.id,
    name: "Podzimní soustředění 2027",
    description: "Víkendové soustředění na horské chatě.",
    location: "Chata Sněžka, Pec pod Sněžkou",
    publicToken: "demo-podzimni-soustredeni-2027",
    terms: [{ name: "Listopad", startsOn: "2027-11-05", endsOn: "2027-11-07", priceCzk: 2400 }],
    rooms: [...rooms("FEMALE", ["A", 4]), ...rooms("MALE", ["B", 4])],
    applicants: [
      {
        firstName: "Petr",
        lastName: "Novák",
        birthDate: "2008-08-08",
        gender: "MALE",
        email: "ucastnik@example.com",
        termIndexes: [0],
        userId: participant.id,
      },
    ],
    payments: { 0: 1000 },
  })
}

type CreateEventParams = {
  organizationId: string
  recordedById: string
  name: string
  description: string
  location: string
  publicToken: string
  terms: SeedTerm[]
  rooms: SeedRoom[]
  applicants: SeedApplicant[]
  payments: Record<number, "full" | number>
}

async function createEvent(prisma: PrismaService, params: CreateEventParams): Promise<void> {
  const { organizationId } = params

  const event = await prisma.event.create({
    data: {
      organizationId,
      name: params.name,
      description: params.description,
      location: params.location,
      publicToken: params.publicToken,
    },
  })

  const terms: Term[] = []
  for (const term of params.terms) {
    terms.push(
      await prisma.term.create({
        data: {
          organizationId,
          eventId: event.id,
          name: term.name,
          startsOn: date(term.startsOn),
          endsOn: date(term.endsOn),
          priceCzk: term.priceCzk,
        },
      }),
    )
  }

  await prisma.room.createMany({
    data: params.rooms.map((room) => ({
      ...room,
      organizationId,
      eventId: event.id,
    })),
  })

  // Evaluate the sample applications with the real domain rules, in arrival
  // order, so the seeded statuses are exactly what the app would produce.
  const capacity = computeTermCapacity(params.rooms)
  const confirmed = new Map<string, GenderCounts>(
    terms.map((term) => [term.id, emptyGenderCounts()]),
  )
  const firstArrival = Date.now() - params.applicants.length * 60_000

  for (const [index, applicant] of params.applicants.entries()) {
    const selected = applicant.termIndexes.map((termIndex) => terms[termIndex])
    const evaluated = evaluateApplication(
      applicant.gender,
      selected.map((term) => ({
        termId: term.id,
        priceCzk: term.priceCzk,
        freePlaces: computeFreePlaces(capacity, confirmed.get(term.id)!),
      })),
    )
    for (const term of evaluated) {
      if (term.status === "CONFIRMED") confirmed.get(term.termId)![applicant.gender] += 1
    }

    const submittedAt = new Date(firstArrival + index * 60_000)
    const application = await prisma.application.create({
      data: {
        organizationId,
        eventId: event.id,
        userId: applicant.userId,
        accessToken: generateToken(),
        firstName: applicant.firstName,
        lastName: applicant.lastName,
        birthDate: date(applicant.birthDate),
        gender: applicant.gender,
        email: applicant.email,
        consentAt: submittedAt,
        locale: "cs",
        submittedAt,
        terms: {
          create: evaluated.map((term) => ({
            organizationId,
            termId: term.termId,
            status: term.status,
            priceCzk: term.priceCzk,
            evaluatedAt: submittedAt,
          })),
        },
      },
    })

    const payment = params.payments[index]
    if (payment !== undefined) {
      const amountDue = computeAmountDue(evaluated)
      await prisma.payment.create({
        data: {
          organizationId,
          applicationId: application.id,
          amountCzk: payment === "full" ? amountDue : payment,
          recordedById: params.recordedById,
        },
      })
    }
  }
}
