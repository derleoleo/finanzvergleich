# Vorsorgewaage: Produkt-, Technik- und Wettbewerbsprüfung

Stand: 28. September 2026. Zielgruppe laut Auftrag: Finanzberater und Vermittler allgemein. Produktphase: erste Testnutzer/Pilotkunden.

**Abschließender Statusabgleich:** Während der Prüfung wurde parallel am Produkt weitergearbeitet. Die Befunde dokumentieren deshalb auch zuvor reproduzierte Zustände. F02 (genannte Ertragsanteile) ist korrigiert. F01 ist teilweise korrigiert: Das Depot nutzt inzwischen ebenfalls eine Annuitätenformel; Erträge während der Depot-Auszahlphase bleiben aber laut neuem Code ausdrücklich unversteuert. Ein vollständiger Nettovergleich ist damit weiterhin offen. F08 prüft inzwischen das Ablaufdatum in Frontend und SQL, und Code-Upsert-Fehler werden gemeldet; atomare Codeeinlösung und der Nachweis der ausgerollten Migration bleiben offen. F09 meldet inzwischen Subscription-Schreibfehler mit HTTP 500; Schutz gegen doppelte/veraltete Ereignisse und Mehrfachabos bleibt offen. Diese Änderungen stammen nicht aus diesem Audit. Der nachfolgende Text und die Browserzahlen belegen die jeweils untersuchten Zustände, nicht eine Behauptung, alle Fehler seien im neuesten Arbeitsstand noch unverändert vorhanden.

## Entscheidungsvorlage

Vorsorgewaage besitzt bereits mehr Module, als ein fokussierter MVP benötigt. Die größte Lücke liegt zwischen dem Versprechen eines nachvollziehbaren Beratungsvergleichs und der Absicherung dieses Vergleichs: einheitliche Zahlungsströme, korrekte Kostenbegriffe, reproduzierbare Ergebnisse, vollständige Speicherung und zuverlässiger Betrieb.

Empfehlung: zunächst einen klar abgegrenzten Beratungsfall hervorragend lösen: **„Depot und Fondspolice mit identischem Budget vergleichen, die entscheidenden Annahmen zeigen und die Rechnung später unverändert nachvollziehen können.“** Die breite Berufsgruppe bleibt Zielmarkt; der konkrete Beratungsanlass begrenzt den MVP.

„Neutral, schnell und nachvollziehbar“ ist eine Positionierungshypothese, noch kein nachgewiesenes Alleinstellungsmerkmal. Mitbewerber versprechen bereits ähnliche Eigenschaften. Differenzierung muss durch Arbeitsersparnis, bessere Nachprüfbarkeit und Pilotkundenverhalten belegt werden.

## Umfang und Grenzen dieser Prüfung

- Gelesen: Routing, Authentifizierung, Abomodell, API-Funktionen, Datenzugriff, zentrale Rechenmodule, Rechnerseiten, Ergebnisdarstellung, Exportcode, lokale Speicherung, CI/Backup und ausgewählte Rechtstexte.
- Ausgeführt: vorhandene Unit-Tests, Produktionsbuild, ESLint und zusätzliche lokale Rechenproben.
- Im Browser geprüft: lokale Landingpage, Anmeldung durch den Nutzer, anschließend ein synthetischer Sparplan im bereitgestellten Testkonto, Netto-Umschaltung, PDF-Dialog und Wiederöffnung nach Neuladen, AVD-Ergebnisdarstellung, Rentenbeginn-Grenzfall und Verlustszenario im Entnahmeplan. Keine bezahlten Aktionen oder echten Mandantendaten als Rechenbeispiele benutzt; vorhandene fremde Berechnungen wurden nicht geöffnet oder verändert.
- Marktvergleich: öffentlich zugängliche Anbieterinformationen; keine gekauften Testkonten, keine unabhängige Zertifizierung der Wettbewerberrechnungen. Anbieterbehauptungen sind als solche zu verstehen.
- Nicht verifiziert: tatsächlich ausgerollte Datenbankregeln, Stripe-Konfiguration, E-Mail-Zustellung, Restore eines Cloudbackups, eingeloggte End-to-End-Abläufe und PDF-Layout aller Rechner.
- Während der Untersuchung lagen umfangreiche fremde/uncommittete Änderungen vor. Der Bericht bezieht sich auf den gelesenen Arbeitsstand, nicht auf eine unveränderliche Releaseversion. Keine Produktdateien wurden durch diesen Audit absichtlich geändert; hinzugefügt wurden Bericht und Rechenproben.

## Was bereits trägt

Sieben implementierte Rechner: Sparvertrag, Einmalanlage, BestAdvice, Netto-/Bruttopolice, Rentenlücke, Entnahmeplan und Altersvorsorgedepot. Die öffentliche Seite nennt sechs, weil der Honorarvergleich gesondert freigeschaltet wird.

Positiv: gemeinsame monatliche LV-/Depot-Engine, separate Steuerfunktionen, gewichtete Fondskosten, Dynamik, Ergebnisdiagramme, neutrale Waagenvisualisierung, Steuer-Snapshots für neuere Berechnungen, PDF-Branding, Supabase-Anmeldung, Stripe-Preisliste mit Allowlist und signierte Webhooks. Das AVD trennt gefördertes und ungefördertes Kapital. Das sind brauchbare Grundlagen.

Prüfstatus: Zunächst **146 Tests in sechs Dateien bestanden; Lint ohne Fehler, mit sechs Warnungen; Build bestanden.** Nach parallel eingegangenen Korrekturen wurden um 23:23 Uhr erneut **150 Tests in sechs Dateien erfolgreich ausgeführt**. Build und Lint beziehen sich auf den vorherigen Prüfstand; sie wurden nach diesen letzten externen Änderungen nicht erneut ausgeführt. Der zuvor beobachtete jsPDF-Typfehler war beim erfolgreichen Build nicht mehr reproduzierbar. Der Build warnte weiterhin vor zyklischen Recharts-Chunks und einem initialen Chunk über 500 kB. Bestandene Tests bestätigen die geprüften Fälle, nicht die fachliche Vollständigkeit.

## Priorisierte Befunde

P1: vor breiterem Vertrieb bzw. Verwendung der betroffenen Aussage beheben. P2: für einen belastbaren MVP einplanen. „Offen“ bedeutet fehlender Nachweis, nicht nachgewiesene Unsicherheit des Livebetriebs.

### P1 – Berechnungen und Vergleichbarkeit

**F01 – AVD-Auszahlungsvergleich mit ungleichen Renditeannahmen. Bestätigt im Code.**

`src/lib/finance/avd/simulation.ts`, Funktionen `berechneAuszahlung` und `berechneDepotVergleich`: Die AVD-Auszahlrate wird bei positiver Rendite mit einer Annuitätenformel ermittelt. Die Depotrate ist dagegen `netto / monate`, also ohne weitere Verzinsung. `src/pages/AvdCalculator.tsx` stellt diese Werte nebeneinander. Dadurch kann die Darstellung einen AVD-Vorteil erzeugen, der teilweise aus unterschiedlichen Rechenmethoden stammt.

Abhilfe: identische Auszahlungsdauer und Renditebasis; je Hülle Kosten, steuerliche Zahlungsströme und Restkapital modellieren. Leibrente separat behandeln, weil lebenslange Zahlung und endlicher Entnahmeplan unterschiedliche Leistungen sind. Abnahme: bei ausgeschalteten Steuern und identischen Kosten/Kapital/Renditen identische Entnahmebeträge.

**F02 – Mehrere Ertragsanteile waren falsch; im Verlauf des Audits anderweitig korrigiert.**

`src/lib/finance/avd/config.ts`: beispielsweise Alter 61 = 21 %, 66 = 17 %, 70 = 14 %. In der amtlichen Tabelle stehen für 60–61 Jahre 22 %, für 65–66 Jahre 18 % und für 69–70 Jahre 15 %. Alter 66 und 70 liegen unmittelbar im vorgesehenen AVD-Auszahlungsbereich. [§ 22 EStG](https://www.gesetze-im-internet.de/estg/__22.html).

Nachprüfung um ca. 23:14 Uhr: Die Werte 61, 66 und 70 sind im aktuellen Arbeitsstand auf 22 %, 18 % und 15 % korrigiert. Diesen Teil nicht mehr als offenen Fehler zählen. Weiterhin vollständige Tabelle und Grenzalter anhand der Quelle testen. Zusätzlich fachlich klären, wann Ertragsanteil, Unterschiedsbetrag oder andere Regeln auf ungeförderte Leistungen anwendbar sind. Das bloße Korrigieren der Tabelle validiert noch nicht das gesamte Auszahlungsmodell.

**F03 – „Effektivkosten“ werden als laufender Kapitalabzug umgesetzt. Reproduziert.**

`src/lib/finance/simulation.ts`: Prozentwert wird durch 12 geteilt und monatlich vom bisherigen Kapital abgezogen. Die Oberfläche beschreibt ihn als jährliche Renditeminderung ohne Fondskosten. Bei 300 €/Monat, 30 Jahren, 6 % Rendite, 0 % TER und Eingabe 1 % ergibt die eigene RIY-Funktion **1,050067 Prozentpunkte** statt 1,00. Die Kennzahl RIY beschreibt eine Renditedifferenz; sie ist nicht mit einer nominalen Bestandsgebühr gleichzusetzen. [Produktinformationsstelle](https://produktinformationsstelle.de/effektivkosten/).

Abhilfe: Vertragsgebühr auf Kapital und Renditeminderung als unterschiedliche Eingaben anbieten. Klar ausweisen, ob Fondskosten schon enthalten sind. Keine pauschale Behauptung, jede eingetragene Versicherer-Effektivkostenquote schließe Fonds aus. Abnahme: definierte RIY-Eingabe trifft im Referenzfall dieselbe RIY-Ausgabe.

**F04 – Honorarvergleich behandelt zusätzlichen Geldabfluss unvollständig. Bestätigt.**

`src/pages/NetPolicyCalculator.tsx`: Honorar wird vom Netto-Endkapital ohne Zeitwert abgezogen, aber in `netto_riy` überhaupt nicht berücksichtigt. Die Policen erhalten denselben Monatsbeitrag, während die Nettovariante zusätzlich Honorar kostet. Das ist kein Vergleich mit gleichem Gesamtbudget.

Illustration, kein Anlageversprechen: 1.500 € haben bei hypothetischen 6 % über 30 Jahre einen Endwert von rund 8.615 € vor Steuern/Kosten. Ein Abzug von nur 1.500 € am Ende zeigt diesen Zeitwert nicht.

Abhilfe: Honorar als zeitlich richtigen Zahlungsstrom erfassen; wahlweise gleicher Gesamtaufwand oder explizit unterschiedlicher Aufwand. Abnahme: höheres Honorar verschlechtert auch die ausgewiesene Effektivkostenkennzahl.

**F05 – AVD-Erstattungsreinvestition verletzt die Budgetgleichheit. Codebefund, UI-Erreichbarkeit gesondert prüfen.**

Bei `erstattungReinvestieren` erhöht die Engine das AVD-Kapital um die Steuererstattung. Das Vergleichsdepot erhält trotzdem weiterhin nur Eigenbeitrag minus Erstattung. Die Erstattung finanziert somit eine zusätzliche Anlage, wird aber zugleich als Entlastung des AVD-Aufwands gerechnet. Außerdem werden reinvestierte Beträge pauschal dem geförderten Kapital zugeschlagen, ohne sie erneut gegen die Fördergrenze zu prüfen.

Abhilfe: echte Cashflow-Bilanz, Zeitpunkt der Erstattung und Fördergrenzen explizit modellieren. Abnahme: für beide Varianten dieselben externen Ein- und Auszahlungen.

**F06 – BestAdvice ist noch keine belastbare Wechselentscheidung. Bestätigte Modellgrenzen.**

Garantierte Ablaufleistung des Bestands steht einer unsicheren Renditeprojektion gegenüber. Historische Einzahlungen werden nicht getrennt vom heutigen Vertragswert erfasst, obwohl dieser Wert nicht automatisch die steuerliche Beitragsbasis ist. Der Vertragsbeginn wird laut Code nicht vollständig persistiert; der Detailchart verwendet deshalb wieder die Restlaufzeit für Steuerqualifikation. Die Bestandskurve ist eine lineare Interpolation, kein belegter Rückkaufswertverlauf.

Abhilfe: Rückkaufswert, historische Beitragssumme, garantierte und prognostizierte Leistung, Vertragsbeginn, Storno-/Übertragungskosten, verlorene Garantien und Zusatzschutz separat erfassen. Bis dahin als Szenarioillustration kennzeichnen und nicht als vollständigen Wechselcheck vermarkten. Abnahme: Endpunkt des Nettocharts stimmt bei Altvertrag und mehreren Verträgen mit den Ergebniskacheln überein.

**F07 – Fehlende Domänenvalidierung erlaubt unmögliche Ergebnisse. Reproduziert.**

Rechenprobe mit 1 € Monatsbeitrag, zwölf Monaten und 1.200 € Abschlusskosten ergibt rund −1.214,72 € Kapital und −5,52 € Fondskosten. Eine negative Bemessungsgrundlage erzeugt also eine rechnerische Kostengutschrift. Auch NaN, unzulässige Renditen, negative Beiträge und inkonsistente Fondsgewichte müssen auf Engine-Ebene abgefangen werden; HTML-Eingabegrenzen allein reichen nicht.

Abhilfe: validierte Eingabeschemata und fachliche Fehlerzustände. Nicht einfach jedes Ergebnis auf null kappen, weil damit unfinanzierbare Kosten unsichtbar würden.

### P1 – Betrieb und Datenvertrauen

**F08 – Trial-Code-Ablauf nicht im sichtbaren Berechtigungsmodell durchgesetzt.**

`api/redeem-code.ts` setzt `current_period_end`, `SubscriptionContext` liest aber nur Plan und Status. Die neue SQL-Funktion `hat_aktives_abo` prüft ebenfalls nur Status, nicht Plan oder Ablauf. Ohne externen Ablaufjob bleibt ein codebasierter Trial aktiv; ein solcher Job ist im geprüften Repository nicht nachgewiesen. Der Upsert-Fehler wird im Code-Endpunkt zudem ignoriert, obwohl der Code zuvor verbraucht wurde.

Abhilfe: getrennte Grant-/Subscription-Modelle, serverseitiges Ablaufdatum, atomare Codeeinlösung, keine Überschreibung laufender bezahlter Abos. Abnahme: abgelaufener Testcode ohne Stripe-Abo gewährt keinen Premiumzugang.

**F09 – Webhook kann Datenbankfehler als Erfolg quittieren.**

`api/stripe-webhook.ts` prüft die Ergebnisse mehrerer Supabase-Upserts nicht und antwortet danach mit HTTP 200. Fehler werden so gegenüber Stripe als erfolgreich verarbeitet bestätigt. Ereignis-Deduplizierung und Schutz gegen veraltete Events sind nicht sichtbar. Checkout verhindert im gelesenen Stand keine zweite aktive Subscription.

Abhilfe: persistente Eventverarbeitung mit Fehlerprüfung, idempotenter Verarbeitung und Abgleich der aktuellen Subscription. Doppelte Checkout-Aufrufe und Kündigung eines alten Abos gezielt testen. [Stripe-Webhooks](https://docs.stripe.com/webhooks) als Implementierungsreferenz.

**F10 – Benutzertrennung der Cloud muss nachgewiesen werden. Offen.**

Entity-Abfragen verlassen sich vielfach auf Row Level Security. Der Ausgangsstand der Datenbank und RLS ist laut `supabase/README.md` nicht versioniert. Das beweist keine Datenlücke, verhindert aber eine vollständige Prüfung und reproduzierbare Wiederherstellung.

Abhilfe: Schema exportieren; Tests mit zwei separaten Nutzern für SELECT/INSERT/UPDATE/DELETE; Subscription-Schreibrechte nur für berechtigte Serverprozesse. Deployment der neuen Kontingentmigration separat belegen.

**F11 – Lokale Entwürfe sind nicht an Benutzer gebunden.**

Feste Schlüssel wie `fv_*_draft_v1`, `fv_user_defaults_v1` und `wp_*` werden zwischen Konten desselben Browserprofils geteilt. Normales Abmelden löscht diese Daten nicht. Ein späterer Nutzer kann damit alte Entwürfe übernehmen; dafür ist kein Angriff auf Supabase nötig.

Abhilfe: nutzerbezogene Schlüssel und definierte Logout-/Gerätewechselpolitik. Abnahme: Konto B sieht nach Abmeldung von A keine Entwürfe von A.

**F12 – Backup ist kein vollständiges Wiederherstellungskonzept.**

`.github/workflows/backup.yml` liest je Tabelle einmal `select=*`, ohne Pagination oder Vollständigkeitskontrolle. Ein serverseitiges Zeilenlimit kann den Export unbemerkt abschneiden. Authdaten, Schema, RLS, Consents und eingelöste Codes sind nicht vollständig in der Tabellenliste erfasst. Wiederherstellung und Abhängigkeiten sind nicht getestet.

Abhilfe: geeigneter Datenbank-/Auth-Backupplan, paginierter Export falls weiter benötigt, Zeilenzahlvergleich und Restore-Übung. Test mit mehr Datensätzen als dem API-Limit. Aufbewahrung und Zugriff auf GitHub-Artefakte in das Datenschutzkonzept aufnehmen.

### P2 – Durchgängiger MVP

**F13 – Unvollständige Reproduzierbarkeit.** Steuer-Snapshots sind ein guter Anfang. Es fehlen aber durchgehend Modellversion, Bewertungsdatum, Rechtsstand und unveränderliche Ergebnisversionen. Die Altersberechnung verwendet das aktuelle Kalenderjahr. Ein später neu erzeugter Chart kann dadurch gegenüber einer früher gespeicherten Steuerberechnung abweichen.

**F14 – Unterschiedliche Speicherqualität.** Vier Rechnertypen sind in der Ergebnisübersicht, AVD und Nettopolice bleiben lokale Entwürfe, Entnahmeparameter ebenso. Der MVP braucht ein einheitliches Beratungsfallmodell mit Varianten, Duplizieren und nachvollziehbarer Historie. Kein vollständiges CRM nötig.

**F15 – Rentenlücke und Entnahmeplan sind grobe Hilfsmodelle.** Rentenlücke rechnet mit festem Endalter 90 und ohne eigene Netto-/Inflationslogik. Bei bereits erreichtem Rentenbeginn kann trotz Kapitalbedarf null erforderliche Sparrate ausgegeben werden. Der Entnahmeplan verzinst zunächst ein Jahr ohne Entnahme, erzwingt die Komplettentnahme im letzten Jahr und weist negative Renditebeträge durch `Math.max(0, growth)` als null aus. Entnahmebeginn, Restkapitalziel und Verlustdarstellung müssen explizit sein.

**F16 – AVD-Vorabpauschale nur vereinfacht.** Die Engine verwendet Anfangskapital des Jahres; zeitanteilige unterjährige Käufe werden nicht einzeln behandelt. [§ 18 InvStG](https://www.gesetze-im-internet.de/invstg_2018/__18.html) sieht eine zeitanteilige Behandlung bei Erwerb vor. Zusätzlich müssen Steuerzahlungstermin, Steuerentnahme aus dem Depot und Anschaffungskosten konsistent geführt werden. Das ist mehr als eine neue Konstante.

**F17 – Kontingentmigration ist nicht manipulations- und nebenläufigkeitssicher nachgewiesen.** Zählen vorhandener Datensätze bedeutet, dass Löschen das Kontingent wieder freigibt. Parallele Inserts können denselben Zählstand sehen. `created_at` versus `created_date` muss am Cloudschema geklärt werden. Besser: fest definieren, ob gespeicherte Fälle oder tatsächlich ausgeführte Berechnungen limitiert sind, und dafür einen atomaren Zähler verwenden.

**F18 – Fehlerzustände im UI.** Mehrere Detailseiten laden ganze Tabellen, suchen dann eine ID und zeigen bei nicht gefundenem Datensatz weiter einen Spinner. Fehlgeschlagene Updates werden nicht überall in `try/finally` abgeschlossen. Benötigt werden sichtbare Zustände für „nicht gefunden“, „kein Zugriff“, „offline“ und „Speichern fehlgeschlagen“ sowie direkte ID-Abfragen und Pagination.

**F19 – Marketing überzeichnet einzelne Fähigkeiten.** Landingpage bewirbt gemeinsame Teamvoreinstellungen, während `UserDefaults` lokal im Browser gespeichert werden und ein Team-/Rollenmodell nicht gefunden wurde. „Demo starten“ führt zur Anmeldung. „Vollständige Kosten- und Steueranalyse“ ist zu weit für die dokumentierten Vereinfachungen. Besser konkrete, prüfbare Aussagen statt „alle Szenarien abgedeckt“.

**F20 – Datenschutzkommunikation benötigt Konfigurationsabgleich.** Sentry-Tracing ist bei gesetztem DSN aktiv; das Löschen von `event.user` allein belegt keine vollständige Entfernung personenbezogener Daten aus allen Ereignissen. Frankfurt als Datenbankregion ist nicht gleichbedeutend mit ausschließlich europäischer Verarbeitung aller Dienste. Keine Rechtsverletzung festgestellt; tatsächliche Konfiguration, Verträge und Text müssen zusammen geprüft werden.

**F21 – Testabdeckung deckt noch keinen Beratungsabschluss ab.** Sechs Unit-Testdateien, aber keine nachgewiesenen durchgängigen Auth-, Abrechnungs-, RLS-, Speichern/Wiederöffnen- oder PDF-Tests. `api/` ist nicht in den gelesenen TypeScript-Projekt-Includes enthalten. API-Typecheck und wenige aussagekräftige End-to-End-Tests sind wichtiger als viele weitere rein interne Rechentests.

**F22 – Export ist eine Bildschirmaufnahme, kein eigenständiger Reportdatensatz.** Der PDF-Code verändert temporär DOM-Layout und rendert sichtbare Abschnitte auf eine einzelne PDF-Seite mit variabler Höhe. Das kann funktionieren, muss aber für lange Tabellen, kleine Fenster, Logos und Druck auf A4 geprüft werden. Ein unveränderlicher Report aus einem gespeicherten Berechnungssnapshot wäre zuverlässiger. Im Browserdialog sind die Eingaben standardmäßig nicht ausgewählt. Der Exportversuch schloss den Dialog ohne sichtbare Fehlermeldung; im automatisierten Browser war danach weder ein Download noch ein PDF-Tab auffindbar. Der Code versucht zuerst ein Blob-Popup und erst bei blockiertem Popup einen Download. Damit ist der Export in dieser Browserumgebung nicht bestätigt; das beweist noch keinen allgemeinen Exportfehler. Eine visuelle Prüfung der erzeugten PDF war mangels zugänglicher Datei nicht möglich.

### Ergänzung: tatsächlicher Browser-Test

Der synthetische Datensatz `AUDIT-2026-09-28-Testfall` wurde im Testkonto gespeichert und bleibt für die Nachprüfung erhalten. 200 €/Monat, 25 Jahre, 5 % Rendite; LV 2.000 € Abschlusskosten, 6 €/Monat Verwaltung und 0,3 % TER; Depot 0,5 % TER plus 0,25 % Depotkosten. Ergebnis: 60.000 € Beiträge; LV brutto 103.088 €, netto 99.224 €; Depot brutto 104.917 €, netto 96.624 €. Netto-Kacheln, Chart-Endwerte und Tabelle stimmen für diesen Fall überein. Neuladen ruft denselben Fall erfolgreich wieder auf. Das bestätigt den grundlegenden Speichern-/Laden-Ablauf, nicht die Isolation zwischen zwei Nutzern. Screenshot: `audit-testfall-2026-09-28.png` neben diesem Bericht.

Weitere Browserbefunde:

- AVD-Beispiel mit 150 €/Monat, Start 2027, Geburtsjahr 1985, 5 % Rendite und Auszahlung 67–85: 571 € Nettoleistung neben 305 € Depotentnahme. Die unterschiedlichen Berechnungsgrundlagen aus F01 sind somit unmittelbar im UI wirksam. Die Zahlen sind beobachtete Modellausgaben, keine validierte Empfehlung.
- Zweiter gespeicherter Testfall `AUDIT-2026-09-28-Rentenbeginn`: Geburtsjahr 1959, Renteneintritt 67 im Jahr 2026, 3.000 € Bedarf, 1.500 € Rente, 20.000 € Kapital, 5 % Rendite. Das UI zeigt 248.309 € Kapitalbedarf und 228.309 € verbleibende Lücke, zugleich **„Empfohlene Sparrate 0 €/Monat“**. F15 ist damit praktisch reproduziert. Diese falsche Handlungsaussage sollte wie P1 behandelt werden. Korrekt wäre ein Hinweis auf fehlende Ansparzeit und eine gesonderte Sofortkapital-/Entnahmebetrachtung.
- Entnahmeplan mit 100.000 € Startkapital und −5 % Rendite: Jahr 0 fällt auf 95.000 €, Jahr 1 nach 12.000 € Entnahme auf 78.850 €. Die Spalte „Wachstum“ zeigt jeweils einen Strich statt des Verlusts. Verlustdarstellung aus F15 bestätigt. Die Oberfläche erklärt immerhin ausdrücklich Jahr 0 ohne Entnahme und die Schlussentnahme. Nach dem Test wurden manuelles Kapital und Rendite auf ihre vorherigen lokalen Werte zurückgesetzt.
- In AVD und Rentenlücke haben viele Zahlenfelder im Accessibility-Baum keine Namen, obwohl sichtbare Beschriftungen vorhanden sind. Die Labels sollten über `htmlFor`/`id` oder `aria-labelledby` zugeordnet werden; anschließend Tastatur- und Screenreaderprüfung.

**F23 – AVD-Chart und Netto-Aussage verwenden unterschiedliche Größen. P1, im Code und Seitenkontext bestätigt.** `verlaufsdaten` nutzt beim AVD `kapitalGesamt`, beim Depot das laufende Kapital nach Vorabsteuer, aber vor Schlussbesteuerung. Direkt unter dem Chart steht „Beide Seiten nach Steuern“, während die Waage darüber Nachsteuer-Endwerte nutzt. Abhilfe: Diagramm eindeutig als Ansparvermögen vor Auszahlungs-/Veräußerungssteuer kennzeichnen oder eine fachlich definierte Netto-Serie verwenden. Abnahme: Beschriftung, Tooltip, Schlusswert und Waage sind konsistent; insbesondere keine steuerlich frei verfügbare AVD-Kapitalauszahlung suggerieren.

## Konkretes Umsetzungsbacklog

| Reihenfolge | Arbeitspaket | Fertig, wenn |
|---|---|---|
| 1 | Vergleichsvertrag festlegen: gleiche Budgets, Zeitpunkte, Renditen und Endzustände | Alle Module benennen Brutto/Netto, Garantie/Projektion und Kostenquelle eindeutig; F01/F23 verschwinden |
| 2 | Rechenkern korrigieren und Referenzfälle absichern | F03/F04/F05/F07 sowie Rentenbeginn-Grenzfall fachlich geprüft; Tests beruhen auf unabhängigen Sollwerten |
| 3 | Cloud- und Abrechnungsschutz nachweisen | Zwei-Nutzer-RLS-Test, abgelaufener Trial, fehlerhafter/redundanter Webhook und Restore geprüft |
| 4 | Einheitlichen Beratungsfall mit Varianten einführen | Eingaben, Annahmen und Modellversion bleiben beim Wiederöffnen unverändert; Neubewertung erstellt eine neue Version |
| 5 | Kernstrecke und Report vereinfachen | Beispiel ohne Anmeldung erreichbar; erster Vergleich ohne Hilfe; Pflichtannahmen im Export; A4-Druck und Download geprüft |
| 6 | Pilot gegen bisheriges Werkzeug messen | Zeitgewinn, wiederholte Nutzung und konkrete Zahlungsentscheidung statt bloßer positiver Rückmeldung vorliegen |

Die Reihenfolge priorisiert Ergebnisvertrauen vor Wachstum. Konkrete Zeit-/Kostenabschätzungen sollten erst nach Fachentscheidung zum Modell und Einsicht in das Cloudschema erfolgen.

## Mitbewerber und Ersatzlösungen

Recherchiert am 28.09.2026. Preise sind öffentlich beworbene Konditionen, keine verbindlichen Angebote. Funktionen wurden überwiegend anhand der Anbieterbeschreibung, nicht durch vollständige Bedienung überprüft. Behauptete steuerliche Genauigkeit oder rechtliche Konformität wird hier nicht bestätigt.

| Lösung | Nähe / beworbener Schwerpunkt | Öffentlich sichtbarer Preis | Konsequenz für Vorsorgewaage |
|---|---|---|---|
| [fonder](https://www.fonder-vergleiche.de/) | Sehr direkt: Police, Depot, Rürup, AVD, Tarifkosten, Entnahme, Kundenprofile, PDF und PDF-Kostenextraktion | 49,90 € netto/Monat; 14 Tage Test | Größter unmittelbarer Funktions- und Preisdruck. Weitere Rechner allein schaffen keinen Vorsprung. |
| [Patina Charts](https://patinacharts.de/) | Sehr direkt, iPad: Depot/Police, hinterlegte Tarife, Stressszenarien, lokale Mandanten und PDF | 49 € inkl. MwSt./Monat oder 490 €/Jahr | Gute Eingabegeschwindigkeit und sichtbare Annahmen sind bereits Wettbewerbsversprechen. Plattformübergreifender Browserzugang bleibt für dich relevant. |
| [IVFP Plattform](https://plattform.ivfp.de/) | Beratung und Tarifvergleich über fairadvisor.net/fairgleichen.net | Aktuelle vollständige Preisstaffel nicht belastbar ermittelt | Breite Beratung und fachliche Herkunft sind starke Alternativen; nicht versuchen, diese komplette Plattform im MVP nachzubauen. |
| [finexpert](https://www.finexpert.de/) | Breiter: Datenaufnahme, Schichtenvergleich, Dokumentation, Onlineberatung, Kundenverwaltung und Integrationen | Standard 79,90 € brutto/Monat; Partner 69,90 € | Bei 59 € muss dein engerer Anwendungsfall spürbar schneller oder verständlicher sein. |
| [fb>xpert](https://www.fb-research.de/faq-fb-xpert/) | Angrenzend: Tarif-/Leistungsvergleich, Profile, Dokumentation und Antrag | Hier kein direkter Listenpreis verifiziert | Eher ergänzen als ersetzen: Berechnungsergebnis gut als Anlage zu vorhandener Dokumentation exportieren. |
| [cashflowctrl](https://cashflowctrl.de/rechner/huelle) | Öffentlich nutzbarer Depot-/Policenrechner mit offengelegter Methodik | Kein Preis auf der untersuchten Rechnerseite festgestellt | Reine Rechenfunktion wird austauschbarer. Bezahlt wird für den gesamten wiederholbaren Arbeitsablauf. |

Historischer weiterer Vergleichspunkt: [eLIGA](https://www.eliga-online.de/landing/) und ältere dort veröffentlichte Kostenvergleichsunterlagen. Aktueller Funktions-/Vertriebsstand und Preise ließen sich nicht ausreichend verifizieren; daher kein belastbares aktuelles Ranking.

Eigene Excel-Dateien sowie Rechner von Versicherern und Pools sind zusätzliche Ersatzlösungen. Diese Kategorie wurde qualitativ einbezogen, nicht als angeblich einheitliches Produkt bewertet. Entscheidend ist, welche davon deine Piloten wirklich nutzen.

### Preisbewertung

59 € monatlicher Endpreis liegen ungefähr bei fonder, wenn dessen 49,90 € netto um 19 % Umsatzsteuer ergänzt werden: rechnerisch 59,38 €. Das ist nur eine Vergleichsnormalisierung, keine Aussage zur individuellen Vorsteuerbehandlung. Gegen Patina liegt dein Endpreis höher, gegen finexpert niedriger. Vorsorgewaage ist damit preislich keine offensichtliche Billiglösung.

Empfehlung: Preis nicht reflexartig senken. Bei Piloten zuerst messen, ob ein wiederholter Beratungsfall bezahlt erledigt wird und wie viel Zeit tatsächlich eingespart wird. Ein frei zugänglicher Beispielfall kann Akquise erleichtern; individuelle Speicherung, Varianten und Export bilden den bezahlten Nutzen. Ein bloßes Limit von drei Berechnungen kann Szenarioexperimente erschweren.

## Empfohlener MVP

**Produktversprechen:** „In wenigen Minuten ein nachvollziehbarer Depot-/Policenvergleich – mit gleichen Annahmen, sichtbaren Kosten und einer später reproduzierbaren Auswertung.“ Die Zeitangabe ist ein Zielwert und muss im Pilot belegt werden.

### Muss enthalten

1. Ein geführter Fall: Ziel und Laufzeit → Sparrate oder Einmalanlage → belegte Kosten → Steuerannahmen → Vergleich → Speichern/PDF.
2. Gemeinsame Budget- und Zahlungsstrombasis, klar definierte Kostenarten, keine stillen Modellwechsel.
3. Netto-/Brutto-Ergebnis und drei deterministische Renditeszenarien; Annahmen und Grenzen im Ergebnis und PDF.
4. Vollständige Speicherung der Eingaben, Ergebniswerte, Bewertungsdatum, Modell-/Rechtsversion und Kostenquelle; wieder öffnen und als neue Variante kopieren.
5. Einfache Erklärung: Welche Kosten-, Steuer- und Laufzeitannahme verursacht den Unterschied? Ab welchem Wert kippt das Ergebnis?
6. Zuverlässiger PDF-Export mit Beraterbranding, Fallkennung, Annahmen und Quellenstand.
7. Nachgewiesene Benutzertrennung, funktionierender Trial-Ablauf, Wiederherstellung und klare Fehlerzustände.

### Zunächst begrenzen

BestAdvice nicht als vollständige Kündigungs-/Wechselempfehlung positionieren. AVD als Pilot/Beta behandeln, bis die Vergleichs- und Auszahlungsbefunde behoben sind. Rentenlücke kann ein Einstieg sein, muss aber sauber als vereinfachte Planung beschriftet werden. Bestehende Pilotfunktionen nicht kommentarlos entfernen; Nutzung messen und begründete Übergänge anbieten.

Kein eigenes Voll-CRM, kein breiter bAV-/BU-/Immobilienausbau, keine automatische KI-Empfehlung und keine große Tarifdatenbank als erste Maßnahme. Eine gepflegte Tarifdatenbank hat laufende fachliche und operative Kosten. Zunächst manuelle, nachvollziehbare Kostenaufnahme mit Quelle und Datum.

## Sinnvolle Erweiterungen nach Nutzen

| Priorität | Erweiterung | Begründung / Abnahme |
|---|---|---|
| Jetzt | Vergleich bei gleichem Nettoaufwand und Honorar-Cashflow | Voraussetzung für glaubwürdige Ergebnisunterschiede |
| Jetzt | Fallversionen und Variantenvergleich | Wiederaufnahme ohne neue Eingabe; altes PDF bleibt reproduzierbar |
| Als Nächstes | Kipp-Punkt-Analyse für Kosten, Laufzeit und Steuersatz | Zeigt, wie robust ein Vorteil ist; Pilotkunde kann Ergebnis erklären |
| Als Nächstes | Gemeinsame Entnahme-Engine | Verbindung zwischen Endkapital und tatsächlichem Ruhestandseinkommen |
| Nach Pilotnachweis | Beitragsfreistellung, früher Ausstieg, Crash kurz vor Entnahme | Realistische Beratungsfragen; zunächst deterministische Stressfälle |
| Nach Pilotnachweis | Angebots-PDF als Eingabehilfe | Nur Extraktion mit Seitenbeleg und menschlicher Bestätigung; kein ungeprüftes automatisches Übernehmen |
| Später | Teamvorlagen, Rollen, Integrationen | Erst bauen, wenn konkrete Pilotbüros dafür Bedarf und Zahlungsbereitschaft zeigen |
| Später | Monte-Carlo | Erst wenn Modelle validiert und Wahrscheinlichkeiten verständlich erklärt werden können |

PDF-Import und AVD sind bereits bei Wettbewerbern beworben; sie sind keine automatisch einzigartige Innovation. Eine nachprüfbare Quellenkette und saubere Variantenhistorie könnten den Unterschied machen, müssen aber im direkten Pilotvergleich überzeugen.

## Umsetzungsfolge und Abnahmekriterien

**Phase A – Vertrauensbasis:** F01–F12 bearbeiten, Cloudschema prüfen, unabhängige Referenzfälle definieren. Ergebnis: keine widersprüchlichen Charts/Kacheln, keine negativen Kosten, kein abgelaufener Premiumgrant, keine als erfolgreich quittierten Datenbankfehler. Fachliche Prüfung der AVD-Auszahlung gesondert abschließen.

**Phase B – MVP-Arbeitsablauf:** geführter Kernvergleich, vollständige Fallversionen, drei Szenarien, zuverlässiger Report, echte Beispiel-Demo. Ergebnis: ein Pilot kann ohne Entwicklerhilfe einen Fall anlegen, variieren, exportieren und später wieder öffnen.

**Phase C – Pilotmessung:** vorgeschlagener Versuch mit 5–10 aktiven Beratern und mehreren realistischen Fällen je Berater, nur mit geeigneten Test-/pseudonymisierten Daten. Zuerst gegen deren bisheriges Werkzeug messen, anschließend Zahlungsbereitschaft testen.

Vorgeschlagene Entscheidungsschwellen, keine Marktbenchmarks: mindestens 80 % schließen den Kernfall ohne Hilfe ab; Median bis zum ersten brauchbaren Vergleich unter fünf Minuten; kein ungeklärter fachlicher Widerspruch in Referenzfällen; mindestens die Hälfte nutzt das Werkzeug nach zwei bis vier Wochen erneut; mehrere Piloten entscheiden sich aktiv für eine bezahlte Fortsetzung. Bei sehr kleinen Stichproben zusätzlich konkrete Beobachtungen auswerten statt Prozentwerte zu überinterpretieren.

Messgrößen: Start → erster Vergleich → Variante → Export → Wiederöffnung; benötigte Zeit; Rückfragen; Fehler; nächster tatsächlicher Beratungseinsatz. Keine sensiblen Kundeneingaben für Produktanalytik erfassen. Abbruchgründe persönlich erfragen, nicht aus Klickzahlen erraten.

Pilotfragen: Welche Frage musste der Kunde entscheiden? Welches Tool wäre sonst genutzt worden? Welche Zahl wurde angezweifelt? Was musste außerhalb erledigt werden? Würde der Berater diesen konkreten Arbeitsablauf zu 59 € monatlich weiter nutzen?

## Reproduzierbare Rechenproben

Aus dem Projektverzeichnis: `node docs/audit-probes-2026-09-28.mjs`.

Die Datei lädt die vorhandene Engine über Vite, ohne Kundendaten oder Cloud-Schreibzugriffe. Sie demonstriert RIY-Abweichung, Kostenaufteilungssprung (bei 1.000 € Modellkosten von 600/400 bei fünf Jahren auf 950/50 bei sechs Jahren), negatives Kapital/negative Fondskosten und die reine Zeitwertillustration des Honorars. Diese Proben ersetzen keine vollständige fachliche Testmatrix.

## Quellen und fachlicher Prüfrahmen

Die [BMF-FAQ zur Reform](https://www.bundesfinanzministerium.de/Content/DE/FAQ/reform-der-privaten-altersvorsorge.html) bestätigt wesentliche Eckwerte wie maximal 540 € Grundzulage, 1.800 € geförderten Eigenbeitrag und grundsätzlich 65–70 Jahre für den Auszahlungsbeginn. Das spricht für eine brauchbare Ausgangsbasis der AVD-Konfiguration, validiert aber nicht jede steuerliche Detailformel. Weitere verwendete Primärquellen: [§ 22 EStG](https://www.gesetze-im-internet.de/estg/__22.html), [§ 18 InvStG](https://www.gesetze-im-internet.de/invstg_2018/__18.html), [PIA-Effektivkosten](https://produktinformationsstelle.de/effektivkosten/). Wettbewerbsquellen stehen direkt in der Tabelle.

Offen für einen vollständigen Release-Audit: eingeloggter Praxistest, PDFs aus allen relevanten Fällen, Cloud-RLS und Migrationen, Stripe-Testmodus mit wiederholten/verspäteten Events, Wiederherstellung aus Backup und fachlich unabhängige Referenzrechnungen. Die vorliegende Prüfung ist eine belastbare Priorisierung und konkrete Fehleranalyse, keine pauschale Freigabe aller Funktionen.
