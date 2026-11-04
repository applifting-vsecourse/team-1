# Návrh textů e-mailů

Textace schválené Adamem 3. 11. 2026, navazující na [business katalog](KATALOG.md), včetně UX revize a české i anglické varianty. Nejde o doslovný export současných šablon ani o potvrzení jejich implementace. Texty nemění pravidla komunikace z [EMAILY.md](../procesy/zpracovani-prihlasky/EMAILY.md).

## Společné části

- Česky vykání. Adresátem je přihlašovatel; věta o konkrétní účasti jmenuje účastníka samostatně. Návrh používá nesklonné údaje v samostatných řádcích, aby nevznikalo „účast (Jana Nováková)“ ani chybné skloňování jmen.
- Identifikační blok přihlášky: „Akce / Event“, „Účastník / Participant“, „Termín / Term“; hodnoty `{eventName}`, `{participantName}`, `{termLabel}`. Více změněných termínů znamená opakované bloky uvnitř jedné zprávy, ne nepravdivé tvrzení, že všechny mají stejný stav.
- Schválené anglické označení náhradníka je „Waitlisted“, nikoli současné „Substitute“.
- Výchozí CTA přihlášek: „Zobrazit přihlášku / View application“, cíl `{applicationUrl}`. U souhrnu více přihlášek je toto CTA u každé přihlášky. Souhrnný přístup do účtu: „Přihlásit se do Togeny / Sign in to Togena“, cíl `{accessUrl}`. Pokud odesláním přihlášky vzniká účet, zpráva obsahuje magic link; obecné ověření adresy se nepožaduje.
- Patička přihlášek: „{organizationName} · prostřednictvím Togeny / {organizationName} · via Togena“ a „Dotazy k přihlášce, účasti nebo platbě: organizator@togena.com / Questions about your application, attendance or payment: organizator@togena.com“. Patička zpráv k účtu a přístupu: „Togena“ a „Pomoc s přihlášením nebo uživatelským účtem: support@togena.com / Help with signing in or your account: support@togena.com“. Jde o schválené fiktivní adresy pro drafty a náhledy, nikoli ověřené provozní kontakty. V provozu odpověď na zprávu směřuje stejnému příjemci jako uvedený kontakt.
- Platební blok pouze u povolených typů: „K úhradě / Amount due“, „Bankovní účet / Bank account“, „Variabilní symbol / Variable symbol“. Konkrétní platební údaje přebírá komunikace z platební domény; jejich výpočet a konstrukce nejsou předmětem tohoto návrhu. Podle rozhodnutí PM patří platební údaje také do upozornění na opravu dříve potvrzeného zaplacení.
- Náhradní text odkazu: „Pokud tlačítko nefunguje, zkopírujte tento odkaz do prohlížeče: / If the button does not work, copy this link into your browser:“ a stejný cíl jako CTA.
- Doby platnosti, lhůty a data se nesmí vymýšlet v copy. Přihlašovací odkaz platí 7 dní a je jednorázový ([D-008](../rozhodnuti/README.md#d-008)); potvrzení změny e-mailu platí 1 hodinu ([konfigurace](../../apps/backend/src/shared/auth/providers/better-auth.provider.ts)). Odkaz pro obnovu hesla platí 1 hodinu podle výchozího nastavení používané verze [Better Auth 1.7.1](https://github.com/better-auth/better-auth/blob/v1.7.1/packages/better-auth/src/api/routes/password.ts), které konfigurace Togeny nepřepisuje. Splatnost plateb zatím není předmětem této revize.
- Údaje ve složených závorkách označují informace, které se v konkrétní zprávě mění. Neurčují strukturu dat v aplikaci. Ukázky používají smyšlené osoby a adresy.

## APP_RECEIVED

| Pole | CS | EN |
| --- | --- | --- |
| Předmět | Přihláška přijata: {eventName} | Application received: {eventName} |
| Preheader | Přehled přijatých přihlášek a stavů jednotlivých termínů. | Your submitted applications and the status of each term. |
| Nadpis | Přihlášku jsme přijali | We have received your application |
| Úvod | Přijali jsme vaše přihlášky na akci {eventName}. Níže najdete přehled účastníků a stav jednotlivých termínů. | We have received your applications for {eventName}. Below is a summary of the participants and the status of each term. |

Počet v úvodu a nadpisu přizpůsobit jedné/více přihláškám. Jedna zpráva za odeslání formuláře. U každého termínu použít odpovídající text:

| Stav | CS | EN |
| --- | --- | --- |
| K vyhodnocení | Čeká na vyhodnocení. O výsledku vás informujeme e-mailem. Zatím nic neplaťte. | Awaiting review. We will let you know the result by e-mail. Please do not pay yet. |
| Potvrzená | Účast je potvrzená. Platební údaje najdete níže. | The place is confirmed. Payment details are shown below. |
| Náhradník | Přihláška je zařazena mezi náhradníky. Pokud bude účast potvrzena, informujeme vás e-mailem. Zatím nic neplaťte. | The application is waitlisted. We will e-mail you if the place is confirmed. Please do not pay yet. |

„Zatím nic neplaťte“ se vztahuje jen ke konkrétnímu nepotvrzenému termínu; ve smíšeném souhrnu nesmí být globální zákaz platby. Platební blok je jen u potvrzených termínů, CTA podle společných částí. Text pro více přihlášek, pouze pokud souhrn obsahuje částku k úhradě: „Plaťte pouze za potvrzené termíny. Každou přihlášku zaplaťte samostatně podle uvedené částky a variabilního symbolu. / Please pay only for confirmed terms. Pay for each application separately using the amount and variable symbol shown.“

K přihlašovacímu odkazu doplnit: „Odkaz platí 7 dní a lze jej použít pouze jednou. Pokud už nefunguje, na přihlašovací stránce Togeny si můžete nechat poslat nový. / The link is valid for 7 days and can only be used once. If it no longer works, you can request a new one on the Togena sign-in page.“

## APP_CONFIRMED

| Pole | CS | EN |
| --- | --- | --- |
| Předmět | Účast potvrzena: {eventName} | Place confirmed: {eventName} |
| Preheader | Potvrzení účasti a údaje k platbě. | Your place is confirmed. Payment details are included. |
| Nadpis | Účast je potvrzená | The place is confirmed |
| Tělo | Účast v uvedeném termínu byla potvrzena. Platební údaje najdete níže. | The place in the term shown below has been confirmed. Payment details are included below. |

Identifikační a platební blok, CTA přihlášky. Pokud se několik termínů mění různě, subject ani úvod nesmí tvrdit potvrzení všech; použije se společný souhrn změn popsaný na konci.

## APP_WAITLISTED

| Pole | CS | EN |
| --- | --- | --- |
| Předmět | Zařazení mezi náhradníky: {eventName} | Application waitlisted: {eventName} |
| Preheader | Přihláška je zařazena mezi náhradníky. | The application has been placed on the waiting list. |
| Nadpis | Přihláška je mezi náhradníky | The application is waitlisted |
| Tělo | Přihláška v uvedeném termínu byla zařazena mezi náhradníky. Pokud bude účast potvrzena, informujeme vás e-mailem. Za tento termín zatím nic neplaťte. | The application for the term shown below has been waitlisted. We will e-mail you if the place is confirmed. Please do not pay for this term yet. |

Identifikační blok, CTA přihlášky. Bez platebních údajů a bez pořadí ve frontě.

## APP_REJECTED

| Pole | CS | EN |
| --- | --- | --- |
| Předmět | Přihláška zamítnuta: {eventName} | Application rejected: {eventName} |
| Preheader | Organizátor zamítl účast v uvedeném termínu. | The organiser has rejected the application for the term shown below. |
| Nadpis | Přihláška byla zamítnuta | The application has been rejected |
| Tělo | Organizátor zamítl účast v uvedeném termínu. Přihláška v tomto termínu je zrušená. Zrušení nemusíte potvrzovat. | The organiser has rejected the application for the term shown below. The application for this term is now cancelled. You do not need to confirm the cancellation. |

Identifikační blok, CTA přihlášky. Bez platebních údajů. U již zaplacené účasti doplnit: „Informace o případném vrácení platby vám sdělí organizátor. / The organiser will let you know about any possible refund.“ Neslibovat automatickou refundaci.

## APP_WAITLIST_EXPIRED

| Pole | CS | EN |
| --- | --- | --- |
| Předmět | Přihláška byla zrušena: {eventName} | Application cancelled: {eventName} |
| Preheader | Zrušení přihlášky náhradníka v uvedeném termínu. | Cancellation of the waitlisted application for the term shown below. |
| Nadpis | Přihláška byla zrušena | Application cancelled |
| Tělo | Účast v uvedeném termínu nebyla potvrzena. Přihláška v tomto termínu je proto zrušená. Zrušení nemusíte potvrzovat. | The place in the term shown below was not confirmed. The application for this term is therefore cancelled. You do not need to confirm the cancellation. |

Identifikační blok, CTA přihlášky. Bez platebních údajů. Hromadná expirace několika termínů téže přihlášky musí vytvořit jeden souhrn.

## PAYMENT_OVERDUE

| Pole | CS | EN |
| --- | --- | --- |
| Předmět | Výzva k zaplacení: {eventName} | Payment overdue: {eventName} |
| Preheader | Uplynula lhůta pro zaplacení. Zkontrolujte zbývající částku. | The payment deadline has passed. Please check the outstanding amount. |
| Nadpis | Zbývá uhradit platbu | Payment is outstanding |
| Tělo | U přihlášky v uvedeném termínu uplynula lhůta pro zaplacení a evidujeme nedoplatek. Uhraďte prosím zbývající částku podle údajů níže. | The payment deadline for the application in the term shown below has passed and an amount remains outstanding. Please pay the outstanding amount using the details below. |

Identifikační blok, nedoplatek a platební údaje podle platebních pravidel a CTA přihlášky. Automaticky odeslat pouze na požadavek organizátora, jednou po uplynutí lhůty a bez automatického opakování. Výzva je určena pouze přihlášce, u které dluh trvá. Text nezavádí novou lhůtu, sankci ani automatické zrušení.

## PAYMENT_SETTLED

| Pole | CS | EN |
| --- | --- | --- |
| Předmět | Platba přijata: {eventName} | Payment received: {eventName} |
| Preheader | Přihláška v uvedeném termínu je plně zaplacená. | The application for the term shown below is fully paid. |
| Nadpis | Platbu jsme zaevidovali | Your payment has been recorded |
| Tělo | Zaevidovali jsme platbu a přihláška v uvedeném termínu je plně zaplacená. Za tento termín již nic nedlužíte. | We have recorded your payment and the application for the term shown below is fully paid. There is no outstanding balance for this term. |

Identifikační blok, CTA přihlášky. Bez nové platební výzvy a bez platebního bloku zakázaného pravidly EMAILY.md. Zpráva potvrzuje zaplacenou účast v uvedeném termínu, nikoli pouhé přijetí částečné platby.

## PAYMENT_CORRECTED

Schválené znění k nově schválenému druhu komunikace.

| Pole | CS | EN |
| --- | --- | --- |
| Předmět | Po opravě platby zbývá doplatit: {eventName} | Payment correction: outstanding balance for {eventName} |
| Preheader | Předchozí potvrzení o úplném zaplacení již neplatí. Níže najdete částku k doplacení. | The previous confirmation of full payment is no longer valid. The outstanding amount is shown below. |
| Nadpis | Po opravě platby zbývá nedoplatek | An outstanding balance remains after a payment correction |
| Tělo | Po opravě evidence platby organizátorem zbývá u přihlášky v uvedeném termínu doplatit částku uvedenou níže. Předchozí potvrzení o úplném zaplacení již neplatí. Uhraďte prosím nedoplatek podle uvedených platebních údajů. | Following the organiser’s correction of the payment record, the amount shown below remains outstanding for the application in this term. The previous confirmation of full payment is no longer valid. Please pay the outstanding amount using the payment details provided. |

Identifikační blok pouze dotčených termínů, aktuální nedoplatek, platební údaje a CTA přihlášky. Automatické upozornění na opravu není výzvou po splatnosti a nepodmiňuje se požadavkem organizátora na automatické výzvy. Neuvádět, že příjemce zmeškal lhůtu, pokud to nevyplývá z jiné business události.

## APP_CANCELLED_BY_APPLICANT

| Pole | CS | EN |
| --- | --- | --- |
| Předmět | Odhlášení potvrzeno: {eventName} | Cancellation confirmed: {eventName} |
| Preheader | Potvrzení odhlášení z uvedeného termínu. | Confirmation of cancellation for the term shown below. |
| Nadpis | Odhlášení je potvrzené | The cancellation is confirmed |
| Tělo | Potvrzujeme odhlášení z uvedeného termínu. Přihláška v tomto termínu je zrušená. | We confirm the cancellation for the term shown below. The application for this term is now cancelled. |

Identifikační blok, CTA přihlášky. Potvrzení se posílá i pro odebraný termín, ve kterém účastník po odhlášení již není přihlášený. Bez platebních údajů. U již zaplacené účasti doplnit: „Informace o případném vrácení platby vám sdělí organizátor. / The organiser will let you know about any possible refund.“ Neslibovat automatické vrácení.

## APP_CONFIRMATION_WITHDRAWN

| Pole | CS | EN |
| --- | --- | --- |
| Předmět | Potvrzení účasti odvoláno: {eventName} | Place confirmation withdrawn: {eventName} |
| Preheader | Organizátor odvolal potvrzení a zařadil přihlášku mezi náhradníky. | The organiser has withdrawn the confirmation and waitlisted the application. |
| Nadpis | Potvrzení účasti bylo odvoláno | The place confirmation has been withdrawn |
| Tělo | Organizátor odvolal potvrzení účasti v uvedeném termínu a zařadil přihlášku mezi náhradníky. Za tento termín zatím nic neplaťte. Pokud bude účast znovu potvrzena, informujeme vás e-mailem. | The organiser has withdrawn the place confirmation for the term shown below and waitlisted the application. Please do not pay for this term yet. We will e-mail you if the place is confirmed again. |

Identifikační blok, CTA přihlášky. Samostatná zpráva odlišná od prvního vyhodnocení. Bez platebních údajů, pořadí a neověřeného slibu vrácení dosavadních plateb.

## APP_WAITLIST_CANCELLED

| Pole | CS | EN |
| --- | --- | --- |
| Předmět | Přihláška zrušena organizátorem: {eventName} | Application cancelled by the organiser: {eventName} |
| Preheader | Organizátor zrušil přihlášku vedenou mezi náhradníky. | The organiser has cancelled the waitlisted application. |
| Nadpis | Přihláška byla zrušena organizátorem | The application has been cancelled by the organiser |
| Tělo | Organizátor zrušil přihlášku v uvedeném termínu, ve kterém byla vedena mezi náhradníky. Zrušení nemusíte potvrzovat. | The organiser has cancelled the application for the term shown below, where it was on the waiting list. You do not need to confirm the cancellation. |

Identifikační blok, CTA přihlášky. Bez platebních údajů.

## EVENT_TERM_CANCELLED

| Pole | CS | EN |
| --- | --- | --- |
| Předmět | Termín akce zrušen: {eventName} | Event term cancelled: {eventName} |
| Preheader | Organizátor zrušil termín akce a přihlášku v tomto termínu. | The organiser has cancelled the event term and the application for it. |
| Nadpis | Termín akce byl zrušen | The event term has been cancelled |
| Tělo | Organizátor zrušil uvedený termín akce. Přihláška v tomto termínu je proto zrušená. | The organiser has cancelled the event term shown below. The application for this term has therefore been cancelled. |
| Věta o platbách | Případné zaplacené platby za zrušený termín se vrací. Další postup vám sdělí organizace. | Any payments already made for the cancelled term are to be refunded. The organisation will let you know the next steps. |

Identifikační blok, CTA přihlášky. Bez platební výzvy. Věta neříká, že refundace už byla provedena; neurčuje nové datum ani výši. Před napojením potvrdit soulad s pravidly rušení termínů.

## AUTH_MAGIC_LINK

| Pole | CS | EN |
| --- | --- | --- |
| Předmět | Odkaz pro přihlášení do Togeny | Your sign-in link for Togena |
| Preheader | Přihlaste se pomocí odkazu v tomto e-mailu. | Use the link in this e-mail to sign in. |
| Nadpis | Přihlášení do Togeny | Sign in to Togena |
| Tělo | O přihlášení do Togeny bylo požádáno pro tuto e-mailovou adresu. Přihlaste se tlačítkem níže. Odkaz nikomu nepřeposílejte. | A sign-in link for Togena was requested for this e-mail address. Use the button below to sign in. Do not forward this link to anyone. |
| Platnost odkazu | Odkaz platí 7 dní a lze jej použít pouze jednou. Pokud už nefunguje, na přihlašovací stránce Togeny si můžete nechat poslat nový. | The link is valid for 7 days and can only be used once. If it no longer works, you can request a new one on the Togena sign-in page. |
| Bezpečnost | Pokud jste o přihlášení nežádali, odkaz nepoužívejte. | If you did not request this link, do not use it. |
| CTA | Přihlásit se do Togeny | Sign in to Togena |

Cíl `{magicLinkUrl}`, auth patička a náhradní text odkazu. Samostatný e-mail se neposílá při pouhém vložení magic linku do potvrzení přihlášky.

## AUTH_RESET_PASSWORD

| Pole | CS | EN |
| --- | --- | --- |
| Předmět | Obnova hesla do Togeny | Reset your Togena password |
| Preheader | Nastavte si nové heslo pomocí odkazu v tomto e-mailu. | Use the link in this e-mail to choose a new password. |
| Nadpis | Nastavení nového hesla | Choose a new password |
| Tělo | Obdrželi jsme žádost o obnovu hesla k vašemu uživatelskému účtu v Togeně. Nové heslo si nastavíte tlačítkem níže. Odkaz platí 1 hodinu. | We have received a request to reset the password for your Togena account. Use the button below to choose a new password. The link is valid for 1 hour. |
| Bezpečnost | Pokud jste o obnovu nežádali, tento e-mail ignorujte. Vaše heslo se tímto e-mailem nemění. | If you did not request a password reset, ignore this e-mail. This e-mail does not change your password. |
| CTA | Nastavit nové heslo | Choose a new password |

Cíl `{resetUrl}`, auth patička a náhradní text odkazu. Bez oslovení jménem, které by vyžadovalo skloňování. Konkrétní postup po vypršení odkazu se neslibuje, dokud není ověřena odpovídající uživatelská cesta.

## AUTH_CHANGE_EMAIL_VERIFY

| Pole | CS | EN |
| --- | --- | --- |
| Předmět | Potvrďte změnu e-mailu v Togeně | Confirm your e-mail change in Togena |
| Preheader | Změna přihlašovací adresy čeká na vaše potvrzení. | Your sign-in e-mail change is awaiting confirmation. |
| Nadpis | Potvrzení změny e-mailu | Confirm your e-mail change |
| Tělo | Po potvrzení se přihlašovací e-mail vašeho uživatelského účtu v Togeně změní z {currentEmail} na {newEmail}. Do té doby platí dosavadní adresa. | Once confirmed, the sign-in e-mail for your Togena account will change from {currentEmail} to {newEmail}. Until then, your current address remains in use. |
| Platnost odkazu | Odkaz platí 1 hodinu. Pokud vyprší, přihlaste se dosavadní adresou a změnu e-mailu zadejte znovu v nastavení uživatelského účtu. | The link is valid for 1 hour. If it expires, sign in using your current e-mail address and request the e-mail change again in your account settings. |
| Bezpečnost | Pokud jste o změnu nežádali, odkaz nepoužívejte. | If you did not request this change, do not use the link. |
| CTA | Potvrdit změnu e-mailu | Confirm e-mail change |

Příjemce je nová adresa. Cíl `{changeEmailUrl}`, auth patička a náhradní text odkazu.

## AUTH_CHANGE_EMAIL_NOTICE

| Pole | CS | EN |
| --- | --- | --- |
| Předmět | Žádost o změnu přihlašovacího e-mailu v Togeně | Sign-in e-mail change requested in Togena |
| Preheader | Změna adresy zatím není dokončená. | The e-mail address change has not yet been completed. |
| Nadpis | Byla vyžádána změna e-mailu | An e-mail change has been requested |
| Tělo | U vašeho uživatelského účtu v Togeně byla vyžádána změna přihlašovacího e-mailu na {newEmail}. Změna se provede až po potvrzení odkazu zaslaného na novou adresu. Do té doby se přihlašujete dosavadní adresou. | A change of the sign-in e-mail for your Togena account to {newEmail} has been requested. The change takes effect only after the link sent to the new address is confirmed. Until then, continue using your current address. |
| Bezpečnost | Pokud jste o změnu nežádali, změňte si heslo ke svému uživatelskému účtu v Togeně a změnu e-mailu nepotvrzujte. | If you did not request this change, change your Togena password and do not confirm the e-mail change. |

Příjemce je dosavadní adresa. Jde pouze o upozornění, ne o druhou možnost potvrdit změnu. Zpráva neoznamuje úspěšně dokončenou změnu. Bezpečnostní doporučení vychází z existující komunikace; detailní postup při zneužití účtu není tímto návrhem zaveden.

## Souhrn různých změn téže přihlášky

- Předmět: „Změny v přihlášce: {eventName} / Changes to your application: {eventName}“.
- Preheader: „Přehled změn stavu přihlášky v jednotlivých termínech. / A summary of application status changes for individual terms.“
- Nadpis: „Změny v přihlášce / Changes to your application“.
- Úvod: „U vaší přihlášky se změnil stav v níže uvedených termínech. / The status of your application has changed for the terms listed below.“
- Jen dotčené přihlášky v termínech, na které je účastník přihlášený a kde proběhla změna; nezměněné termíny se neopakují. Potvrzení odhlášení zahrnuje také odebraný termín. Jeden blok za změněný termín s odpovídající textací z katalogu. Platební údaje jen tam, kde jsou povolené.
- Toto je návrh prezentačního řešení existujícího požadavku na slučování, ne nový business spouštěč.

## Schválení a předání

- Adam 3. 11. 2026 schválil textace včetně UX oprav, českých a anglických variant a konečného předmětu „Přihláška byla zrušena“ u APP_WAITLIST_EXPIRED. Další jazyková revize se u školního projektu neprovádí.
- Schválené fiktivní kontakty pro drafty a náhledy jsou `organizator@togena.com` a `support@togena.com`; jde o školní projekt, skutečné kontakty se nedoplňují.
- Šest business rozhodnutí z dotazníku je zapracováno v [KATALOG.md](KATALOG.md). Splatnost se zatím neřeší. U obnovy hesla se neslibuje neověřený postup po vypršení odkazu. U zrušení celého termínu Adam potvrdil ponechání příslibu, že další postup vrácení plateb sdělí organizace.
- Design: následně použít schválené texty v reprezentativních náhledech a porovnat s existujícími Figma návrhy.
