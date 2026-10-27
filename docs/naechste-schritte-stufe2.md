# Nächste Schritte: Ratgeber und Partner

Stand 27.10.2026, 15:30. Fortschreibung des Gewinnungsplans. Stufe 1 ist live,
Stufe 2 hat angefangen.

## Wo wir stehen

**Stufe 1 — abgeschlossen und live** (Commits `87bd203` bis `892eef5`):

| Leck | Stand |
|---|---|
| `/pricing` hinter der Anmeldung | öffentlich, mit Gastrahmen |
| Kein Beispielfall | `/beispiel` rechnet live aus der Engine |
| Keine Messung | Umami Cloud, nur öffentliche Seiten |
| Empfehlung versteckt | in zwei Mails und auf der Preisseite |
| Keine strukturierten Daten | `SoftwareApplication` + `FAQPage` |
| Sitemap unvollständig | zehn Einträge |

**Stufe 2 — begonnen:** Ratgeber-Infrastruktur steht (`src/utils/ratgeber.ts`,
Plugin in `vite.config.ts`), Beitrag 1 von 4 ist geschrieben und gegen die
Engine geprüft.

## Der nächste Block (2–3 Stunden)

Reihenfolge nach Wirkung. Punkt 1 ist der eigentliche Auftrag, 2 und 3 sind
Zugabe, falls Zeit bleibt.

### 1. Beitrag 2: Riester-Bestand — wechseln oder nicht

Das Thema mit dem größten Abstand zum Wettbewerb. Die Spezifikation hält fest,
dass die Trennung von Förderregime und Produktmantel „von Vertrieben regelmäßig
falsch dargestellt" wird (`files/riester-vs-avd-vergleichsmodul.md:6`, `:26`) —
die sogenannte Kopplungsfalle.

Zu verwenden:
- `src/lib/finance/avd/riester.ts` und `berechneZulagenRiesterAlt()` in
  `zulagen.ts` (Sockelbetrag, anteilige Kürzung — die alten Regeln)
- `src/lib/finance/avd/strategien.ts` für den Vergleich
- Gerechnetes Beispiel, Tabellen wie in Beitrag 1

**Pflicht:** Ein Test nach dem Muster von
`src/lib/finance/avd/ratgeber-zahlen.test.ts`, der die Tabellen aus der
Markdown-Datei liest und gegen die Engine nachrechnet. Beitrag 1 hatte beim
ersten Lauf einen falschen Wert (52 statt 52,5 Cent) — ohne den Test wäre er
online gegangen.

**Pflicht:** Rechtsstand im Kopf der Datei, offene BMF-Fragen als Annahme
benennen. Dafür gibt es `RECHTS_FLAGS_DEFAULT` in `avd/config.ts`.

Danach: Sitemap-Eintrag ergänzen (ein Test erzwingt das), `npx tsc -b`,
`npm run lint`, `npx vitest run`, `npm run build`, `npm run test:e2e`.

### 2. Beitrag 3: Was im Todesfall bleibt

Quelle: `src/lib/finance/avd/todesfall.ts`. Rückzahlungsbetrag nach
§ 93 Abs. 1 EStG, die Ausnahmen in § 93 Abs. 1 S. 4 Buchst. a und c
(Hinterbliebenenrente, Ehegattenübertragung), Rentengarantiezeit. Neu, von
niemandem besetzt, hohe Beratungsrelevanz.

### 3. Klick auf die Handlungsaufforderung im Ratgeber zählen

Die statischen Seiten messen Besuche, aber nicht den Klick auf
„Beispielfall ansehen". Ein `onclick` mit `umami.track('ratgeber_cta')` in
`beitragSeite()` genügt. Dann zeigt die Messung, ob die Beiträge in den
Trichter führen oder nur gelesen werden — die eigentliche Frage an Stufe 2.

Der Schrittname gehört **nicht** in den `Schritt`-Typ von `messung.ts`: Der
ist für die Anwendung und seine Kürze ist Absicht.

## Danach: Stufe 3 (Partner)

Noch nicht angefangen. Vor dem ersten Kontakt zwei Dinge klären:

1. **Rechtlich.** Ein Gastbeitragsangebot per Mail an eine Redaktion ist
   Werbung im Sinne des § 7 Abs. 2 Nr. 2 UWG und braucht grundsätzlich eine
   vorherige Einwilligung — eine Impressumsadresse ist keine. Sauberer Weg:
   die **eigenen Einreichungsformulare und „Autor werden"-Seiten** der
   Fachmedien (AssCompact, Cash., procontra, Versicherungsbote). Wo ein Medium
   selbst zur Einreichung auffordert, liegt die Einladung vor. Das ist vor dem
   Versand zu prüfen, nicht danach.
2. **Inhaltlich.** Erst wenn zwei Beiträge stehen, gibt es überhaupt etwas
   anzubieten. Deshalb steht Stufe 3 hinter Stufe 2 — nicht aus Vorsicht,
   sondern weil der Gastbeitrag der Beitrag ist.

Zweiseitiges Partner-PDF (Papermark) erst danach.

## Offen auf der Seite des Betreibers

Nichts davon kann ich selbst erledigen:

- [ ] **Umami prüfen.** Realtime-Ansicht: Ein Aufruf von `/` und `/ratgeber/`
      muss erscheinen. Danach **angemeldet** durch die Rechner klicken — dort
      darf **nichts** auftauchen. Das ist die Gegenprobe zur AVV-Zusage.
- [ ] **Sitemap in der Search Console neu einreichen** (jetzt zehn Einträge,
      davon zwei Ratgeberadressen).
- [ ] **Kündigungsweg des Testkaufs prüfen**, solange die 30 Tage laufen:
      Webhook `customer.subscription.updated/deleted` → 200, Status
      `canceled`.
- [ ] **Wiederherstellungsprobe der Datenbank** einmal gegen ein
      Wegwerfprojekt (`supabase/migrations/00000000000001_…sql`).
- [ ] **Fünf Zahlen wöchentlich ablesen**: `docs/trichter-zahlen.sql` im
      SQL-Editor, Besucherzahl aus Umami daneben. Nach vier Wochen zeigt sich
      zum ersten Mal, ob der Trichter dicht ist.

## Was nicht zu tun ist

- Keine kalten Werbemails, auch nicht an Gewerbetreibende
  (§ 7 Abs. 2 Nr. 2 UWG). Die Entwürfe in `research/vorsorgewaage/` bleiben
  liegen.
- Keine Anzeigen, bevor die Messung vier Wochen Daten hat. Reichweite in einen
  Trichter zu kaufen, dessen Zahlen niemand kennt, ist die teuerste Art,
  nichts zu lernen.
- Kein zweites Build-System für den Ratgeber. Falls er einmal dreißig Seiten
  hat, ist Astro eine abgegrenzte Entscheidung — die Markdown-Dateien ziehen
  unverändert um.
