import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import BrandLogo from "@/components/BrandLogo";

/**
 * Die Seite für eine Adresse, die es nicht gibt.
 *
 * Sie ersetzt `SimplePage`, einen Platzhalter mit der Überschrift „404" und
 * dem Satz „Diese Seite existiert noch nicht." – ohne einen einzigen Verweis.
 * Das „noch" versprach außerdem etwas, das nicht kommt.
 *
 * Vier Wege, nicht mehr: Auf einer Fehlerseite soll man nicht raten, was der
 * Besucher wollte. Dieselben vier stehen in `fehlerseite()`
 * (`src/utils/ratgeber.ts`), der statischen `404.html`, die Vercel für
 * unbekannte Adressen ausliefert. Ein Besucher soll dasselbe lesen, ob er die
 * Adresse eingetippt oder in der Anwendung auf einen toten Verweis geklickt
 * hat.
 *
 * Diese Ansicht erscheint nur noch nach einer Navigation **innerhalb** der
 * Anwendung – beim Aufruf von außen kommt die statische Seite. Metaangaben
 * zur Laufzeit zu setzen wäre deshalb eine zweite Fassung derselben Aussage,
 * die im ausgelieferten HTML ohnehin nicht stünde.
 */
export default function NotFound() {
  const wege = [
    { ziel: createPageUrl("Home"), name: "Startseite", was: "was Vorsorgewaage ist und für wen" },
    { ziel: "/beispiel", name: "Beispielfall", was: "ein durchgerechneter Vergleich, ohne Anmeldung" },
    { ziel: "/ratgeber/", name: "Ratgeber", was: "Fachbeiträge zu Förderung, Steuern und Entnahme", extern: true },
    { ziel: createPageUrl("Pricing"), name: "Preise", was: "" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-16">
      <div className="max-w-xl mx-auto">
        <BrandLogo className="mb-10" markClassName="h-8 w-8" textClassName="text-lg" />
        <h1 className="text-2xl font-bold text-slate-900">Diese Seite gibt es nicht</h1>
        <p className="text-slate-600 mt-3">
          Vielleicht hat sich die Adresse geändert, oder es fehlt ein Zeichen.
          Diese vier Wege führen weiter:
        </p>
        <ul className="mt-6 space-y-3">
          {wege.map((w) => (
            <li key={w.ziel} className="text-sm">
              {/*
                * Der Ratgeber liegt außerhalb der Anwendung – dort sind es
                * gebaute HTML-Dateien. Ein `<Link to>` würde in den
                * React-Router laufen und wieder hier landen.
                */}
              {w.extern ? (
                <a className="font-semibold text-brand-cyan hover:underline" href={w.ziel}>
                  {w.name}
                </a>
              ) : (
                <Link className="font-semibold text-brand-cyan hover:underline" to={w.ziel}>
                  {w.name}
                </Link>
              )}
              {w.was && <span className="text-slate-600"> – {w.was}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
