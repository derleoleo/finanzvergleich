// src/pages/WasIstVorsorgewaage.tsx
// Die Seite, die erklärt, was dieses Werkzeug eigentlich ist.
//
// Der Anlass steht in der Search Console: Von den ersten sieben Suchanfragen
// enthielten sechs „software", „rechner" oder „tool" — gesucht wird das
// Werkzeug, nicht das Fachthema. Landingpage und Preisseite beantworten aber
// die Frage „was ist das überhaupt?" nirgends zusammenhängend; die Landingpage
// verkauft, die Rechner liegen hinter der Anmeldung.
//
// Deshalb eine öffentliche Seite in Fließtext. Sie nennt die Begriffe der
// Materie, weil die Software sie behandelt — nicht, um sie unterzubringen.
// Was das Werkzeug *nicht* kann, steht im selben Abschnitt: Ein Besucher, der
// enttäuscht wieder geht, ist bei einem Finanzprodukt teurer als eine
// Suchanfrage, die man nicht bedient.
//
// Bewusst eine React-Seite und keine weitere statische Datei: Der Ratgeber
// erzeugt Fachbeiträge, das hier ist eine Produktseite. Ein zweiter
// Erzeugungsweg für Produktseiten wäre dasselbe zweite Build-System, das
// `utils/ratgeber.ts` begründet ablehnt. Den eigenen Kopf für Suchmaschinen
// liefert `utils/seitenkoepfe.ts`.

import { Link } from "react-router-dom";
import GastRahmen from "@/components/GastRahmen";
import { MARKE } from "@/components/BrandLogo";
import {
  FREI_BERECHNUNGEN_PRO_MONAT,
  KLEINUNTERNEHMER_HINWEIS,
  PREIS_JAHR,
  PREIS_MONAT,
  eur,
} from "@/utils/preise";

/** Ein Abschnitt mit Überschrift – eine Stelle für den Abstand. */
function Abschnitt({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold text-slate-900 mb-3">{titel}</h2>
      <div className="space-y-4 text-slate-600 leading-relaxed">{children}</div>
    </section>
  );
}

/** Die sechs Rechner – dieselbe Aufzählung wie auf der Landingpage. */
const RECHNER = [
  {
    name: "Fonds-Sparvertrag",
    was: "Fondspolice gegen freies Depot bei monatlicher Sparrate — mit Zillmerung, Effektivkosten und Steuer in beiden Wegen.",
  },
  {
    name: "Fonds-Einmalanlage",
    was: "Derselbe Vergleich für einen Einmalbetrag, bei dem die Abschlusskosten vorab abgezogen werden.",
  },
  {
    name: "BestAdvice",
    was: "Ein Bestandsvertrag gegen die Umschichtung in eine Fondspolice, inklusive garantierter Werte.",
  },
  {
    name: "Rentenlücke",
    was: "Versorgungslücke im Ruhestand und der monatliche Sparbedarf, um sie zu schließen.",
  },
  {
    name: "Entnahmeplan",
    was: "Kapitalverzehr im Ruhestand: wie lange das Kapital bei welcher Entnahme trägt.",
  },
  {
    name: "Altersvorsorgedepot",
    was: "Die geförderte Anlage ab Beitragsjahr 2027 gegen Riester-Bestand und freies Depot.",
  },
];

export default function WasIstVorsorgewaage() {
  return (
    <GastRahmen>
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-6">
          Was ist {MARKE}?
        </h1>

        <p className="text-lg text-slate-500 leading-relaxed">
          {MARKE} ist eine Software für Altersvorsorge und Ruhestandsplanung —
          für Finanz- und Versicherungsberater, nicht für Endkunden. Sie
          rechnet die Frage durch, die in fast jeder Beratung zur Altersvorsorge
          auftaucht: <strong className="text-slate-700">Depot oder
          Lebensversicherung?</strong> Und sie legt offen, mit welchen
          Annahmen sie zu ihrem Ergebnis kommt.
        </p>

        <Abschnitt titel={"Worum geht es bei „Depot oder Lebensversicherung“?"}>
          <p>
            Eine Fondspolice und ein freies Wertpapierdepot können in dieselben
            Fonds investieren und trotzdem sehr unterschiedlich enden. Der
            Unterschied steckt in zwei Posten, die sich gegenläufig verhalten:
            den <strong className="text-slate-700">Versicherungskosten</strong>{" "}
            und der <strong className="text-slate-700">steuerlichen
            Behandlung</strong>.
          </p>
          <p>
            Die Police kostet mehr — Abschlusskosten, die über bis zu 60 Monate
            auf den Beitrag verteilt werden (Zillmerung), dazu laufende
            Verwaltungskosten und die Kosten der Fonds selbst. Dafür wird sie
            am Ende milder besteuert: Bei mindestens zwölf Jahren Laufzeit und
            Auszahlung ab 62 sind nur 42,5 % des Gewinns mit dem persönlichen
            Steuersatz zu versteuern (Halbeinkünfteverfahren), bei
            fondsgebundenen Policen zusätzlich mit 15 % Teilfreistellung. Das
            Depot zahlt dagegen Abgeltungsteuer auf den Gewinn, bei
            Aktienfonds mit 30 % Teilfreistellung.
          </p>
          <p>
            Welcher der beiden Effekte überwiegt, hängt an Laufzeit, Rendite,
            Kostenniveau und dem Steuersatz im Alter. Genau das ist die
            Rechnung, und sie fällt nicht immer gleich aus. {MARKE} stellt
            beide Wege nebeneinander und formuliert das Ergebnis neutral — es
            gibt hier keine Produktempfehlung, sondern eine Gegenüberstellung
            mit sichtbaren Annahmen.
          </p>
        </Abschnitt>

        <Abschnitt titel="Was ist das Altersvorsorgedepot (AVD)?">
          <p>
            Mit dem Altersvorsorgereformgesetz (BGBl. 2026 I Nr. 156) tritt ab
            dem Beitragsjahr 2027 eine neue staatlich geförderte Anlageform an
            die Seite der bisherigen Riester-Förderung: das
            Altersvorsorgedepot, kurz AVD. Es ist ein Wertpapierdepot mit
            Förderung statt eines Versicherungsvertrags.
          </p>
          <p>
            Die <strong className="text-slate-700">Förderlogik</strong> ist
            zweistufig aufgebaut: Von den ersten 360 € Jahresbeitrag gibt es
            50 Cent Grundzulage je Euro, von 360 € bis 1.800 € noch 25 Cent —
            höchstens 540 € im Jahr. Dazu kommt die Kinderzulage von bis zu
            300 € je Kind und, als Alternative, der Sonderausgabenabzug. Welcher
            von beiden greift, prüft das Finanzamt von Amts wegen.
          </p>
          <p>
            Daraus folgt etwas, das Faustregeln regelmäßig verfehlen: Die
            Förderquote ist nicht konstant. Die ersten Euro sind weit mehr wert
            als die letzten, und ab 1.800 € bringt der nächste Euro gar nichts
            mehr. Wer „so viel wie gefördert wird" empfiehlt, empfiehlt oft das
            Falsche.
          </p>
        </Abschnitt>

        <Abschnitt titel="AVD oder Riester – was passiert mit Bestandsverträgen?">
          <p>
            Bestehende Riester-Verträge laufen weiter. Für sie stellen sich ab
            2027 zwei Fragen, die oft zusammengeworfen werden, aber getrennt zu
            entscheiden sind: ob das{" "}
            <strong className="text-slate-700">Förderregime</strong> gewechselt
            wird — also die alte Zulagensystematik gegen die neue — und ob der{" "}
            <strong className="text-slate-700">Produktmantel</strong> gewechselt
            wird, etwa von der Riester-Rentenversicherung ins Depot.
          </p>
          <p>
            Die neue Förderung ist nicht in jedem Fall die höhere. Bei
            niedrigem Einkommen, Kindern und einem Beitrag nahe am alten
            Sockelbetrag kann die bisherige Systematik mehr bringen. {MARKE}{" "}
            rechnet beide Regime gegeneinander und zeigt die Zone, in der das
            kippt.
          </p>
        </Abschnitt>

        <Abschnitt titel="Wie werden Versicherungskosten gerechnet?">
          <p>
            Nicht als Summe einzelner Gebühren, sondern als Wirkung auf das
            Ergebnis. Der Rechner kennt zwei Eingabewege: entweder die
            einzelnen Kostenarten — Abschlusskosten, Verwaltungskosten,
            Fondskosten mit gewichtetem TER und Ausgabeaufschlag über mehrere
            Fonds — oder die{" "}
            <strong className="text-slate-700">Effektivkosten</strong> als
            einen Prozentsatz, wie ihn das Produktinformationsblatt nach PRIIPs
            ausweist.
          </p>
          <p>
            Umgekehrt weist {MARKE} die Effektivkosten auch aus, wenn man die
            Einzelkosten eingegeben hat: als Renditeminderung in Prozentpunkten
            pro Jahr, berechnet über den internen Zinsfuß. Damit lassen sich
            zwei Angebote vergleichen, die ihre Kosten unterschiedlich
            ausweisen.
          </p>
        </Abschnitt>

        <Abschnitt titel="Wie wird die Fondsrente in der Auszahlphase behandelt?">
          <p>
            Die Ansparphase ist die eine Hälfte der Rechnung, die Auszahlung
            die andere — und dort unterscheiden sich die Wege noch einmal. Eine
            Fondsrente aus einer Police wird je nach Konstellation nach dem
            Halbeinkünfteverfahren oder mit Abgeltungsteuer belastet; beim
            geförderten Altersvorsorgedepot ist die Auszahlung dagegen in voller
            Höhe nachgelagert zu versteuern, weil die Einzahlung gefördert war.
          </p>
          <p>
            Beim ungeförderten Teil eines solchen Vertrags kommt der
            Ertragsanteil nach Alter bei Rentenbeginn zum Tragen.{" "}
            {MARKE} hält geförderte und ungeförderte Anteile deshalb getrennt —
            ohne diese Trennung ließe sich die Auszahlung nicht korrekt
            besteuern.
          </p>
        </Abschnitt>

        <Abschnitt titel="Was rechnet die Rentenlücke?">
          <p>
            Den Abstand zwischen dem, was im Ruhestand gebraucht wird, und dem,
            was an Einnahmen zu erwarten ist — und daraus den monatlichen
            Sparbedarf, um ihn zu schließen. Feste Zusagen verlieren über die
            Jahre an Kaufkraft, während der Bedarf mit der Inflation steigt;
            die Lücke wächst also im Ruhestand weiter. Der Entnahmeplan rechnet
            die Gegenrichtung: wie lange ein vorhandenes Kapital bei welcher
            monatlichen Entnahme trägt.
          </p>
        </Abschnitt>

        <Abschnitt titel="Welche Rechner gibt es?">
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm border-collapse">
              <tbody>
                {RECHNER.map((r) => (
                  <tr key={r.name} className="border-b border-slate-100 align-top">
                    <th
                      scope="row"
                      className="py-3 pr-4 text-left font-semibold text-slate-900 whitespace-nowrap"
                    >
                      {r.name}
                    </th>
                    <td className="py-3 text-slate-600">{r.was}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm">
            Dazu kommt ein Vergleich von Netto- und Bruttopolice für die
            Honorarberatung. Wie ein fertiges Ergebnis aussieht, zeigt der{" "}
            <Link to="/beispiel" className="text-brand-cyan hover:underline">
              Beispielfall
            </Link>{" "}
            — durchgerechnet, ohne Anmeldung.
          </p>
        </Abschnitt>

        <Abschnitt titel="Warum sind die Annahmen sichtbar?">
          <p>
            Weil ein Rat zur Altersvorsorge dreißig Jahre halten muss und § 61
            VVG verlangt, die Gründe für jeden Rat anzugeben — nicht nur das
            Ergebnis. Jede gespeicherte Berechnung trägt deshalb einen
            Modellstempel: Fassung des Rechenmodells, Bewertungsdatum und
            Rechtsstand. Ändert sich das Modell, zeigt die Detailseite einen
            Hinweis, statt alte Werte neben neu gezeichneten Kurven zu stellen.
          </p>
          <p>
            Das betrifft gerade das Altersvorsorgedepot: Das
            BMF-Anwendungsschreiben steht in mehreren Punkten noch aus. Die
            offenen Rechtsfragen sind im Rechner umschaltbar und werden
            mitgespeichert — so bleibt nachvollziehbar, auf welcher Grundlage
            ein Rat gegeben wurde. Ausführlich steht das im{" "}
            <a href="/ratgeber/" className="text-brand-cyan hover:underline">
              Ratgeber
            </a>
            .
          </p>
        </Abschnitt>

        <Abschnitt titel={`Was ${MARKE} nicht ist`}>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-slate-700">Keine Anlageberatung und keine
              Produktempfehlung.</strong> Die Software rechnet Szenarien; die
              Beratung verantwortet der Berater.
            </li>
            <li>
              <strong className="text-slate-700">Kein Werkzeug für bilanzielle
              Pensionsrückstellungen</strong> nach § 6a EStG und keine
              Berechnung von Pensionskassen- oder bAV-Zusagen. Einnahmen daraus
              lassen sich in der Rentenlücke erfassen, berechnet werden sie
              nicht.
            </li>
            <li>
              <strong className="text-slate-700">Kein Fondsanalyse-Werkzeug.</strong>{" "}
              Fondskosten gehen als TER und Ausgabeaufschlag ein, gewichtet über
              mehrere Fonds — eine Bewertung einzelner Fonds findet nicht statt.
            </li>
            <li>
              <strong className="text-slate-700">Nicht für Endkunden.</strong>{" "}
              Der Zugang ist Finanz- und Versicherungsberatern vorbehalten.
            </li>
          </ul>
        </Abschnitt>

        <Abschnitt titel="Was kostet es?">
          <p>
            {eur(PREIS_MONAT)} im Monat oder {eur(PREIS_JAHR)} im Jahr.{" "}
            {KLEINUNTERNEHMER_HINWEIS}. Kostenlos starten geht dauerhaft, mit{" "}
            {FREI_BERECHNUNGEN_PRO_MONAT} Berechnungen pro Monat und ohne
            PDF-Export. Die Aufteilung im Einzelnen steht auf der{" "}
            <Link to="/pricing" className="text-brand-cyan hover:underline">
              Preisseite
            </Link>
            .
          </p>
        </Abschnitt>

        <div className="mt-12 rounded-xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-2">
            Mit eigenen Zahlen nachrechnen
          </h2>
          <p className="text-slate-600 text-sm mb-4">
            Der Beispielfall rechnet live und ohne Anmeldung — dieselbe Engine,
            die auch hinter den sechs Rechnern steht.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/beispiel"
              className="inline-flex items-center justify-center bg-brand-cyan hover:bg-brand-blue text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm"
            >
              Beispielfall ansehen
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center border border-slate-200 text-slate-700 hover:bg-white font-medium px-5 py-2.5 rounded-lg transition-colors text-sm"
            >
              Kostenlos starten
            </Link>
          </div>
        </div>
      </main>
    </GastRahmen>
  );
}
