# Neue Analyse der Vorsorgewaage – 29.09.2026

Geprüfter Commit: `ea3fd1f`. Zielgruppe: Finanzberater und Vermittler, derzeit Pilotbetrieb. Diese Nachprüfung bewertet die Änderungen gegenüber dem Audit vom 28.09.; sie ist keine vollständige fachliche Zertifizierung. Produktcode wurde nicht geändert.

## Urteil

Die technische Basis ist deutlich besser. Die Änderungen sind substanziell: Persistenz für weitere Rechner, Modellstempel, gemeinsame Entnahmeformel, inflationsbezogene Rentenlücke, atomarer Kontingentzähler und deutlich mehr Prüfungen. Dennoch sind mehrere als behoben bezeichnete Auditpunkte erst teilweise gelöst. Die wichtigste nächste Arbeit ist die Konsistenz zwischen Rechnung, Beschriftung, gespeicherter Auswertung und Wiederherstellung. Weitere Rechner würden derzeit weniger bringen.

Für einen begleiteten Pilotbetrieb ist das eine bessere Grundlage. Für den breiten Einsatz als verlässliche Beratungsdokumentation würde ich zunächst die nachfolgenden P1-Punkte schließen.

## Tatsächlich ausgeführte Prüfungen

- 188 Unit-Tests in 12 Dateien bestanden.
- API-Typecheck bestanden; Produktionsbuild bestanden.
- ESLint: keine Fehler, sechs Warnungen.
- Sechs Playwright-Tests bestanden, einschließlich mehrseitiger PDF-Erzeugung. Fünf Tests prüfen öffentliche Seiten und Zugangsschutz; keiner prüft einen angemeldeten Beratungsablauf mit Speichern und Wiederöffnen.
- Eigene mathematische Gegenproben ausgeführt: `node docs/audit-probes-2026-09-29.mjs`.
- Build warnt vor zyklischen Recharts-Chunks und großen Bundles. Das ist kein nachgewiesener Laufzeitdefekt, benötigt aber einen Browsercheck der betroffenen Diagramme im Produktionsbuild.

Die ersten Sandbox-Läufe von Vite scheiterten an Dateisystemrechten; die oben genannten erfolgreichen Ergebnisse stammen aus dem anschließenden freigegebenen Lauf. Cloud-Migrationen, tatsächliche RLS-Regeln, Stripe-Ereignisse und Restore wurden in dieser Nachprüfung nicht live geprüft. Keine neue manuelle Sitzung hinter der Anmeldung und keine visuelle Abnahme eines echten Beratungs-PDFs.

## Wichtigste Befunde

### N01 · P1 · Neue Berechnungen fehlen im Backup

`.github/workflows/backup.yml:37` enthält weiter nur die acht bisherigen Tabellen. `avd_calculations`, `net_policy_calculations`, `withdrawal_plans` und `berechnungs_zaehler` fehlen. Die neuen Speicherfunktionen können dadurch erfolgreich arbeiten, während die planmäßige Sicherung diese Daten vollständig auslässt. Der Kommentar in der AVD-Migration, diese Rechner würden damit im Backup auftauchen, trifft noch nicht zu.

Die neue Paginierung verbessert die bisherigen Exporte. Sie ersetzt aber keinen vollständigen Restore: Ausgangsschema und Auth-Benutzer bleiben laut Dokumentation separat offen. Abhilfe: Tabellen ergänzen, stabil sortiert exportieren und Wiederherstellung in einer isolierten Datenbank tatsächlich prüfen.

### N02 · P1 · Entnahmeplan ist noch kein vollständiger gespeicherter Fall

`src/pages/WithdrawalPlan.tsx:43` liest das Endalter bei jedem Öffnen aus den aktuellen Voreinstellungen. In der gespeicherten `form` ab Zeile 195 fehlt dieses Endalter. Gespeicherte Ergebnisse enthalten zwar `end_age`, werden beim Laden jedoch nicht zur Rekonstruktion verwendet. Vergleichsszenario B fehlt ebenfalls. Bei einem verknüpften Ausgangsvertrag wird das Startkapital erneut aus diesem Vertrag abgeleitet, statt den damaligen Wert einzufrieren.

Konkreter Ablauf: Plan speichern, Standard-Endalter ändern, Plan wieder öffnen. Nun wird ein anderer Planungshorizont berechnet. Ebenso können Änderungen oder Löschen des Ausgangsvertrags die Auswertung verändern. Speichern muss sämtliche wirksamen Eingaben einschließlich Kapitalübernahme und Vergleichsszenario umfassen.

### N03 · P1 · Modellstempel sichern die damalige Auswertung nicht

`src/lib/finance/modell.ts` benennt das Problem inzwischen transparent. Bei alten Standardberechnungen können gespeicherte Kennzahlen und aktuell neu gezeichnete Kurven weiterhin aus verschiedenen Modellen stammen. Ein Warnhinweis macht diese Kombination erkennbar, aber nicht konsistent.

AVD und Nettopolice laden in ihren `get(id)`-Effekten nur `form`, Name und ID; die gespeicherten Ergebnisse und ihr Modellstempel werden nicht als historische Auswertung angezeigt. Das Öffnen eines Falls führt so wieder zu aktuellen Berechnungen. Empfehlung: historische Ansicht mit gespeicherten Kennzahlen und Zeitreihen; explizites „Mit aktuellem Modell neu berechnen“ als neue Version. Ein Modellstempel allein ist noch keine reproduzierbare Dokumentation.

### N04 · P1 · BestAdvice: Bruttorendite wird als Rendite nach Kosten erklärt

`src/lib/finance/bestadvice.ts:40` sucht die Eingabe `annual_return_percent` für `simulateLv`; innerhalb der Simulation werden anschließend Kosten abgezogen. Die Einordnung nennt das Ergebnis dagegen „nach Kosten“.

Gegenprobe: Zielkapital aus 4 % Bruttorendite, 1 Prozentpunkt Vertragskosten und null Fondskosten. Der Solver findet korrekt 4 %. Der Text behauptet jedoch, die Fonds-LV müsse **nach Kosten 4 %** erzielen; die modellierte Rendite nach Vertragskosten beträgt hier 3 %. Das ist eine fachlich relevante Fehlbeschriftung einer zentralen Beratungszahl.

Zusätzlich steht `null` sowohl für Ziele oberhalb der 30-%-Suchgrenze als auch unterhalb der −10-%-Grenze. Beide werden als „nicht erreichbar“ beschrieben, obwohl ein sehr niedriges Ziel bereits übertroffen sein kann. Grenzen und Ergebniszustände getrennt behandeln.

### N05 · P1 · Rentenlücke nach Rentenbeginn rechnet weiterhin die volle ursprüngliche Rentenphase

`src/lib/finance/rentenluecke.ts` berücksichtigt beim Rentenbeginn-Hinweis das aktuelle Alter, berechnet die Rentenmonate aber weiter aus `withdrawal_end_age - retirement_age`.

Reproduziert: heute 75, Rentenbeginn 67, Ende 90, monatlich 1.000 € Lücke, null Rendite und Inflation. Ergebnis: 276.000 € Kapitalbedarf für 23 Jahre. Für die verbleibenden 15 Jahre wären es 180.000 €. Wenn die Seite aktuelle Versorgungslücken bereits pensionierter Personen unterstützt, muss die Restlaufzeit ab heute gelten. Alternativ diese Eingaben ausdrücklich nicht berechnen.

### N06 · P1 · AVD-Auszahlungsvergleich weiterhin unvollständig

`src/lib/finance/avd/simulation.ts:685` dokumentiert ausdrücklich, dass Erträge der Depot-Auszahlphase unversteuert bleiben, während die AVD-Rente besteuert wird. Die gemeinsame Annuitätenformel behebt die alte Verzinsungsasymmetrie, aber noch keinen vollständigen Nettovergleich.

Die Funktion `monatlicheEntnahme` setzt außerdem jede negative Rendite auf den Nullzinsfall zurück. Das wird im Unit-Test sogar als erwartetes Verhalten festgeschrieben. Bei negativen Renditen wird eine überhöhte tragfähige Entnahme ausgewiesen. Nullzins separat behandeln, negative zulässige Zinssätze mathematisch korrekt rechnen.

Die AVD-Verlaufsgrafik verwendet weiter laufende Kapitalwerte vor abschließender Besteuerung (`AvdCalculator.tsx:225`), während der Begleittext „Beide Seiten nach Steuern“ sagt. Kennzahlen und Kurven müssen klar unterschiedlich bezeichnet oder auf dieselbe Basis gebracht werden.

### N07 · P2 · Testcode kann ohne Freischaltung verbraucht werden

`api/redeem-code.ts:53` registriert den Code vor der Prüfung auf ein laufendes bezahltes Abo. Bei einem solchen Abo folgt ein Fehler, der Code bleibt dennoch verbraucht. Auch ein späterer Subscription-Schreibfehler lässt den Code registriert zurück. Fehler werden inzwischen gemeldet, der Vorgang ist aber weiterhin nicht atomar. Vorbedingungen vor der Mutation prüfen und Registrierung/Freischaltung transaktional zusammenführen.

### N08 · P2 · Kostenaufschlüsselung weiterhin frei modelliert

Die Vertragskosten wirken nun als Renditeminderung; das ist eine klare Verbesserung des früheren Rechenwegs. Die Aufteilung in Abschluss- und Verwaltungskosten in `simulation.ts:116` ist aber unverändert: Bei insgesamt 1.000 € Kosten liefert sie für fünf Jahre 600/400 €, für sechs Jahre 950/50 €. Diese Aufteilung folgt keiner eingegebenen Tarifstruktur. Sie darf nicht wie ermittelte reale Kosten erscheinen. Unbekannte Aufteilung als unbekannt ausweisen oder echte Kostenparameter verlangen.

### N09 · P2 · Entnahme-Zeitachse muss eindeutig werden

`baueEntnahmeplan` iteriert einschließlich des Endalters und verzinst auch die letzte Zeile noch ein Jahr. Gegenprobe 65 bis 70, 100.000 € Kapital, 10.000 € jährliche Entnahme, null Rendite: sechs Entnahmen, 40.000 € Restkapital. Bei einem Horizont bis zum 70. Geburtstag wären es fünf Jahresperioden und 50.000 € Rest. Soll das gesamte 70. Lebensjahr eingeschlossen sein, muss die Anzeige das Ende der letzten Periode entsprechend benennen. Bei identischem Start- und Endalter wird unabhängig von der Option alles ausgezahlt. Dafür fehlt eine einheitliche Zeitkonvention.

## Neubewertung der bisherigen Arbeiten

| Bereich | Stand nach Nachprüfung |
|---|---|
| Effektivkosten-Rechenweg | Verbessert; künstliche Kostenaufteilung bleibt |
| Nettopolice/Honorar | Zeitwert und Aufwand im RIY berücksichtigt; angenommene Alternativrendite muss fachlich sichtbar bleiben |
| AVD-Reinvestition | Vergleichsdepot erhält jetzt den passenden höheren Eigenaufwand; Zuordnung der Erstattung zum geförderten Kapital bleibt gesondert fachlich zu prüfen |
| BestAdvice | Historische Beiträge, Wechselkosten und Break-even ergänzt; N04 offen |
| Negative Kapitalstände | Keine negativen Fondskosten mehr; umfassende Domänenvalidierung der gemeinsamen Engine fehlt weiterhin |
| Stripe-Webhook | Schreibfehler führen jetzt zu HTTP 500; Reihenfolgekonflikte und alte Abo-Ereignisse weiterhin nicht abgesichert |
| RLS | Neue Tabellen mit eigenen RLS-Regeln; README dokumentiert vorherige Cloud-Prüfung. Live-Zustand und vollständiger Ausgangsstand hier nicht unabhängig bestätigt |
| Lokale Daten | Löschung beim Kontowechsel/Abmelden eingeführt; keine erneute Mehrkonto-Browserprüfung durchgeführt |
| Persistenz | AVD, Nettopolice und Entnahmeplan vorhanden; N01–N03 verhindern vollständigen Abschluss |
| Rentenlücke/Entnahme | Inflation, Restkapital, Aufschub und Verluste verbessert; N05/N09 offen |
| Kontingent | Atomarer Monatszähler verhindert paralleles Überziehen und Freigabe durch Löschen; Migration übernimmt nur die vier ursprünglichen Berechnungstabellen |
| Vorabpauschale | Zeitanteilige Käufe ergänzt; dies ist noch kein unabhängiger steuerfachlicher Gesamtnachweis |
| Fehlerdiagnose | URL-Parameter und einige personenbezogene Felder werden entfernt; Transaktionen und sonstige Breadcrumb-Felder sind damit nicht vollständig geprüft |
| PDF | Mehrseitige A4-Ausgabe technisch getestet; pixelbasierte Schnitte garantieren keine sauberen Text-/Tabellenumbrüche |
| Testautomatisierung | Erheblicher Fortschritt; angemeldete Kernabläufe und Fehlerfälle fehlen |

## Produkt und Mitbewerber

Die Vorsorgewaage deckt inzwischen viele Aufgaben ab: Spar- und Einmalanlagen vergleichen, Bestandsverträge bewerten, Rentenlücken und Entnahmen planen sowie AVD und Netto-/Bruttopolicen gegenüberstellen. Der Engpass ist jetzt weniger Funktionsumfang als Verlässlichkeit eines vollständigen Beratungsfalls.

Die beiden direkten Vergleichsangebote wurden erneut öffentlich angesehen. Das sind Anbieterangaben, keine unabhängigen Funktionstests:

- [fonder](https://www.fonder-vergleiche.de/) bewirbt Police, Depot, Rürup und AVD, Tarifdaten, Kundenprofile, PDF und Kostenextraktion. Damit ist ein weiterer Rechner allein keine starke Differenzierung.
- [Patina Charts](https://patinacharts.de/) adressiert ebenfalls den Vergleich ETF/Fondspolice für Vermittler. Die verständliche Darstellung ist damit bereits ein Wettbewerbsfeld.

Meine Positionierungsempfehlung bleibt: **„Nachvollziehbare Vorsorgevergleiche mit gleichem Budget, sichtbaren Annahmen und dauerhaft reproduzierbarer Beratungsdokumentation.“** Die neutrale Waage passt dazu. Ihr Wert entsteht besonders dann, wenn sie auch zeigt, unter welchen Annahmen sich das Ergebnis umkehrt.

## MVP und nächste Reihenfolge

1. **Bestehenden Kern verlässlich machen:** N01–N06 beheben, weitere Befunde klar einschränken oder korrigieren. Gespeicherte Ergebnisse müssen beim Wiederöffnen und im PDF zusammenpassen.
2. **Einen vollständigen Beratungsablauf absichern:** Eingabe → Plausibilitätsprüfung → drei Szenarien → Speichern → Wiederöffnen → PDF. Automatisiert mit Testkonto und isolierten Testdaten, einschließlich Fehlern und Modellwechseln.
3. **Differenzierung ausbauen:** Kipp-Punkte für Kosten, Laufzeit und Rendite; transparente Gegenüberstellung der Budgets; erklärbare Veränderung zum vorherigen Szenario.
4. **Erst danach Komfortfunktionen:** überprüfbarer Import von Kosten aus Angebotsunterlagen, Vorlagen und fallbezogene Notizen. Ein vollständiges CRM oder zusätzliche Produktwelten derzeit zurückstellen.

Für Pilotfeedback würde ich messen: Zeit bis zur ersten fertigen Auswertung, Anteil erfolgreich wiedergeöffneter Fälle, Anteil verwendeter PDFs und Zahl fachlich erklärungsbedürftiger Ergebnisse. Erfolg bedeutet hier, dass Berater den Vergleich erklären und später unverändert belegen können.
