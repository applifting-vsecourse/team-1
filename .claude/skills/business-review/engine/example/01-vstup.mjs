// Sample scenario. `kit` = everything from lib/api.mjs, lib/seed.mjs and db(). Doubles as an engine smoke test.
export default ({ createEvent, LABEL }) => ({
  id: "1",
  title: "Vzor: přihlášení a veřejná přihláška",
  // Data through the API only, before the visible part. The returned object is saved and reused next time.
  async seed() {
    const ev = await createEvent({
      name: `Vzor · ${LABEL}`,
      terms: [
        { name: "Týden", price: 1000, rooms: [{ name: "A", capacity: 4, gender: "FEMALE" }] },
      ],
    })
    return { eventIds: [ev.id], token: ev.publicToken, summary: `akce ${ev.name}` }
  },
  blocks: [
    {
      id: "1.1",
      stories: [1],
      title: "Veřejná přihláška",
      look: ["#1 Formulář je čitelný na desktopu i 360 px."],
      // A view = a state one click away. Role: "visitor" | "organizer" | "participant" | { email, password }.
      views: [
        { label: "Formulář", run: (h, d) => h.go("visitor", `/events/${d.token}`) },
        {
          label: "Přihlášení organizátora, vyplněný e-mail",
          async run(h) {
            await h.go("visitor", "/organizer/login")
            await h.act("Vyplňuji e-mail", (p) =>
              p.getByRole("textbox").first().fill("organizator@example.com"),
            )
          },
        },
        { label: "Mobil 360 px", mobile: true, run: (h) => h.go("organizer", "/organizer") },
      ],
    },
  ],
})
