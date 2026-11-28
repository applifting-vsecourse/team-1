// Fast seeding through the app API: events, terms, rooms, applications, payments, program.
// Everything is tagged with the run label (LABEL); existing data is never changed or deleted.
import { randomUUID } from "node:crypto"
import { req } from "./api.mjs"
import { cookieFor } from "./sessions.mjs"
import { ORGANIZER, PARTICIPANT } from "./env.mjs"

const pad = (n) => String(n).padStart(2, "0")
const now = new Date()
/** Unique run label, e.g. „BR 1122-1530“. */
export const STAMP = `${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
export const LABEL = `BR ${STAMP}`

export const iso = (d) => d.toISOString().slice(0, 10)
export const addDays = (d, n) => new Date(d.getTime() + n * 86400000)
export const today = () => iso(new Date())
/** Start of the first term: far enough in the future. */
export const BASE = addDays(new Date(), 120)

let sessions
let participantAccount = PARTICIPANT
// An older local seed lacks the documented account togena.team1@gmail.com but has ucastnik@example.com (password4).
const PARTICIPANT_FALLBACKS = [{ email: "ucastnik@example.com", password: "password4" }]
/** Participant e-mail used to create applications and to sign in. */
export const participantEmail = () => participantAccount.email

export async function sessionsOnce() {
  const organizer = await cookieFor(ORGANIZER)
  const candidates = process.env.BR_PARTICIPANT_EMAIL
    ? [PARTICIPANT]
    : [participantAccount, PARTICIPANT, ...PARTICIPANT_FALLBACKS]
  let lastError
  for (const account of candidates) {
    try {
      const participant = await cookieFor(account)
      participantAccount = account
      return { organizer, participant }
    } catch (e) {
      lastError = e
    }
  }
  throw lastError
}
export const participantCredentials = () => participantAccount

/**
 * Creates an event with terms and rooms.
 * terms: [{ name, price, offset, days, rooms:[{name,capacity,gender,individual,extraBeds}] }]
 * mode: "AUTOMATIC" | "MANUAL" | null (null = not chosen, the application link stays closed)
 */
export async function createEvent({ name, mode = "AUTOMATIC", cancellationStartsOn, terms }) {
  const { organizer } = await sessionsOnce()
  const ev = (
    await req("POST", "/organizer/events", {
      cookie: organizer,
      body: {
        name,
        description: "Týden plný her a výletů.",
        location: "Tábořiště Pod Lesem, Sázava",
      },
    })
  ).data
  const out = { id: ev.id, publicToken: ev.publicToken, name, terms: [] }
  for (const [i, t] of terms.entries()) {
    const start = addDays(BASE, t.offset ?? i * 14)
    const term = (
      await req("POST", `/organizer/events/${ev.id}/terms`, {
        cookie: organizer,
        body: {
          name: t.name,
          startsOn: iso(start),
          endsOn: iso(addDays(start, (t.days ?? 7) - 1)),
          priceCzk: t.price,
        },
      })
    ).data
    const entry = {
      id: term.id,
      name: t.name,
      price: t.price,
      startsOn: iso(start),
      days: t.days ?? 7,
      rooms: {},
    }
    out.terms.push(entry)
    if (t.roomMode === "SHARED") {
      await req("PATCH", `/organizer/events/${ev.id}/terms/${term.id}/room-mode`, {
        cookie: organizer,
        body: { roomMode: "SHARED" },
      })
    }
    // POST rooms returns 204 without a body; ids come from listing the term's rooms.
    await mapLimit(t.rooms ?? [], 6, async (r) => {
      const body = { name: r.name, capacity: r.capacity }
      if (r.gender) body.gender = r.gender
      if (r.individual) body.individual = true
      await req("POST", `/organizer/events/${ev.id}/terms/${term.id}/rooms`, {
        cookie: organizer,
        body,
      })
    })
    if ((t.rooms ?? []).length) {
      const listed = (
        await req("GET", `/organizer/events/${ev.id}/terms/${term.id}/rooms`, { cookie: organizer })
      ).data
      for (const room of listed.rooms) entry.rooms[room.name] = room.id
      for (const r of t.rooms.filter((x) => x.extraBeds)) {
        await req(
          "PATCH",
          `/organizer/events/${ev.id}/terms/${term.id}/rooms/${entry.rooms[r.name]}/extra-beds`,
          {
            cookie: organizer,
            body: { extraBeds: r.extraBeds },
          },
        )
      }
    }
  }
  if (mode) {
    await req("PATCH", `/organizer/events/${ev.id}/evaluation-mode`, {
      cookie: organizer,
      body: { evaluationMode: mode },
    })
  }
  if (cancellationStartsOn) {
    await req("PUT", `/organizer/events/${ev.id}/cancellation-start`, {
      cookie: organizer,
      body: { cancellationStartsOn },
    })
  }
  return out
}

/** Adds a term to an existing event (e.g. one without rooms while the application link is already open). */
export async function addTerm(ev, t) {
  const { organizer } = await sessionsOnce()
  const start = addDays(BASE, t.offset ?? ev.terms.length * 14)
  const term = (
    await req("POST", `/organizer/events/${ev.id}/terms`, {
      cookie: organizer,
      body: {
        name: t.name,
        startsOn: iso(start),
        endsOn: iso(addDays(start, (t.days ?? 7) - 1)),
        priceCzk: t.price,
      },
    })
  ).data
  const entry = {
    id: term.id,
    name: t.name,
    price: t.price,
    startsOn: iso(start),
    days: t.days ?? 7,
    rooms: {},
  }
  ev.terms.push(entry)
  return entry
}

export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++
        results[i] = await fn(items[i], i)
      }
    }),
  )
  return results
}

let counter = 0
/** Submits a public application. people: [{firstName,lastName,gender,termIds,birthDate?,individualAccommodation?,accommodationRequest?}] */
export async function apply(ev, email, people) {
  const participants = people.map((p) => {
    const o = {
      firstName: p.firstName,
      lastName: p.lastName,
      birthDate: p.birthDate ?? "2012-05-18",
      gender: p.gender,
      termIds: p.termIds,
    }
    if (p.individualAccommodation) o.individualAccommodation = true
    if (p.accommodationRequest) o.accommodationRequest = p.accommodationRequest
    return o
  })
  // Public submit is limited to 20/min and 100/h per IP; on 429 (rejected before processing, safe) wait and retry.
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await req("POST", `/public/events/${ev.publicToken}/applications`, {
        body: { email, consent: true, participants },
      })
      return res.data
    } catch (e) {
      if (e.status !== 429 || attempt >= 4) throw e
      console.log(
        `   limit veřejných přihlášek (429), čekám 20 s a zkouším znovu (${attempt + 1}/4)…`,
      )
      await new Promise((r) => setTimeout(r, 20000))
    }
  }
}

/** Filler application with a unique @example.com e-mail (never a real address). */
export const fillerEmail = () => `br-${STAMP}-${++counter}@example.com`
export const applyFiller = (ev, person) => apply(ev, fillerEmail(), [person])
/** Several fillers in one application (max 10 people): saves the public submit limit. Order of people is kept. */
export async function applyFillers(ev, people) {
  for (let i = 0; i < people.length; i += 10)
    await apply(ev, fillerEmail(), people.slice(i, i + 10))
}

export async function listApplications(evId, q) {
  const { organizer } = await sessionsOnce()
  const qs = q ? `?q=${encodeURIComponent(q)}` : ""
  return (await req("GET", `/organizer/events/${evId}/applications${qs}`, { cookie: organizer }))
    .data
}

/** Finds an application id by name (searches the organizer list). */
export async function findApp(ev, firstName, lastName) {
  const list = await listApplications(ev.id, lastName)
  const hit = list.find((a) => a.firstName === firstName && a.lastName === lastName)
  if (!hit) throw new Error(`Přihláška ${firstName} ${lastName} v akci ${ev.name} nenalezena`)
  return hit
}

export async function paymentDetail(applicationId) {
  const { organizer } = await sessionsOnce()
  return (
    await req("GET", `/organizer/applications/${applicationId}/payments`, { cookie: organizer })
  ).data
}

export async function recordPayment(applicationId, amountCzk, termId) {
  const { organizer } = await sessionsOnce()
  const body = { requestId: randomUUID(), amountCzk }
  if (termId) body.termId = termId
  return (
    await req("POST", `/organizer/applications/${applicationId}/payments`, {
      cookie: organizer,
      body,
    })
  ).data
}

export async function setTermStatus(applicationId, termId, status) {
  const { organizer } = await sessionsOnce()
  return (
    await req("PATCH", `/organizer/applications/${applicationId}/terms/${termId}/status`, {
      cookie: organizer,
      body: { status },
    })
  ).data
}

export async function assignRoom(
  ev,
  term,
  applicationTermId,
  roomId,
  { alsoTermIds, confirmExtraBed } = {},
) {
  const { organizer } = await sessionsOnce()
  const body = { roomId }
  if (alsoTermIds) body.alsoTermIds = alsoTermIds
  if (confirmExtraBed) body.confirmExtraBed = true
  return (
    await req(
      "PUT",
      `/organizer/events/${ev.id}/terms/${term.id}/room-assignments/${applicationTermId}`,
      { cookie: organizer, body },
    )
  ).data
}

/** applicationTermId of each participant in a term (from room assignments). */
export async function applicationTermIds(ev, term) {
  const { organizer } = await sessionsOnce()
  const res = (
    await req("GET", `/organizer/events/${ev.id}/terms/${term.id}/room-assignments`, {
      cookie: organizer,
    })
  ).data
  const all = [...(res.unassigned ?? []), ...(res.rooms ?? []).flatMap((r) => r.participants ?? [])]
  const map = new Map()
  for (const p of all) map.set(`${p.firstName} ${p.lastName}`, p.applicationTermId)
  return map
}

export async function addBlock(ev, term, block) {
  const { organizer } = await sessionsOnce()
  return (
    await req("POST", `/organizer/events/${ev.id}/program/terms/${term.id}/blocks`, {
      cookie: organizer,
      body: block,
    })
  ).data
}

export async function setMealOptions(ev, names) {
  const { organizer } = await sessionsOnce()
  return (
    await req("PUT", `/organizer/events/${ev.id}/meals/options`, {
      cookie: organizer,
      body: { options: names.map((name) => ({ name })) },
    })
  ).data
}

/** Term change request as the participant (after cancellation fees start). */
export async function requestChange(applicationId, termIds) {
  const { participant } = await sessionsOnce()
  return (
    await req("POST", `/participant/applications/${applicationId}/change-requests`, {
      cookie: participant,
      body: { termIds },
    })
  ).data
}
export async function decideRequest(ev, requestId, kind, reason) {
  const { organizer } = await sessionsOnce()
  return (
    await req("PATCH", `/organizer/events/${ev.id}/change-requests/${requestId}/${kind}`, {
      cookie: organizer,
      body: reason ? { reason } : {},
    })
  ).data
}

export async function setRoomWishes(applicationId, termId, names) {
  const { participant } = await sessionsOnce()
  return (
    await req("PUT", `/participant/applications/${applicationId}/terms/${termId}/room-wishes`, {
      cookie: participant,
      body: names.length ? { names } : { names: [], noRoomWishes: true },
    })
  ).data
}

export async function publishRooms(ev, term, published = true) {
  const { organizer } = await sessionsOnce()
  return (
    await req("PATCH", `/organizer/events/${ev.id}/terms/${term.id}/rooms-published`, {
      cookie: organizer,
      body: { published },
    })
  ).data
}

export async function getEvent(evId) {
  const { organizer } = await sessionsOnce()
  return (await req("GET", `/organizer/events/${evId}`, { cookie: organizer })).data
}

/** Bank statement in the Fio CSV format (same as the import integration tests). */
export function fioCsv(rows) {
  const id = String(Date.now())
  return [
    "ID operace;Datum;Objem;Měna;Protiúčet;Název protiúčtu;Kód banky;Název banky;KS;VS;SS;Poznámka;Zpráva pro příjemce;Typ",
    ...rows.map(
      ([amount, vs], i) =>
        `${id}${i};05.05.2026;${amount};CZK;1;Test Plátce;800;CS;;${vs};;;;Platba`,
    ),
  ].join("\r\n")
}

/** Names for filler participants. */
export const FEMALE = [
  "Adéla",
  "Barbora",
  "Cecílie",
  "Dominika",
  "Eliška",
  "Františka",
  "Gabriela",
  "Hana",
  "Irena",
  "Jitka",
  "Karolína",
  "Lenka",
  "Markéta",
  "Nikola",
  "Olga",
  "Pavla",
]
export const MALE = [
  "Adam",
  "Bořivoj",
  "Cyril",
  "David",
  "Emil",
  "Filip",
  "Gustav",
  "Hynek",
  "Ivo",
  "Jakub",
  "Karel",
  "Libor",
  "Matěj",
  "Norbert",
  "Ondřej",
  "Petr",
]

/** Bulk room creation (at most 200 per request). */
export async function bulkRooms(ev, term, body) {
  const { organizer } = await sessionsOnce()
  return (
    await req("POST", `/organizer/events/${ev.id}/terms/${term.id}/rooms/bulk`, {
      cookie: organizer,
      body,
    })
  ).data
}
export async function listRooms(ev, term) {
  const { organizer } = await sessionsOnce()
  const listed = (
    await req("GET", `/organizer/events/${ev.id}/terms/${term.id}/rooms`, { cookie: organizer })
  ).data
  for (const room of listed.rooms) term.rooms[room.name] = room.id
  return listed.rooms
}
export async function addTransport(ev, term, body) {
  const { organizer } = await sessionsOnce()
  await req("POST", `/organizer/events/${ev.id}/transport`, {
    cookie: organizer,
    body: { termId: term.id, kind: "SCHEDULED", ...body },
  })
}
export async function listTransport(ev) {
  const { organizer } = await sessionsOnce()
  return (await req("GET", `/organizer/events/${ev.id}/transport`, { cookie: organizer })).data
}
export async function chooseTransport(applicationId, termId, transportId) {
  const { organizer } = await sessionsOnce()
  await req("PUT", `/organizer/applications/${applicationId}/transport`, {
    cookie: organizer,
    body: { termId, transportId },
  })
}
/** Date `n` days from today (YYYY-MM-DD). */
export const fromToday = (n) => iso(addDays(new Date(), n))
