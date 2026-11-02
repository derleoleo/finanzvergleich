# Benennung der Startseite

Stand 03.11.2026.

## Wie sie heißt und warum

```
Title (52):       Vorsorgewaage – Beratungssoftware für Altersvorsorge
Description (145): Beratungssoftware für Altersvorsorge: Fondspolice gegen
                   Depot, Rentenlücke, Entnahmeplan, Altersvorsorgedepot
                   ab 2027. Sechs Rechner für Berater.
h1:               Die professionelle / Software für / Altersvorsorge
```

**Die Benennung ist eine Entscheidung des Betreibers, keine Ableitung aus der
Messung.** Das ist der Grund, warum dieses Dokument existiert.

Die Search Console zeigte am 02.11.2026 bei zehn Impressionen, dass
„ruhestandsplanung software" und „ruhestandsplanung rechner" zusammen vier
davon ausmachten. Daraus wurde zunächst „Vorsorgewaage – Software für
Ruhestandsplanung" — und das war ein Fehler in der Sache: Zehn Impressionen
sagen nichts darüber, als was sich ein Produkt nennt. Der Betreiber hat die
Benennung am 03.11.2026 festgelegt: **Software, Beratungstool,
Beratungsrechner, Altersvorsorgeplaner** — nicht Ruhestandsplanung.

Die Messung bleibt nützlich für die Frage, welche *Wörter* vorkommen sollten
(„software", „rechner" wurden in sechs von sieben Anfragen gesucht), nicht
für die Frage, was das Produkt *ist*.

## Warum die Marke im Title vorn steht

Der Title steht auch im Browser-Tab und im Lesezeichen, nicht nur in der
Trefferliste. Ein Vorschlag ohne Marke („Software für Altersvorsorge und
Ruhestandsplanung", 49 Zeichen) scheiterte an der E2E-Zusage
`toHaveTitle(/Vorsorgewaage/)` — zu Recht. Das `WebSite`-Markup liefert den
Seitennamen nur für die Trefferliste.

## Warum die Überschrift andere Wörter trägt als der Title

Gemessen bei 48 px Schrift in der Hero-Spalte:

| Wort | Breite | Spalte bei 1025 px Fenster |
|---|---|---|
| `Die professionelle` | 422 px | 457 px |
| `Software für` | 292 px | 457 px |
| `Altersvorsorge` | 352 px | 457 px |
| ~~`Beratungssoftware`~~ | **449 px** | **auf den Pixel zu breit** |
| ~~`Ruhestandsplanung`~~ | 471 px | zu breit |
| ~~`Altersvorsorgeplaner`~~ | 501 px | zu breit |

**Eine Schauüberschrift verträgt kein 17-Zeichen-Kompositum.** Zeichen zählen
hilft dabei nicht: „Vergleichssoftware" (18 Zeichen) passte, „Ruhestandsplanung"
(17) nicht — die Buchstaben sind breiter. Nur messen hilft.

Silbentrennung ist keine Lösung: `hyphens: auto` ändert bei diesen Wörtern
gemessen gar nichts, die Umbrüche sind mit und ohne identisch.

An den Haltepunkten zu drehen auch nicht: Zwischen 768 und 1280 px bliebe nur
rund 20 px Luft.

Deshalb trägt die Überschrift kurze Wörter, und die Benennung steht im Title,
in der Description, in den strukturierten Daten (`strukturierteDaten.ts`) und
im ersten Satz von `seiten/was-ist-vorsorgewaage.md`.

## Beim Ändern beachten

- Title ≤ 60 Zeichen, Description 81–155. `npm run seo:kopfzeilen` misst nach.
- Neue Wörter in der `h1` **im Browser messen**, nicht abschätzen.
- Der Kommentar in `index.html` wird mitausgeliefert — dort gehört ein Zeiger
  hierher, keine Prosa.
