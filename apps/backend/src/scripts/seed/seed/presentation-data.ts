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

// Event 2: automatic evaluation, the showcase of the room proposal (US-147). Eleven beds
// (girls 3 + 3, boys 3 + 2), twelve applications in the first week, so the proposal has to solve:
// mutual trios, a wish for the other gender, a wish for a name nobody has, a wish for a waitlisted
// woman, a man who asks for an individual room, and one woman who waits for a bed. The names say
// which case a person stands for.
const SPRING_PEOPLE: [Person, number[], string[]?][] = [
  [
    ["Dáša", "Dlužná", "FEMALE", "2011-03-02"],
    [0, 1],
  ], // owes both weeks
  [["Věra", "Věrná", "FEMALE", "2011-05-17"], [0], ["Soňa Spolehlivá", "Hanka Hodná"]],
  [["Soňa", "Spolehlivá", "FEMALE", "2011-08-23"], [0], ["Věra Věrná"]],
  [["Hanka", "Hodná", "FEMALE", "2010-12-09"], [0], ["Věra Věrná", "Soňa Spolehlivá"]],
  [["Julie", "Juliánová", "FEMALE", "2011-02-14"], [0], ["Romeo Romantický"]], // other gender
  [
    ["Kamila", "Kamarádská", "FEMALE", "2010-10-30"],
    [0],
    ["Dáša Dlužná", "Brad Pitt", "Běla Bohužel"], // a friend, nobody, a waitlisted woman
  ],
  [
    ["Karel", "Kamarádský", "MALE", "2010-07-07"],
    [0, 1],
    ["Tonda Tichý", "Lojza Loajální"],
  ], // the demo participant, set below
  [["Tonda", "Tichý", "MALE", "2011-01-19"], [0, 1], ["Karel Kamarádský"]],
  [["Lojza", "Loajální", "MALE", "2010-09-25"], [0], ["Karel Kamarádský", "Tonda Tichý"]],
  [["Romeo", "Romantický", "MALE", "2011-04-04"], [0], ["Julie Juliánová"]],
  [["Ivo", "Individuál", "MALE", "2010-06-12"], [0]], // asks for an individual room, below
  [["Běla", "Bohužel", "FEMALE", "2011-11-11"], [0]], // the seventh woman for six beds: waits
]
const SPRING_DEMO_PARTICIPANT_INDEX = 6

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
  const springApplicants = SPRING_PEOPLE.map(([person, terms, roomWishes]) => ({
    ...toApplicant(person, terms),
    ...(roomWishes && { roomWishes }),
  }))
  springApplicants[SPRING_DEMO_PARTICIPANT_INDEX].userId = participantId
  springApplicants[10].individualAccommodation = {
    note: "Chrápu jako traktor, prosím o pokoj jen pro sebe.",
  }

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
      ...rooms("FEMALE", ["Smrk", "Borovice"], 3),
      ...rooms("MALE", ["Jedle"], 3),
      ...rooms("MALE", ["Modřín"], 2),
    ],
    applicants: springApplicants,
    // Dáša Dlužná pays nothing, two people paid half, the others the whole first week.
    payments: { 1: "full", 2: "half", 3: "full", 6: "full", 7: "half", 9: "full" },
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
    data: { email: DEMO_PARTICIPANT_EMAIL, name: "Karel Kamarádský" },
  })
  await prisma.application.updateMany({
    where: { userId: participantId },
    data: { email: DEMO_PARTICIPANT_EMAIL },
  })
}
