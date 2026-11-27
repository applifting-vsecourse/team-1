# Ilustrace

Značkové ilustrace Togeny z geometrie loga (Figma: Togena / Brand / Illustration, [`27356:3580`](https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27356-3580)). Jen výplně bez obrysů, plátno 320 × 240, jedna zemní linka. Barvy jsou CSS proměnné z `styles/global.css` (`var(--illustration-primary)`, `var(--illustration-subtle)`, `var(--illustration-ink)`, `var(--brand-warm)` a `var(--card)` za bílé výřezy), takže sledují světlý i tmavý vzhled.

| Soubor           | Motiv ve Figmě         | Kde                                        |
| ---------------- | ---------------------- | ------------------------------------------ |
| `camp.svg`       | Tábor                  | landing: hero (M31) a závěr                |
| `waitlist.svg`   | Potvrzení a náhradníci | landing: široká karta funkcí               |
| `terms.svg`      | Termíny a ceny         | landing: karta „Přihlášky na více termínů“ |
| `rooms.svg`      | Pokoje a kapacita      | landing: karta „Kapacitu podle pokojů“     |
| `payments.svg`   | Platby                 | landing: karta „Přehled plateb“            |
| `confirmed.svg`  | Potvrzeno (radost)     | zatím nepoužito                            |
| `waiting.svg`    | Čekání                 | zatím nepoužito                            |
| `empty.svg`      | Prázdno                | zatím nepoužito                            |
| `lost.svg`       | Ztraceno               | zatím nepoužito                            |
| `loading.svg`    | Načítání               | zatím nepoužito                            |
| `email-sent.svg` | E-mail odeslán         | zatím nepoužito                            |
| `submitted.svg`  | Odesláno               | zatím nepoužito                            |

Importují se jako komponenty: `import Camp from "@/assets/illustrations/camp.svg?react"`. Jsou dekorativní (`aria-hidden` je přímo v souboru) a nikdy nenesou stav, číslo ani chybu. Tvary mají třídu podle názvu vrstvy ve Figmě (`arc-1`, `arc-2`, `tent`, `sun`…); na ně míří pohyb M31 (`.brand-assemble` v `global.css`). Novou ilustraci exportuj z Figmy jako SVG a hex barvy nahraď proměnnými výše.
