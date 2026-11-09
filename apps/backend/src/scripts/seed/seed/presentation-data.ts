import { PrismaService } from "@/core/prisma/prisma.service"
import { Gender } from "@/generated/prisma/client"
import { date, type CreateEventParams, type SeedApplicant, type SeedRoom } from "./seed-database"

// Tidy data for presenting the app (sprint 3 demo): two public events with believable people,
// one in the manual evaluation mode with a full queue, one automatic with a waitlist, payments and
// a cancellation date. Added on top of the base seed and the sprint demo, never instead of them.
// Skipped when NODE_ENV is "test" (E2E and integration tests), so the tests keep their exact data.

/** Mailbox that receives the e-mails of the demo. */
const DEMO_PARTICIPANT_EMAIL = "togena.team1@gmail.com"

type CreateEvent = (prisma: PrismaService, params: CreateEventParams) => Promise<void>

type Person = [firstName: string, lastName: string, gender: Gender, birthDate: string]

const fold = (text: string): string => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

const rooms = (gender: Gender, names: string[], capacity: number): SeedRoom[] =>
  names.map((name) => ({ name, capacity, gender }))

const toApplicant = (
  [firstName, lastName, gender, birthDate]: Person,
  termIndexes: number[],
  email = `${fold(firstName)}.${fold(lastName)}@example.com`,
): SeedApplicant => ({ firstName, lastName, gender, birthDate, email, termIndexes })

// Event 1: manual evaluation, everyone waits in the queue "To evaluate".
const AUTUMN_PEOPLE: [Person, number[]][] = [
  [["Eliška", "Svobodová", "FEMALE", "2013-03-14"], [0]],
  [["Matěj", "Dvořák", "MALE", "2012-09-02"], [0]],
  [
    ["Tereza", "Novotná", "FEMALE", "2014-01-21"],
    [0, 1],
  ],
  [
    ["Jakub", "Černý", "MALE", "2013-06-30"],
    [0, 1],
  ],
  [["Anna", "Procházková", "FEMALE", "2012-11-11"], [0]],
  [["Filip", "Kučera", "MALE", "2014-04-05"], [1]],
  [
    ["Klára", "Veselá", "FEMALE", "2013-08-19"],
    [0, 1],
  ],
  [["Ondřej", "Horák", "MALE", "2012-12-08"], [0]],
  [["Lucie", "Němcová", "FEMALE", "2014-07-27"], [1]],
  [
    ["Vojtěch", "Marek", "MALE", "2013-02-16"],
    [0, 1],
  ],
  [["Barbora", "Pospíšilová", "FEMALE", "2012-05-23"], [0]],
  [["Tomáš", "Král", "MALE", "2014-10-03"], [0]],
  [
    ["Adéla", "Jelínková", "FEMALE", "2013-12-29"],
    [0, 1],
  ],
  [["David", "Růžička", "MALE", "2012-04-17"], [1]],
  [["Natálie", "Benešová", "FEMALE", "2014-02-09"], [0]],
  [
    ["Šimon", "Fiala", "MALE", "2013-09-25"],
    [0, 1],
  ],
  [["Kristýna", "Sedláčková", "FEMALE", "2012-07-13"], [0]],
  [["Daniel", "Doležal", "MALE", "2014-05-31"], [0]],
]

// Event 2: automatic evaluation, beds run out so a waitlist forms.
const SPRING_PEOPLE: [Person, number[]][] = [
  [["Zuzana", "Kovářová", "FEMALE", "2011-01-12"], [1]],
  [
    ["Petr", "Urban", "MALE", "2010-08-04"],
    [0, 1],
  ],
  [["Hana", "Blažková", "FEMALE", "2011-10-26"], [1]],
  [
    ["Martin", "Pavlík", "MALE", "2010-03-18"],
    [0, 1],
  ],
  [["Monika", "Šimková", "FEMALE", "2011-06-07"], [1]],
  [
    ["Jana", "Nováková", "FEMALE", "2011-04-15"],
    [0, 1],
  ], // the demo participant, set below
  [
    ["Lukáš", "Havlík", "MALE", "2010-12-01"],
    [0, 1],
  ],
  [["Veronika", "Kratochvílová", "FEMALE", "2011-09-09"], [1]],
  [["Michal", "Zeman", "MALE", "2010-05-22"], [0]],
  [["Karolína", "Vaňková", "FEMALE", "2011-02-28"], [1]],
]

export async function seedPresentationData(
  prisma: PrismaService,
  context: {
    organizationId: string
    recordedById: string
    participantId: string
    createEvent: CreateEvent
  },
): Promise<void> {
  if (process.env.NODE_ENV === "test") return

  const { organizationId, recordedById, participantId, createEvent } = context
  const common = { organizationId, recordedById }
  console.log("Creating presentation events")

  // --- Podzimní tábor: the manual queue -------------------------------------------------------
  const autumnApplicants = AUTUMN_PEOPLE.map(([person, terms]) => toApplicant(person, terms))
  // Two siblings in one submission under one e-mail.
  autumnApplicants[6].email = autumnApplicants[7].email = "rodina.horakova@example.com"
  autumnApplicants[7].groupWithPrevious = true

  await createEvent(prisma, {
    ...common,
    name: "Podzimní tábor 2028",
    description:
      "Týden plný her, sportu a večerních programů u rybníka. Přihlášky vyhodnocuje organizátor ručně.",
    location: "Rekreační středisko Rybník, Sázava",
    publicToken: "podzimni-tabor-2028",
    evaluationMode: "MANUAL",
    publicPage: {
      contactEmail: "tabor@example.com",
      contactPhone: "+420 777 000 101",
      photoFileName: "podzimni-tabor-2028.jpg",
      photo: "campfire",
    },
    terms: [
      { name: "Hlavní turnus", startsOn: "2028-10-02", endsOn: "2028-10-08", priceCzk: 4200 },
      { name: null, startsOn: "2028-10-09", endsOn: "2028-10-13", priceCzk: 3400 },
    ],
    rooms: [
      ...rooms("FEMALE", ["Dívky 1", "Dívky 2", "Dívky 3"], 4),
      ...rooms("MALE", ["Kluci 1", "Kluci 2", "Kluci 3"], 4),
    ],
    applicants: autumnApplicants,
    payments: {},
    arrival: { first: new Date("2026-10-20T18:00:00+02:00"), intervalMs: 5 * 60 * 60_000 },
  })

  // --- Jarní prázdniny: automatic evaluation, waitlist, payments, cancellation ----------------
  const springApplicants = SPRING_PEOPLE.map(([person, terms]) => toApplicant(person, terms))
  springApplicants[5].userId = participantId

  await createEvent(prisma, {
    ...common,
    name: "Jarní prázdniny 2028",
    description:
      "Dva jarní týdny na horách: lyže, sáňkování a večerní hry. Kapacita je malá, hlásí se rychle.",
    location: "Horská chata Sněžka, Špindlerův Mlýn",
    publicToken: "jarni-prazdniny-2028",
    publicPage: {
      contactEmail: "prazdniny@example.com",
      contactPhone: "+420 777 000 102",
      photoFileName: "jarni-prazdniny-2028.jpg",
      photo: "mountains",
    },
    terms: [
      { name: "1. týden", startsOn: "2028-02-12", endsOn: "2028-02-18", priceCzk: 4800 },
      { name: "2. týden", startsOn: "2028-02-19", endsOn: "2028-02-25", priceCzk: 4800 },
    ],
    rooms: [
      ...rooms("FEMALE", ["Smrk"], 2),
      ...rooms("FEMALE", ["Borovice"], 1),
      ...rooms("MALE", ["Jedle"], 2),
      ...rooms("MALE", ["Modřín"], 1),
    ],
    applicants: springApplicants,
    // Everyone confirmed in the first week paid; two paid only half; Jana paid the confirmed week.
    payments: { 0: "full", 1: "full", 2: "full", 3: "half", 5: "full", 6: "half" },
    arrival: { first: new Date("2026-10-25T19:00:00+02:00"), intervalMs: 7 * 60 * 60_000 },
  })

  // Extras around the two events that createEvent does not cover: meals, allergies, transport and
  // the date from which the cancellation conditions run.
  for (const token of ["podzimni-tabor-2028", "jarni-prazdniny-2028"]) {
    const event = await prisma.event.findUniqueOrThrow({
      where: { publicToken: token },
      include: {
        terms: { orderBy: { number: "asc" } },
        applications: { orderBy: { number: "asc" } },
      },
    })

    const vegetarian = await prisma.mealOption.create({
      data: { organizationId, eventId: event.id, name: "Vegetariánská", position: 0 },
    })
    const glutenFree = await prisma.mealOption.create({
      data: { organizationId, eventId: event.id, name: "Bezlepková", position: 1 },
    })
    for (const [index, application] of event.applications.entries()) {
      if (index % 4 === 1) {
        await prisma.application.update({
          where: { id: application.id },
          data: { mealOptions: { connect: { id: vegetarian.id } } },
        })
      } else if (index % 6 === 3) {
        await prisma.application.update({
          where: { id: application.id },
          data: {
            mealOptions: { connect: { id: glutenFree.id } },
            allergies: "Alergie na ořechy",
          },
        })
      }
    }

    for (const term of event.terms) {
      await prisma.transport.create({
        data: {
          organizationId,
          termId: term.id,
          kind: "SCHEDULED",
          name: "Autobus z Prahy",
          departurePlace: "Praha, Florenc, stanoviště 12",
          departureAt: new Date(`${term.startsOn.toISOString().slice(0, 10)}T08:00:00+01:00`),
          instructions: "Příjezd nejpozději 15 minut před odjezdem.",
        },
      })
    }
  }

  await prisma.event.update({
    where: { publicToken: "jarni-prazdniny-2028" },
    data: {
      cancellationStartsOn: date("2028-01-15"),
      cancellationTerms: "Do 15. 1. 2028 storno zdarma, poté 50 % ceny termínu.",
    },
  })

  // The demo participant gets a real mailbox, so the e-mails of the demo (confirmation, payment,
  // changes) arrive somewhere a person can open them. Everything stays under the one account:
  // its applications, notifications and password (see CONTRIBUTING.md).
  await prisma.user.update({
    where: { id: participantId },
    data: { email: DEMO_PARTICIPANT_EMAIL },
  })
  await prisma.application.updateMany({
    where: { userId: participantId },
    data: { email: DEMO_PARTICIPANT_EMAIL },
  })
}
