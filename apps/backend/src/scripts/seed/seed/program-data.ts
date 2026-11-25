import { PrismaService } from "@/core/prisma/prisma.service"
import { date, type CreateEventParams } from "./seed-database"

// Demo of the program calendar (US-66): an event with two terms, the second one day shorter. The
// first term has a complete program of every day, the second one has none yet. Blocks never
// overlap (touching ends are fine). Skipped when NODE_ENV is "test", like the other demo data.

type CreateEvent = (prisma: PrismaService, params: CreateEventParams) => Promise<void>

type Block = { start: string; end: string; name: string; place?: string; description?: string }

const FIRST_DAY = "2028-07-08"
const LAST_DAY = "2028-07-15"

const addDays = (isoDay: string, days: number): string => {
  const day = new Date(`${isoDay}T00:00:00.000Z`)
  day.setUTCDate(day.getUTCDate() + days)
  return day.toISOString().slice(0, 10)
}

/** Morning, afternoon and evening highlight of each full day (days 2–7). */
const HIGHLIGHTS: { morning: Block; afternoon: Block; evening: Block }[] = [
  {
    morning: {
      start: "09:30",
      end: "12:00",
      name: "Stavba pevnosti",
      place: "Louka za hlavní chatou",
      description: "Týmy staví pevnost z klestí a plachet. Kdo ji udrží do večera, vyhrává.",
    },
    afternoon: {
      start: "14:30",
      end: "17:30",
      name: "Velká bitva o vlajku",
      place: "Les nad táborem",
    },
    evening: { start: "19:30", end: "21:30", name: "Táborák a písničky", place: "Ohniště" },
  },
  {
    morning: { start: "09:30", end: "12:00", name: "Orientační běh", place: "Les a okolí" },
    afternoon: {
      start: "14:30",
      end: "17:30",
      name: "Koupání a vodní hry",
      place: "Rybník",
      description: "S sebou plavky a ručník. Plave se jen za dozoru vedoucích.",
    },
    evening: { start: "19:30", end: "21:30", name: "Noční hra se světluškami", place: "Les" },
  },
  {
    morning: { start: "09:30", end: "12:00", name: "Řemeslné dílny", place: "Jídelna" },
    afternoon: {
      start: "14:30",
      end: "18:00",
      name: "Celodenní výlet: rozhledna",
      place: "Rozhledna Šibeniční vrch",
      description: "Pěšky tam a zpět, svačinový balíček dostanete v kuchyni.",
    },
    evening: { start: "19:30", end: "21:30", name: "Promítání pod hvězdami", place: "Louka" },
  },
  {
    morning: { start: "09:30", end: "12:00", name: "Sportovní olympiáda", place: "Hřiště" },
    afternoon: { start: "14:30", end: "17:30", name: "Limonádová štafeta", place: "Hřiště" },
    evening: { start: "19:30", end: "21:30", name: "Talentová show", place: "Velký sál" },
  },
  {
    morning: {
      start: "09:30",
      end: "12:00",
      name: "První pomoc hrou",
      place: "Jídelna",
      description: "Obvazy, záchranná služba a trocha divadla.",
    },
    afternoon: { start: "14:30", end: "17:30", name: "Stezka odvahy: příprava", place: "Les" },
    evening: { start: "19:30", end: "21:30", name: "Stezka odvahy", place: "Les" },
  },
  {
    morning: { start: "09:30", end: "12:00", name: "Cesta kolem světa", place: "Tábor" },
    afternoon: { start: "14:30", end: "17:30", name: "Vodní bitva", place: "Rybník" },
    evening: { start: "19:30", end: "21:30", name: "Diskotéka", place: "Velký sál" },
  },
]

const dailyFrame = (): Block[] => [
  { start: "08:00", end: "08:30", name: "Budíček a rozcvička", place: "Hřiště" },
  { start: "08:30", end: "09:15", name: "Snídaně", place: "Jídelna" },
  { start: "12:15", end: "13:00", name: "Oběd", place: "Jídelna" },
  { start: "13:00", end: "14:30", name: "Polední klid", place: "Chatky" },
  { start: "18:00", end: "18:45", name: "Večeře", place: "Jídelna" },
  { start: "22:00", end: "22:15", name: "Večerka", place: "Chatky" },
]

function programOfFirstTerm(): { day: string; block: Block }[] {
  const result: { day: string; block: Block }[] = []
  const add = (day: string, blocks: Block[]) =>
    blocks.forEach((block) => result.push({ day, block }))

  // Arrival day.
  add(FIRST_DAY, [
    { start: "14:00", end: "16:00", name: "Příjezd a ubytování", place: "Hlavní chata" },
    { start: "16:30", end: "17:30", name: "Seznamovací hry", place: "Louka" },
    { start: "18:00", end: "18:45", name: "Večeře", place: "Jídelna" },
    {
      start: "19:30",
      end: "21:30",
      name: "Zahajovací táborák",
      place: "Ohniště",
      description: "Představení vedoucích, pravidla tábora a první písničky.",
    },
    { start: "22:00", end: "22:15", name: "Večerka", place: "Chatky" },
  ])

  // Full days.
  HIGHLIGHTS.forEach((highlight, index) => {
    add(addDays(FIRST_DAY, index + 1), [
      ...dailyFrame(),
      highlight.morning,
      highlight.afternoon,
      highlight.evening,
    ])
  })

  // Departure day.
  add(LAST_DAY, [
    { start: "08:00", end: "08:30", name: "Budíček", place: "Chatky" },
    { start: "08:30", end: "09:15", name: "Snídaně", place: "Jídelna" },
    { start: "09:30", end: "11:00", name: "Balení a úklid chatek", place: "Chatky" },
    { start: "11:00", end: "12:00", name: "Slavnostní zakončení a vyhlášení", place: "Velký sál" },
    { start: "12:15", end: "13:00", name: "Oběd", place: "Jídelna" },
    { start: "13:30", end: "14:00", name: "Odjezd rodičů a účastníků", place: "Parkoviště" },
  ])
  return result
}

export async function seedProgramEvent(
  prisma: PrismaService,
  context: { organizationId: string; recordedById: string; createEvent: CreateEvent },
): Promise<void> {
  if (process.env.NODE_ENV === "test") return

  const { organizationId, recordedById, createEvent } = context
  console.log("Creating program demo event")

  await createEvent(prisma, {
    organizationId,
    recordedById,
    name: "Dobrodružný tábor 2028",
    description: "Týdenní dobrodružství v lese: pevnosti, noční hry, rybník a táboráky.",
    location: "Tábořiště U Rybníka, Sázava",
    publicToken: "dobrodruzny-tabor-2028",
    contact: { email: "tabor@example.com", phone: "+420 777 000 103" },
    terms: [
      { name: "Hlavní turnus", startsOn: FIRST_DAY, endsOn: LAST_DAY, priceCzk: 5200 },
      // One day shorter than the first term.
      {
        name: "Závěrečný turnus",
        startsOn: addDays(LAST_DAY, 1),
        endsOn: addDays(LAST_DAY, 7),
        priceCzk: 4600,
      },
    ],
    rooms: [
      { name: "Veverky", capacity: 6, gender: "FEMALE" },
      { name: "Vlci", capacity: 6, gender: "MALE" },
    ],
    applicants: [],
    payments: {},
  })

  const firstTerm = await prisma.term.findFirstOrThrow({
    where: { event: { publicToken: "dobrodruzny-tabor-2028" }, number: 1 },
  })
  await prisma.programBlock.createMany({
    data: programOfFirstTerm().map(({ day, block }) => ({
      organizationId,
      termId: firstTerm.id,
      date: date(day),
      startTime: block.start,
      endTime: block.end,
      name: block.name,
      place: block.place,
      description: block.description,
    })),
  })
}
