// Zeigt beim Öffnen eines gespeicherten Falls die damals berechneten Zahlen
// (Audit N03). Die Rechner unter dieser Anzeige rechnen live mit dem aktuellen
// Modell. Weichen beide voneinander ab, muss das sichtbar sein – sonst hält ein
// Berater eine neu gerechnete Zahl für die, die er dem Kunden gezeigt hat.
import { Archive } from "lucide-react";
import { formatCurrency } from "@/components/shared/CurrencyDisplay";
import { stammtAusAelteremModell, type ModellStempel } from "@/lib/finance/modell";

export type GespeicherteKennzahl = {
  label: string;
  /** Damals gespeicherter Wert. */
  gespeichert: number;
  /** Heute neu gerechneter Wert zum Vergleich. */
  aktuell?: number;
};

type Props = {
  stempel?: Partial<ModellStempel>;
  kennzahlen: GespeicherteKennzahl[];
  /** Toleranz in Euro, ab der ein Unterschied gemeldet wird. */
  toleranz?: number;
};

export default function GespeicherteAuswertung({ stempel, kennzahlen, toleranz = 1 }: Props) {
  if (!kennzahlen.length) return null;

  const abweichungen = kennzahlen.filter(
    (k) => k.aktuell !== undefined && Math.abs(k.aktuell - k.gespeichert) > toleranz
  );
  const altesModell = stammtAusAelteremModell(stempel);
  const datum = stempel?.bewertet_am
    ? new Date(stempel.bewertet_am).toLocaleDateString("de-DE")
    : null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5" data-pdf-section="gespeichert">
      <div className="flex items-center gap-2 mb-3">
        <Archive className="w-4 h-4 text-slate-500 shrink-0" />
        <div className="text-sm font-semibold text-slate-800">
          Gespeicherte Auswertung{datum ? ` vom ${datum}` : ""}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {kennzahlen.map((k) => {
          const weichtAb =
            k.aktuell !== undefined && Math.abs(k.aktuell - k.gespeichert) > toleranz;
          return (
            <div key={k.label} className="rounded-xl border border-slate-200 p-3">
              <div className="text-xs text-slate-500">{k.label}</div>
              <div className="text-lg font-bold text-slate-900">
                {formatCurrency(k.gespeichert)}
              </div>
              {weichtAb && (
                <div className="text-xs text-amber-700 mt-0.5">
                  heute: {formatCurrency(k.aktuell!)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-500 mt-3">
        {abweichungen.length === 0 ? (
          <>Die Anzeige unten rechnet mit denselben Angaben und kommt auf dieselben Werte.</>
        ) : (
          <>
            Die Anzeige unten wurde mit dem aktuellen Rechenmodell neu berechnet und weicht ab.
            {altesModell
              ? " Die gespeicherte Auswertung stammt aus einer früheren Fassung des Modells."
              : " Ursache sind geänderte Eingaben oder Voreinstellungen."}{" "}
            Für Ihre Unterlagen zählt, was Sie dem Kunden gezeigt haben – das sind die Werte oben.
          </>
        )}
      </p>
    </div>
  );
}
