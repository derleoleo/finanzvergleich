# Das Bündel der Startseite: gemessen, und was daraus folgt

Stand 02.11.2026. Alle Zahlen aus `npm run build` und dem erzeugten `dist/`,
nicht geschätzt.

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
`@sentry/*` sind dagegen nur 16,0 kB; Sentry zu verlagern würde fast nichts
bringen und früh auftretende Fehler unsichtbar machen. Das ist damit erledigt.

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

### B — Öffentliche Seiten rendern, ohne auf die Anmeldung zu warten

`SmartRoot` und `SmartPricing` geben heute `null` zurück, solange
`loading` wahr ist (`src/App.tsx`). Für einen Besucher aus der Suche heißt
das: Erst müssen 212 kB Supabase geladen **und ausgeführt** sein, bevor
überhaupt etwas erscheint. Würden die öffentlichen Seiten sofort rendern,
könnte Supabase als eigener, später geladener Teil nachkommen — der kritische
Pfad fiele von 565 kB auf rund 350 kB.

**Das ist eine gestalterische Entscheidung, keine technische.** Ein
angemeldeter Nutzer würde auf `/` kurz die Landingpage sehen, bevor die
Übersicht erscheint. Dieses Flackern ist genau der Grund, warum dort heute
`null` steht. Man kann es abfedern (Skelett statt Umschalten, oder die
Anmeldung nur für die Kopfleiste abwarten), aber nicht wegzaubern.

## Empfehlung

B vor A. B holt mehr (−215 kB statt −82,6 kB), rührt den Zugriffsschutz nicht
an und ist jederzeit zurückzunehmen — der Preis ist sichtbar und
gestalterisch, nicht verborgen und sicherheitsrelevant. A wäre danach noch
möglich, aber mit kleinerem Gegenwert.

## Was nicht hilft

- **Sentry verlagern:** 16,0 kB, und der Preis wären unsichtbare Fehler beim Start.
- **`chunkSizeWarningLimit` hochsetzen:** macht die Warnung still, nicht das Bündel klein.
- **`react-dom` austauschen:** 176,6 kB sind der Preis von React 19. Preact als
  Ersatz wäre ein Umbau der ganzen Anwendung mit Risiko in jedem Rechner.
