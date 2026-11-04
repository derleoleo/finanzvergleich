---
titel: Rentenlücke berechnen: Methode, Annahmen, Grenzen
beschreibung: Wie aus Bedarf, gesetzlicher Rente und Inflation eine belastbare Lücke wird — und welche zwei Fehler die Zahl regelmäßig zu klein machen.
datum: 2026-11-04
---

Eine Rentenlücke auszurechnen ist keine Kunst. Sie **belastbar** auszurechnen
schon: Zwei Fehler machen die Zahl regelmäßig zu klein, und beide sehen auf
den ersten Blick wie Sorgfalt aus.

Diese Seite zeigt den Rechenweg an einem durchgerechneten Fall, benennt die
beiden Fehler und sagt, wo die Rechnung aufhört.

## Der Fall

| Angabe | Wert |
| --- | --- |
| Geburtsjahr | 1975 (heute 51) |
| Renteneintritt | mit 67 |
| Geplantes Ende der Entnahme | mit 90 |
| Gewünschtes Einkommen | 2.800 € im Monat, heutige Kaufkraft |
| Gesetzliche Rente laut Renteninformation | 1.600 € brutto |
| Abzüge darauf | 11 % |
| Betriebliche Altersversorgung | 250 € im Monat |
| Inflation | 2 % p. a. |
| Rendite in der Ansparphase | 5 % p. a. |

## Das Ergebnis

| | Wert |
| --- | --- |
| Anrechenbare Einnahmen | 1.674 € im Monat |
| Lücke in heutiger Kaufkraft | 1.126 € im Monat |
| Lücke zum Rentenbeginn | 1.546 € im Monat |
| Entnahmedauer | 276 Monate |
| Benötigtes Kapital bei Rentenbeginn | 311.003 € |
| Nötige Sparrate über 16 Jahre | 1.071 € im Monat |

<figure>
  <img src="/screenshots/produkt-rentenluecke.png" alt="Der Rentenlücken-Rechner mit den Feldern für Bedarf, gesetzliche Rente und Abzüge" loading="lazy" width="960" height="600">
  <figcaption>Der Abzug auf die gesetzliche Rente steht als eigenes Feld und ist auf 0 vorbelegt — eine Pauschale wäre eine Behauptung über einen Fall, den der Rechner nicht kennt.</figcaption>
</figure>

## Der erste Fehler: die Renteninformation ist brutto

Die 1.600 € aus der Renteninformation der Deutschen Rentenversicherung sind
ein **Bruttobetrag**. Davon gehen Beiträge zur Kranken- und Pflegeversicherung
der Rentner ab, und je nach Lage auch Steuer. Wer die Zahl ungeprüft als
verfügbares Einkommen einsetzt, rechnet mit einem Netto, das es nicht gibt.

Im Fall oben sind 11 % abgezogen — aus 1.600 € werden 1.424 €. Das sind
176 € im Monat, die sonst in der Lücke fehlen würden, und über 276
Entnahmemonate macht das einen erheblichen Teil des Kapitalbedarfs aus.

Der Rechner führt den Abzug deshalb als **eigenes Feld** und setzt ihn
bewusst auf 0 vor: Eine voreingestellte Pauschale wäre eine Behauptung über
einen Einzelfall, den sie nicht kennt. Die Zahl gehört geschätzt und im
Gespräch begründet, nicht stillschweigend gesetzt.

## Der zweite Fehler: zwei Kaufkraftbegriffe vermischen

„1.126 €" und „1.546 €" sind dieselbe Lücke. Die erste Zahl steht in
**heutiger Kaufkraft**, die zweite in Euro **zum Rentenbeginn**. Zwischen
beiden liegen sechzehn Jahre Inflation.

Beide Zahlen sind richtig, und beide beantworten eine andere Frage:

- *„Was fehlt mir, gemessen an dem, was ich heute brauche?"* — das ist die
  Zahl in heutiger Kaufkraft. Sie ist für das Gespräch die ehrlichere, weil
  der Mandant sie einordnen kann.
- *„Welcher Betrag muss in sechzehn Jahren tatsächlich fließen?"* — das ist
  die Zahl zum Rentenbeginn. Sie ist die, aus der der Kapitalbedarf folgt.

Der Rechner weist **beide** aus und lässt umschalten, auf welcher Grundlage
die Einnahmen eingegeben werden. Das ist kein Komfort, sondern der Kern der
Sache: Wer den Bedarf hochrechnet, die Einnahmen aber als feste Beträge
stehen lässt, rechnet die Lücke zu groß. Wer beides in heutiger Kaufkraft
lässt und am Ende hochrechnet, bekommt eine andere Zahl. Welche Konvention
gilt, muss entschieden und festgehalten werden — nicht dem Zufall der
Eingabe überlassen.

## Was der Rechner abbildet

- Gesetzliche Rente, betriebliche Altersversorgung, Basisrente und
  Mieteinnahmen als getrennte Posten.
- Einen prozentualen Abzug auf die gesetzliche Rente, frei einstellbar.
- Zwei Konventionen für die Einnahmen: heutige Kaufkraft oder Rentenbeginn.
- Inflation über die Jahre bis zum Rentenbeginn und, für den Kapitalbedarf,
  über die Entnahmedauer.
- Bereits vorhandenes Kapital, fortgeschrieben bis zum Rentenbeginn.
- Die nötige Sparrate, die aus der verbleibenden Lücke folgt.

## Wo die Grenzen liegen

**Die Entnahmedauer ist eine Annahme, keine Lebenserwartung.** Wer bis 90
rechnet und 94 wird, hat vier Jahre ohne Deckung. Die Zahl gehört bewusst
gesetzt und im Gespräch angesprochen.

**Die Inflation ist ein einziger Satz über vierzig Jahre.** Das ist eine
grobe Vereinfachung — aber jede feinere Annahme wäre eine Scheingenauigkeit,
die niemand belegen kann.

**Keine Steuer auf die Entnahme.** Die Rechnung ermittelt den Kapitalbedarf
vor Steuern. Wie die Entnahme später besteuert wird, hängt am Produkt und
gehört in den Entnahmeplan, nicht in die Lückenrechnung.

**Keine Dynamik der gesetzlichen Rente.** Rentenanpassungen sind nicht
abgebildet. Das rechnet die Lücke tendenziell zu groß — die bewusste
Gegenrichtung zu den Abzügen, die sie zu klein rechnen würden.

## Selbst nachrechnen

Der Rentenlücken-Rechner ist Teil des Premium-Plans. Was er und die übrigen
fünf Rechner im Einzelnen können, steht auf der Seite
[Was die Rechner können](/was-die-rechner-koennen); wie ein durchgerechneter
Fall aussieht, zeigt der [Beispielfall](/beispiel) ohne Anmeldung.

Wie aus dem ermittelten Kapital später eine Entnahme wird, steht unter
[Entnahmeplan rechnen](/entnahmeplan-rechner).
