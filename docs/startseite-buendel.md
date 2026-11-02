# Das Bündel der Startseite: gemessen, und was daraus folgt

Stand 02.11.2026. Alle Zahlen aus `npm run build` und dem erzeugten `dist/`,
nicht geschätzt.

> **Ergebnis: der kritische Pfad der Startseite ist von 200,3 kB auf 92,4 kB
> gzip gefallen — 54 % weniger.** (200,3 → 137,0 durch Supabase, 137,0 → 92,4
> durch Sentry.) Weg B ist umgesetzt (siehe unten), die
> Aufteilung in eigene Stücke ebenfalls. Festgehalten durch einen E2E-Test:
> „Supabase liegt nicht im kritischen Pfad der Startseite".

## Korrektur: wie hier gemessen werden muss

Die erste Fassung dieses Dokuments nannte 566,0 → 321,1 kB roh und
159,9 → 97,0 kB gzip. **Beide Seiten waren zu niedrig**, weil ohne
`VITE_SENTRY_DSN` gebaut wurde. Die Variable steht in `main.tsx` in einer
Bedingung:

```ts
if (import.meta.env.VITE_SENTRY_DSN) { Sentry.init({ … }) }
```

Fehlt sie, setzt Vite `undefined` ein, der Zweig ist statisch falsch, und
Rollup wirft `Sentry.init` samt Integrationen weg. Das Sentry-Stück ist dann
5,3 kB gzip statt 45,1 kB — ein Unterschied von 40 kB, der in einem lokalen
Bau unsichtbar bleibt.

**Wer das Bündel messen will, muss die Variable setzen:**

```bash
VITE_SENTRY_DSN="https://beispiel@o0.ingest.sentry.io/0" npx vite build
```

Gegengeprüft an der Produktionsseite: Dort überträgt der kritische Pfad
138,6 kB, und das Sentry-Stück trägt denselben Hash wie der lokale Bau mit
Variable (`sentry-DjYlbBx1.js`). Der lokale Bau ohne Variable beschreibt die
Produktion also nicht.

| gemessen mit DSN | roh | gzip |
|---|---|---|
| vorher (`f4e9109`) | 683,0 kB | 200,3 kB |
| nachher | — | **137,0 kB** |
| live auf www.vorsorgewaage.de | — | 138,6 kB |

## Wie gemessen wurde

`vite build --sourcemap`, dann die Sourcemap des Eintrittsbündels auf
**minifizierte** Bytes umgerechnet (Mappings dekodiert, je Segment die
erzeugten Bytes dem Quellmodul zugeordnet). Quellbytes allein hätten getäuscht:
Sie enthalten Kommentare und Typen und überschätzen große Pakete.

## Woraus die 512 kB bestanden

| Anteil | Paket |
|---|---|
| 176,6 kB (34,8 %) | `react-dom` |
| 102,0 kB (20,1 %) | `@supabase/auth-js` |
| 38,2 kB (7,5 %) | `react-router` |
| 32,0 kB (6,3 %) | `@supabase/realtime-js` |
| 25,3 kB (5,0 %) | `@supabase/phoenix` |
| 22,5 kB (4,4 %) | `@supabase/storage-js` |
| 17,1 kB (3,4 %) | `@supabase/postgrest-js` |
| 12,9 kB (2,5 %) | `@sentry/core` |
| 11,0 kB (2,2 %) | `@supabase/supabase-js` |
| ~40 kB | eigener Code (`src/*`) |

**`@supabase/*` zusammen: 212,7 kB, also 41,9 %** — mehr als `react-dom`.

Zur Zeile `@sentry/core`: Die 12,9 kB stammen aus einem Bau **ohne**
`VITE_SENTRY_DSN` und sind für die Produktion zu niedrig (siehe Korrektur
oben). Mit Variable sind es 45,1 kB gzip — nach `react` der zweitgrößte Posten
im kritischen Pfad. Die Schlussfolgerung der ersten Fassung, Sentry sei zu
klein, um sich damit zu befassen, war damit falsch; der Punkt steht jetzt
unter „Was als Nächstes möglich wäre".

## Der eigentliche Fund: 82,6 kB werden nie benutzt

Geprüft über die ganze Quelle (`src`, `api`):

| Teilclient | Größe | Fundstellen im Code |
|---|---|---|
| `realtime-js` + `phoenix` | 57,3 kB | **0** |
| `storage-js` | 22,5 kB | **0** |
| `functions-js` | 2,8 kB | **0** |

Kein `channel()`, kein `removeChannel()`, kein `.storage`, kein
`functions.invoke`. Das Projekt nutzt von Supabase nur Anmeldung (`auth`) und
Tabellenzugriff (`from`). Trotzdem liegen die drei im Bündel: `createClient`
baut in `supabase-js` alle Teilclients auf, die Importe sind statisch, und
damit kann Rollup nichts wegwerfen.

## Was in diesem Durchgang gemacht wurde — und was es *nicht* ist

Die Fremdpakete sind jetzt eigene Stücke (`manualChunks` in `vite.config.ts`):

```
vorher   index          512,4 kB   (eine Datei, Warnung „larger than 500 kB")
nachher  react          188,6 kB
         supabase       218,2 kB
         router          38,1 kB
         sentry          15,4 kB
         index           51,3 kB
```

**Ehrlich gerechnet ist das keine Verkleinerung des ersten Ladens:**

| | roh | gzip |
|---|---|---|
| vorher | 566,0 kB | 159,9 kB |
| nachher | 565,3 kB | **160,8 kB** |

Beim ersten Besuch lädt der Browser dieselbe Menge, gzip sogar **0,9 kB mehr** —
mehrere kleine Dateien komprimieren schlechter als eine große.

Der Gewinn liegt woanders: Bisher machte eine geänderte Zeile Anwendungscode
die ganzen 512 kB im Zwischenspeicher ungültig. Jetzt nur noch die 51 kB, in
denen die Änderung steckt. Für Berater, die das Werkzeug regelmäßig benutzen —
also für die zahlenden Nutzer — sind das bei jedem Deployment rund 460 kB, die
nicht neu geladen werden. Für den einmaligen Besucher aus der Suche kostet es
0,9 kB. Diese Abwägung ist bewusst so getroffen und nicht aus Versehen.

Nebenbei verschwindet die 500-kB-Warnung — weil das größte Stück wirklich
kleiner ist, nicht weil die Schwelle hochgesetzt wurde.

## Die zwei Wege, die wirklich verkleinern — beide zu entscheiden

### A — `supabase-js` ersetzen durch `auth-js` + `postgrest-js`

**Gewinn: 82,6 kB weniger im ersten Laden** (die nie benutzten Teilclients).
Die 31 Aufrufstellen in 17 Dateien bleiben unberührt, wenn eine kleine Fassade
`.auth` und `.from()` weiterreicht.

**Risiko: mittel, und es liegt an einer unangenehmen Stelle.** `supabase-js`
verdrahtet das Zugangstoken aus `auth-js` in die PostgREST-Kopfzeilen und zieht
es bei Ablauf nach. Diese Verdrahtung selbst zu schreiben heißt, an dem Faden
zu ziehen, an dem der Zugriffsschutz der Datenbank (RLS) hängt. Fällt sie
still aus, sehen Nutzer fremde oder keine Daten. Die E2E-Reihe mit Anmeldung
(`npm run test:e2e:angemeldet`) würde das abdecken, aber nicht garantieren.

Billigere Zwischenstufe: `@supabase/realtime-js` per `resolve.alias` auf ein
leeres Modul legen (−57,3 kB) und alles andere lassen. Spart weniger, rührt
die Token-Verdrahtung nicht an — hängt aber davon ab, dass `supabase-js` den
Realtime-Client nur anlegt und nie benutzt. Das ist heute so und kann sich mit
jeder Nebenfassung ändern, ohne dass es auffällt.

### B — Öffentliche Seiten rendern, ohne auf die Anmeldung zu warten ← **umgesetzt**

`SmartRoot` und `SmartPricing` gaben `null` zurück, solange `loading` wahr war.
Für einen Besucher aus der Suche hieß das: Erst mussten 212 kB Supabase geladen
**und ausgeführt** sein, bevor überhaupt etwas erschien.

Das Flackern, wegen dem dort `null` stand, musste dabei nicht in Kauf genommen
werden. `src/utils/vielleichtAngemeldet.ts` beantwortet synchron und ohne eine
Zeile Supabase-Code, ob im Browser überhaupt eine Sitzung liegen *kann* —
Supabase legt sie unter `sb-<kennung>-auth-token` in `localStorage` ab. Ist
keiner da, erscheint die öffentliche Seite sofort; ist einer da, wird wie
bisher gewartet. **Für Angemeldete ändert sich nichts.**

Damit Supabase wirklich aus dem Eintritt verschwindet, musste jeder statische
Weg dorthin weg (`src/lib/supabaseLaden.ts` holt den Client per `import()`):

| Modul | vorher | jetzt |
|---|---|---|
| `contexts/AuthContext` | statisch | nachgeladen im Effekt |
| `contexts/SubscriptionContext` | statisch | nachgeladen beim Laden der Daten |
| `Layout`, `components/ConsentGate` | statisch in `App.tsx` | `lazy()` |
| `utils/migrateLocalData` | statisch in `AuthContext` | `import()` an der Aufrufstelle |

Der letzte war der unauffälligste und fiel erst beim Nachmessen auf:
`migrateLocalData` hängt über fünf Entitäten am Client und hielt allein die
ganzen 212,7 kB im kritischen Pfad, obwohl es nur direkt nach einer Anmeldung
läuft.

Gemessen mit `VITE_SENTRY_DSN` wie in der Produktion: **200,3 → 137,0 kB
gzip.** (Ohne die Variable, wie die erste Fassung dieses Dokuments:
159,9 → 97,0 kB gzip — dieselbe Richtung, aber beide Seiten zu niedrig.)

**Was das ausdrücklich nicht heißt:** dass ein Gast Supabase nie lädt. Der
Effekt in `AuthContext` holt es weiterhin kurz nach dem Mounten — nur
nebenläufig, nach dem ersten Bild. Es ganz zu unterlassen wäre der nächste
Schritt und steht unten.

## Was als Nächstes möglich wäre

**Supabase für Gäste gar nicht erst holen.** Wenn `vielleichtAngemeldet()`
false ist, könnte der Effekt in `AuthContext` die Sitzungsabfrage ganz
überspringen — der Gast lädt die 218 kB dann nie. **Haken, der es zu einer
Entscheidung macht:** Dann ist auch `onAuthStateChange` nicht angemeldet. Meldet
sich dieser Gast anschließend an, erfährt die Anwendung nichts davon, und er
bleibt nach außen abgemeldet. Reparierbar (den Lauscher beim Anmelden
nachziehen), aber das ist Chirurgie am Anmeldepfad — der Stelle, an der ein
stiller Fehler am teuersten ist.

**A nach B.** Weg A oben ist weiterhin möglich, holt nach B aber weniger: Die
82,6 kB liegen jetzt in einem Stück, das Gäste nebenläufig und Angemeldete
ohnehin laden.

**Sentry nachladen — erledigt. 137,0 → 92,4 kB gzip (−33 %).**

Der Preis schien der Haken zu sein: In dem Fenster zwischen erstem Bild und
geladenem Sentry würde nichts gemeldet — und das ist genau das Fenster, in dem
Startfehler auftreten. `src/utils/fehlermelder.ts` umgeht ihn, statt ihn
hinzunehmen: Zwei native Lauscher (`error`, `unhandledrejection`) hängen sich
synchron auf, kosten keine messbaren Bytes und legen alles in eine
Warteschlange, die abgearbeitet wird, sobald Sentry da ist. Acht Tests halten
das fest; fällt einer, ist aus der Verbesserung wieder ein Tausch geworden.

`Sentry.ErrorBoundary` in `App.tsx` war der zweite statische Import und ist
jetzt eine eigene Fehlergrenze, die über denselben Melder berichtet.

**Zwei Dinge, die dabei zu beachten sind:**

- **Namensraum-Import tötet das Wegwerfen.** `const Sentry = await
  import("@sentry/react")` materialisiert das ganze Modul; im Stück landen
  `replay`, `feedback` und `replay-canvas` — gemessen 144,1 statt 45,1 kB
  gzip. Mit benannter Destrukturierung (`const { init, captureException,
  browserTracingIntegration } = await import(…)`) sind es wieder 44,5 kB.
- **Die Transaktion für den Seitenaufbau geht verloren.**
  `browserTracingIntegration` startet erst nach dem Laden und erfasst den
  ersten Aufbau nicht mehr. Eine Entscheidung gegen die Messung der Ladezeit
  und für die Ladezeit selbst; bei `tracesSampleRate: 0.1` wurde ohnehin nur
  jeder zehnte Aufbau erfasst. Fehler sind davon nicht betroffen.

## Was nicht hilft

- **`chunkSizeWarningLimit` hochsetzen:** macht die Warnung still, nicht das Bündel klein.
- **`react-dom` austauschen:** 176,6 kB sind der Preis von React 19. Preact als
  Ersatz wäre ein Umbau der ganzen Anwendung mit Risiko in jedem Rechner.
