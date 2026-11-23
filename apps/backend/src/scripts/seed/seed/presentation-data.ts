import { PrismaService } from "@/core/prisma/prisma.service"
import { Gender } from "@/generated/prisma/client"
import { date, type CreateEventParams, type SeedApplicant, type SeedRoom } from "./seed-database"

// Data for presenting the app: one public event with named people, each standing for a feature
// (automatic evaluation, waitlist, payments, room wishes, cancellation date). Added on top of the
// base seed; more cases are added to it step by step.
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
  for (const token of ["jarni-prazdniny-2028"]) {
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
