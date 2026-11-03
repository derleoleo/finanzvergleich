---
titel: Was die Rechner können
kurztitel: Was die Rechner können: Funktionen und Bedienung
beschreibung: Welche Funktionen in den Rechnern stecken und wo sie sitzen: Sonderentnahmen, Umschalter, zugeklappte Abschnitte, Fassungen und Voreinstellungen.
datum: 2026-11-03
---

Die Rechner der Vorsorgewaage zeigen nicht alles auf einmal. Manches liegt
hinter einem Schalter, manches in einem zugeklappten Abschnitt, manches
erscheint erst, wenn eine andere Angabe es sinnvoll macht. Das hält die
Oberfläche ruhig — kostet aber Funktionen, wenn man nicht weiß, dass es sie
gibt.

Diese Seite nennt je Rechner das Wichtigste in einem Satz und listet
darunter, was erfahrungsgemäß übersehen wird. Sie ersetzt keine Einführung in
die Materie; sie sagt, wo welcher Knopf sitzt und was er bewirkt.

<h2 id="grundlagen">Was für alle Rechner gilt</h2>

**Entwurf ist nicht gespeichert.** Jeder Rechner merkt sich die Eingaben
laufend im Browser, damit nichts verloren geht, wenn man die Seite wechselt.
Das ist aber kein Speichern: Der Entwurf steht in keiner Ergebnisliste, liegt
nur auf diesem Gerät und verschwindet beim Abmelden. Gespeichert wird erst
über den Knopf **Speichern**.

**Jedes Speichern legt zusätzlich eine Fassung an.** Der Fall selbst wird
beim nächsten Speichern überschrieben, die Fassung nicht — sie hält Zahlen
und Kurven von damals unverändert fest. Zu finden sind Fassungen unter
**Frühere Fassungen**, einer Leiste, die erst erscheint, wenn mindestens eine
existiert. Über **Vollständig öffnen** erreicht man eine eigene Ansicht, die
nichts neu rechnet, sondern nur das Festgehaltene zeigt. Das ist die
Grundlage für ein PDF, das genau einen Beratungsstand abbildet.

**Beim Öffnen eines gespeicherten Falls stehen oben die damaligen Zahlen**,
während die Seite darunter mit den heutigen Annahmen neu rechnet. Weichen die
beiden ab, wird das angezeigt. Für die Unterlagen zählt, was dem Kunden
gezeigt wurde — das sind die Werte oben.

**Beim PDF-Export lässt sich auswählen, welche Abschnitte hineinkommen.**
Einige sind vorab abgewählt. Umgekehrt enthält das PDF Abschnitte, die am
Bildschirm zugeklappt oder ausgeblendet sind. Kopfdaten wie Name und Firma
stammen aus dem Profil, nicht aus dem Rechner.

<h2 id="sparvertrag">Fonds-Sparvertrag: Depot gegen Police</h2>

Vergleicht eine monatliche Sparrate in einer fondsgebundenen Lebens- oder
Rentenversicherung mit derselben Rate im Direktdepot, nach Kosten und
Steuern.

Leicht zu übersehen:

- Der Umschalter **Tatsächliche Kosten (€) / Effektivkosten (%)** tauscht
  nicht nur Felder aus, er wechselt das Rechenmodell. In Euro werden
  Abschlusskosten über bis zu 60 Monate gezillmert und die Verwaltung
  monatlich abgezogen; in Prozent wird eine pauschale Renditeminderung über
  die ganze Laufzeit gerechnet (PRIIPs-Logik). Im Prozentmodus gibt es
  deshalb keine Aufteilung in Abschluss- und Verwaltungskosten.
- Die **Kostenvorschau** mit Euro-Beträgen für Monat 1 bis 60 und danach gibt
  es nur im Euro-Modus.
- **Weiteren Fonds hinzufügen** gibt es getrennt für Police und Depot. Der
  gestrichelte Rahmen sieht aus wie ein Platzhalter, ist aber ein Knopf.
- Solange nur ein Fonds eingetragen ist, bleiben Fondsname, Einzelbetrag und
  Löschen unsichtbar. Erst der zweite Fonds macht die Aufteilung sichtbar.
  Neue Fonds starten mit 0 € — bis man sie verteilt, weicht die Summe ab, und
  der Rechner weist darauf hin, ohne zu blockieren.
- **Real** rechnet die Kurven in heutige Kaufkraft um, mit dem Inflationssatz
  aus den Voreinstellungen. **Szenarien** legt ein Band bei Rendite plus und
  minus zwei Prozentpunkten darüber — eine Spannweite, keine
  Wahrscheinlichkeit.
- Auf der Auswertung sind die Eingaben weiter bearbeitbar.
  **Neu berechnen & speichern** überschreibt den Fall und legt eine weitere
  Fassung an.

<h2 id="einmalanlage">Einmalanlage</h2>

Derselbe Vergleich für einen Einmalbetrag statt einer Sparrate.

Leicht zu übersehen:

- Der Umschalter **Monatliche Anlage / Einmalige Anlage** ist Navigation,
  kein Formularschalter: Er wechselt den Rechner und lässt die Eingaben
  zurück.
- Die Abschlusskosten wirken hier anders — sie werden einmalig vom
  Einmalbetrag abgezogen statt über 60 Monate verteilt. Gleiches Feld, andere
  Mechanik.
- Eine Beitragsdynamik gibt es hier nicht, eine Kostenvorschau ebenfalls
  nicht.

<h2 id="bestadvice">BestAdvice: Bestandsvertrag gegen Alternative</h2>

Stellt bestehende Verträge der Umschichtung in eine neue Fondspolice
gegenüber — mit Kündigungssteuer, Wechselkosten und dem, was tatsächlich
ankommt.

Leicht zu übersehen:

- **Weitere LV hinzufügen** erlaubt beliebig viele Bestandsverträge. Die
  Vertragsbezeichnung ist ein Eingabefeld, auch wenn sie wie Text aussieht.
- Je Vertrag gibt es drei Umschalter, von denen zwei erst erscheinen, wenn
  der Vertrag als **steuerpflichtig** eingestuft ist: die Vertragsart
  (klassisch oder fondsgebunden, entscheidet über die Teilfreistellung) und
  die Frage, ob der eingetragene Wert ein Rückkaufswert brutto oder eine
  Auszahlung netto ist.
- Der Erläuterungssatz unter der Vertragsart ändert sich mit dem
  Vertragsbeginn, weil bei Altverträgen die begünstigte Altersgrenze bei 60
  statt 62 liegt.
- **Kosten beim Wechsel** meint nur den alten Vertrag. Die Abschlusskosten
  der neuen Police gehören in deren eigene Felder — hier eingetragen würden
  sie zweimal abgezogen.
- Der Abschnitt **Was beim Wechsel ankommt** rechnet offen vor:
  Rückkaufswerte minus Kündigungssteuer minus Wechselkosten ergibt das
  Startkapital der neuen Police.
- Die Kurve des Bestandsvertrags ist eine gerade Linie zur garantierten
  Leistung, kein Rückkaufswertverlauf. In den ersten Jahren liegt der
  tatsächliche Wert meist darunter.

<h2 id="rentenluecke">Rentenlücke</h2>

Rechnet aus Wunscheinkommen minus erwarteter Einnahmen die monatliche Lücke,
das dafür nötige Kapital und die Sparrate.

Leicht zu übersehen:

- Der Umschalter **in heutiger Kaufkraft / Betrag zum Rentenbeginn** ändert
  die Frage, die der Rechner beantwortet. Der Erläuterungstext darunter
  wechselt mit.
- **Abzüge auf die gesetzliche Rente** steht auf 0. Die Renteninformation der
  Deutschen Rentenversicherung nennt aber einen Bruttobetrag — ohne Abzug
  fällt die Lücke zu klein aus. Der Rechner weist darauf hin, sobald eine
  Rente eingetragen und der Abzug 0 ist.
- **Kapital soll reichen bis Alter** ist der Planungshorizont und steckt in
  jeder Kapitalzahl. Dieser Wert kommt nicht aus den Voreinstellungen.
- Reichen die Einnahmen zunächst und steigt der Bedarf erst später darüber,
  nennt der Rechner das Alter, ab dem die Lücke entsteht — Kapital braucht es
  trotzdem.

<h2 id="avd">Altersvorsorgedepot</h2>

Rechnet die ab Beitragsjahr 2027 geförderte Altersvorsorge gegen einen
wählbaren Vergleichspartner, inklusive Auszahlphase und Todesfall.

Leicht zu übersehen:

- Die drei Umschalter in der Leiste oben steuern den größten Teil der Felder
  darunter: der **Vergleichspartner** (freies Depot, Fondspolice oder
  Riester-Bestand), die **Auszahlform** und die Frage, ob beide Seiten
  denselben Nettoaufwand oder denselben Bruttobeitrag bekommen.
- **Vier Abschnitte sind zugeklappt**, bis man sie anklickt: das Aufteilen
  auf zwei Verträge, die Auszahlphase, der Todesfall und der Rechtsstand. Die
  Zeile unter jedem Titel nennt den Kern.
- Die Verlaufskurven zeigen das Kapital **vor** der abschließenden
  Besteuerung, Waage und Kennzahlen **nach** Steuern. Deshalb ist der Abstand
  im Diagramm größer als der Unterschied im Ergebnis.
- Bei Kindern erscheint je Kind ein Feld für das letzte Jahr mit Kindergeld.
  Bleibt es auf 0, rechnet der Rechner die Kinderzulage bis zum Rentenbeginn
  weiter und überschätzt die Förderung.
- Es gibt keinen Berechnen-Knopf; alles rechnet laufend mit.

<h2 id="entnahmeplan">Entnahmeplan</h2>

Simuliert Jahr für Jahr, wie lange ein Kapital bei einer gewählten Entnahme
reicht.

Leicht zu übersehen — hier am meisten:

- **Einzelne Jahre lassen sich getrennt festlegen, aber nur im
  Expertenmodus.** Der Schalter heißt *Expertenmodus (Sonderentnahmen)*.
  Solange er aus ist, gilt für jedes Jahr derselbe Betrag.
- Ist er an, **verschwindet das Feld „Jährliche Entnahme"**, und bearbeitet
  wird stattdessen direkt in der Spalte **Entnahme** der Jahresübersicht:
  Jede Zeile wird dort zu einem Eingabefeld. Von außen sieht man der Tabelle
  nur an, dass die Beträge zu Feldern geworden sind.
- **Der eingetragene Wert greift erst, wenn man das Feld verlässt** — also
  klicken oder mit der Tabulatortaste weiterspringen. Tippen allein ändert
  nichts.
- **Schaltet man den Expertenmodus wieder aus, sind alle Sonderentnahmen
  sofort weg**, ohne Rückfrage und ohne Weg zurück.
- Bei Plänen ab 16 Jahren zeigt die Tabelle nur die ersten elf und die
  letzten vier Jahre. Für die Jahre dazwischen lässt sich nichts eintragen.
- **Das Endalter zählt einschließlich.** Von 65 bis 70 sind das sechs
  Jahresperioden, nicht fünf.
- **Entnahme beginnt in (Jahren)** schiebt den Start nach hinten; das Kapital
  wächst so lange unangetastet weiter.
- **Restkapital am Ende entnehmen** entscheidet, ob im letzten Jahr alles
  ausgezahlt wird oder etwas stehen bleibt, etwa als Erbe.
- Wird eine Berechnung als Grundlage gewählt, übernimmt der Entnahmeplan
  deren höheren Nettowert **und** deren Renditeannahme. Trägt man danach ein
  Startkapital von Hand ein, löst sich die Verknüpfung.
- Steuern auf die Entnahmen sind in diesem Rechner nicht enthalten.

<h2 id="nettopolice">Netto- gegen Bruttopolice</h2>

Stellt einen Courtagetarif einem Honorartarif gegenüber: keine
Abschlusskosten im Vertrag, dafür ein einmaliges Beratungshonorar.

Leicht zu übersehen:

- **Der Rechner ist doppelt verborgen.** Er setzt Premium voraus *und* den
  Schalter **Honorarberatung anbieten** in den Voreinstellungen. Ohne diesen
  Schalter erscheint er nicht in der Übersicht.
- Das Honorar wird separat gezahlt, nicht dem Vertrag entnommen. Es zählt
  trotzdem zum Aufwand und verschlechtert deshalb auch die ausgewiesenen
  Effektivkosten der Nettopolice.
- Die Nettopolice ist als „Abschlusskosten gleich null" definiert; das ist
  keine Eingabe.

<h2 id="voreinstellungen">Voreinstellungen</h2>

Setzt die Startwerte für neue Berechnungen — und einige Werte, die jede
Anzeige beeinflussen.

Leicht zu übersehen:

- Die Voreinstellungen liegen **nur auf diesem Gerät** und sind an das
  angemeldete Konto gebunden. Beim Abmelden werden sie entfernt.
- **Zurücksetzen setzt nur das Formular zurück.** Ohne anschließendes
  Speichern steht beim nächsten Öffnen alles wieder da.
- Die **Inflation** wirkt ausschließlich auf die Real-Anzeige der
  Verlaufsdiagramme und auf die Rentenlücke.
- Der **persönliche Steuersatz bei Rente** wirkt an zwei Stellen: auf die
  Besteuerung der Lebensversicherung und beim Altersvorsorgedepot auf das
  gesamte geförderte Kapital, nicht nur auf den Ertrag.
- Die Steuerfelder gibt es zusätzlich in der Steuerkarte der Rechner. Dort
  wirken Änderungen sofort, hier erst auf Knopfdruck — es ist derselbe Wert.
- Unter **Zusatzmodule** stehen die beiden Schalter, die Funktionen
  freischalten: *Honorarberatung anbieten* und *Wechselanalyse Riester*. Der
  zweite schaltet im Altersvorsorgedepot einen ganzen Abschnitt frei und
  wirkt erst, wenn die Seite neu geladen wird.

Das Steuermodell ist bewusst vereinfacht: ohne Vorabpauschale und ohne
Sparerpauschbetrag, weil beide von Fall zu Fall anders ausfallen. Die
Ergebnisse sind damit eher vorsichtig als zu günstig.
