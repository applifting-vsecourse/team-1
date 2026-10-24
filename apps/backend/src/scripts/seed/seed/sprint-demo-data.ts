import { PrismaService } from "@/core/prisma/prisma.service"
import { Gender } from "@/generated/prisma/client"
import type { CreateEventParams, SeedApplicant, SeedPayment, SeedRoom } from "./seed-database"

// Data for the sprint 1 demo (issue #115). Added on top of the base seed; the statuses are not set
// here — createEvent evaluates the applicants in arrival order with the real domain functions.

type CreateEvent = (prisma: PrismaService, params: CreateEventParams) => Promise<void>

const FEMALE_FIRST_NAMES = [
  "Jana",
  "Eliška",
  "Tereza",
  "Klára",
  "Anna",
  "Lucie",
  "Kateřina",
  "Barbora",
  "Veronika",
  "Markéta",
  "Kristýna",
  "Adéla",
  "Natálie",
  "Nikola",
  "Michaela",
  "Petra",
  "Hana",
  "Lenka",
  "Zuzana",
  "Monika",
  "Denisa",
  "Karolína",
  "Sabina",
  "Magdaléna",
  "Alžběta",
]
const MALE_FIRST_NAMES = [
  "Jakub",
  "Jan",
  "Tomáš",
  "Matěj",
  "Ondřej",
  "Filip",
  "Adam",
  "David",
  "Vojtěch",
  "Martin",
  "Lukáš",
  "Daniel",
  "Michal",
  "Petr",
  "Štěpán",
  "Marek",
  "Samuel",
  "Dominik",
  "Patrik",
  "Šimon",
  "Radek",
  "Viktor",
  "Richard",
  "Ladislav",
  "Josef",
]
/** [masculine, feminine] */
const SURNAMES: [string, string][] = [
  ["Novák", "Nováková"],
  ["Svoboda", "Svobodová"],
  ["Dvořák", "Dvořáková"],
  ["Černý", "Černá"],
  ["Procházka", "Procházková"],
  ["Kučera", "Kučerová"],
  ["Veselý", "Veselá"],
  ["Horák", "Horáková"],
  ["Němec", "Němcová"],
  ["Marek", "Marková"],
  ["Pospíšil", "Pospíšilová"],
  ["Pokorný", "Pokorná"],
  ["Hájek", "Hájková"],
  ["Král", "Králová"],
  ["Jelínek", "Jelínková"],
  ["Růžička", "Růžičková"],
  ["Beneš", "Benešová"],
  ["Fiala", "Fialová"],
  ["Sedláček", "Sedláčková"],
  ["Doležal", "Doležalová"],
  ["Zeman", "Zemanová"],
  ["Kolář", "Kolářová"],
  ["Navrátil", "Navrátilová"],
  ["Čermák", "Čermáková"],
  ["Urban", "Urbanová"],
  ["Vaněk", "Vaňková"],
  ["Blažek", "Blažková"],
  ["Kříž", "Křížová"],
  ["Kopecký", "Kopecká"],
  ["Bartoš", "Bartošová"],
]

type TermChoice = "both" | "first" | "second"

const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()

/**
 * Which terms each person picks: `counts` of every kind, spread over the arrival order. The last
 * arrivals are set to `tail` (counts stay the same), so the end of the queue is a known case.
 */
function termChoices(
  counts: Record<TermChoice, number>,
  stride: number,
  tail: TermChoice[],
): TermChoice[] {
  const kinds: TermChoice[] = [
    ...Array<TermChoice>(counts.both).fill("both"),
    ...Array<TermChoice>(counts.first).fill("first"),
    ...Array<TermChoice>(counts.second).fill("second"),
  ]
  // `stride` is coprime with the length, so this visits every slot exactly once.
  const choices = kinds.map((_, index) => kinds[(index * stride) % kinds.length])
  const tailStart = choices.length - tail.length
  tail.forEach((kind, offset) => {
    const position = tailStart + offset
    if (choices[position] === kind) return
    const donor = choices.findIndex((choice, index) => index < tailStart && choice === kind)
    choices[donor] = choices[position]
    choices[position] = kind
  })
  return choices
}

function people(
  gender: Gender,
  counts: Record<TermChoice, number>,
  stride: number,
  tail: TermChoice[],
) {
  const firstNames = gender === "FEMALE" ? FEMALE_FIRST_NAMES : MALE_FIRST_NAMES
  const surnameForm = gender === "FEMALE" ? 1 : 0
  const choices = termChoices(counts, stride, tail)
  return choices.map((choice, index) => {
    const surname = SURNAMES[(index * 11 + Math.floor(index / firstNames.length)) % SURNAMES.length]
    return {
      gender,
      choice,
      firstName: firstNames[index % firstNames.length],
      lastName: surname[surnameForm],
      birthDate: `${2002 + ((index * 3) % 9)}-${String(1 + ((index * 5) % 12)).padStart(2, "0")}-${String(1 + ((index * 7) % 28)).padStart(2, "0")}`,
    }
  })
}

/** Women and men take turns, so the sibling pair below is always a girl and a boy. */
function interleave<T>(first: T[], second: T[]): T[] {
  const result: T[] = []
  for (let index = 0; index < Math.max(first.length, second.length); index++) {
    if (index < first.length) result.push(first[index])
    if (index < second.length) result.push(second[index])
  }
  return result
}

const TERM_INDEXES: Record<TermChoice, number[]> = { both: [0, 1], first: [0], second: [1] }

/** Full event of the brief: 52 women + 48 men in the first term fit 50 + 48 beds, two women wait. */
function fullEventApplicants(): {
  applicants: SeedApplicant[]
  payments: Record<number, SeedPayment>
} {
  // First term 52 women + 48 men; second term 53 women + 52 men → 3 women and 2 men wait there.
  // The last women in line: two wait in the first term but get a bed in the second; the last
  // three women of the second term wait. The last two men are confirmed in the first term and
  // wait in the second.
  const women = people("FEMALE", { both: 30, first: 22, second: 23 }, 7, [
    "both",
    "both",
    "second",
    "second",
    "second",
  ])
  const men = people("MALE", { both: 30, first: 18, second: 22 }, 3, ["both", "both"])
  const arrivals = interleave(women, men)

  const usedEmails = new Set<string>()
  const applicants: SeedApplicant[] = arrivals.map((person, index) => {
    let email = `${fold(person.firstName)}.${fold(person.lastName)}@example.com`
    if (usedEmails.has(email))
      email = `${fold(person.firstName)}.${fold(person.lastName)}${index}@example.com`
    usedEmails.add(email)
    return {
      firstName: person.firstName,
      lastName: person.lastName,
      birthDate: person.birthDate,
      gender: person.gender,
      email,
      termIndexes: TERM_INDEXES[person.choice],
    }
  })

  // One submission with two participants under one e-mail: a sister and a brother.
  const [sister, brother] = [applicants[20], applicants[21]]
  brother.lastName = "Veselý"
  sister.lastName = "Veselá"
  brother.email = sister.email = "rodina.vesela@example.com"
  brother.groupWithPrevious = true

  // Every fourth pays in full, every fourth half; one pays 500 CZK too much; the rest has not paid.
  const payments: Record<number, SeedPayment> = {}
  for (let index = 0; index < applicants.length; index++) {
    if (index % 4 === 0) payments[index] = "full"
    else if (index % 4 === 1) payments[index] = "half"
  }
  payments[22] = "over"
  return { applicants, payments }
}

const roomsOfFive = (gender: Gender, firstNumber: number): SeedRoom[] =>
  Array.from({ length: 10 }, (_, index) => ({
    name: String(firstNumber + index),
    capacity: 5,
    gender,
  }))

export async function seedSprintDemo(
  prisma: PrismaService,
  context: { organizationId: string; recordedById: string; createEvent: CreateEvent },
): Promise<void> {
  const { organizationId, recordedById, createEvent } = context
  const common = { organizationId, recordedById }

  console.log("Creating sprint demo events")

  const full = fullEventApplicants()
  await createEvent(prisma, {
    ...common,
    name: "Letní kemp 2027 – demo",
    description: "Plně obsazený kemp: dva týdny, 10 dámských a 10 pánských pokojů po 5 lůžkách.",
    location: "Tábořiště Pod Lesem, Sázava",
    publicToken: "demo-letni-kemp-plny",
    terms: [
      { name: "1. týden", startsOn: "2027-07-04", endsOn: "2027-07-10", priceCzk: 4500 },
      { name: "2. týden", startsOn: "2027-07-11", endsOn: "2027-07-17", priceCzk: 4900 },
    ],
    rooms: [...roomsOfFive("FEMALE", 1), ...roomsOfFive("MALE", 11)],
    ...full,
    // First application on 7 Feb 2027 at 20:00 Prague time, then one every 47 minutes.
    arrival: { first: new Date("2027-02-07T20:00:00+01:00"), intervalMs: 47 * 60_000 },
  })

  // Rooms without gender: one shared pool of 7 beds, the eighth applicant waits.
  const sharedPeople: [string, string, Gender][] = [
    ["Alena", "Bartáková", "FEMALE"],
    ["Pavel", "Holub", "MALE"],
    ["Ivana", "Kadlecová", "FEMALE"],
    ["Roman", "Šebesta", "MALE"],
    ["Eva", "Müllerová", "FEMALE"],
    ["Karel", "Vlček", "MALE"],
    ["Šárka", "Konečná", "FEMALE"],
    ["Zdeněk", "Brož", "MALE"],
  ]
  await createEvent(prisma, {
    ...common,
    name: "Rodinný víkend 2027",
    description: "Víkend ve společných pokojích bez dělení podle pohlaví.",
    location: "Chata U Lesa, Rokytnice",
    publicToken: "demo-rodinny-vikend-2027",
    roomMode: "SHARED",
    terms: [{ name: "Víkend", startsOn: "2027-10-15", endsOn: "2027-10-17", priceCzk: 2200 }],
    rooms: [
      { name: "A", capacity: 4, gender: null },
      { name: "B", capacity: 3, gender: null },
    ],
    applicants: sharedPeople.map(([firstName, lastName, gender], index) => ({
      firstName,
      lastName,
      gender,
      birthDate: `${1985 + index * 2}-0${1 + (index % 9)}-1${index}`,
      email: `${fold(firstName)}.${fold(lastName)}@example.com`,
      termIndexes: [0],
    })),
    payments: { 0: "full", 1: "half", 2: "full" },
    arrival: { first: new Date("2027-03-01T18:00:00+01:00"), intervalMs: 3 * 60 * 60_000 },
  })

  // Draft: a term with a price but no rooms, so the application link is not open yet.
  await createEvent(prisma, {
    ...common,
    name: "Zimní výjezd 2028",
    description: "Rozpracovaná akce — chybí pokoje.",
    location: "Penzion Sluneční, Špindlerův Mlýn",
    publicToken: "demo-zimni-vyjezd-2028",
    terms: [{ name: "Únor", startsOn: "2028-02-11", endsOn: "2028-02-13", priceCzk: 3200 }],
    rooms: [],
    applicants: [],
    payments: {},
  })
}
