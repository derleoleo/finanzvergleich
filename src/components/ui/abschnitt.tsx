import { useId, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Ein zusammenklappbarer Abschnitt einer Rechnerseite.
 *
 * Der Altersvorsorgedepot-Rechner hatte 43 Bedienelemente auf einem einzigen
 * durchgehenden Scroll-Flow. Nicht die Reihenfolge war das Problem, sondern
 * dass nichts verborgen wurde. Dieser Baustein macht das Verbergen möglich,
 * ohne die Reihenfolge anzutasten.
 *
 * **Zugeklappt heißt hier nicht ausgehängt.** Der Inhalt bleibt im DOM, nur
 * seine Höhe geht auf null. Zwei Gründe:
 *
 * 1. Der PDF-Export liest die Abschnitte aus dem DOM (`utils/exportPDF.ts`).
 *    Wer im Export-Dialog einen Abschnitt anhakt, muss ihn im Dokument
 *    bekommen – unabhängig davon, ob er ihn am Bildschirm gerade offen hat.
 *    Dafür trägt der Inhalt `data-pdf-expand`; der Export klappt ihn
 *    vorübergehend auf und stellt den Zustand danach wieder her.
 * 2. Die Rechner rechnen live. Ein ausgehängter Abschnitt würde seine
 *    Diagramme bei jedem Aufklappen neu aufbauen.
 */
export type AbschnittProps = {
  titel: string;
  /** Eine Zeile unter dem Titel – nennt den Kern, solange zugeklappt ist. */
  untertitel?: ReactNode;
  offen: boolean;
  onToggle: () => void;
  /** Wert für `data-pdf-section`; verbindet den Abschnitt mit dem Export-Dialog. */
  pdfSection?: string;
  /** Rechts neben dem Titel, z. B. ein Umschalter. Klicks greifen nicht durch. */
  aktion?: ReactNode;
  children: ReactNode;
};

export function Abschnitt({
  titel,
  untertitel,
  offen,
  onToggle,
  pdfSection,
  aktion,
  children,
}: AbschnittProps) {
  const inhaltId = useId();

  return (
    <div data-pdf-section={pdfSection}>
      <Card className="border-0 shadow-lg bg-white overflow-hidden">
        <div className="flex items-start gap-3 p-4 md:p-5">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={offen}
            aria-controls={inhaltId}
            className="flex flex-1 items-start gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
          >
            <ChevronDown
              aria-hidden="true"
              className={`w-5 h-5 mt-0.5 shrink-0 text-slate-400 transition-transform duration-200 motion-reduce:transition-none ${
                offen ? "" : "-rotate-90"
              }`}
            />
            <span className="min-w-0">
              <span className="block text-lg font-bold text-slate-900">{titel}</span>
              {untertitel && (
                <span className="block text-xs text-slate-500 mt-0.5">{untertitel}</span>
              )}
            </span>
          </button>
          {aktion && <div className="shrink-0">{aktion}</div>}
        </div>

        {/*
          `max-height` statt `display`: Der Inhalt bleibt messbar und der
          Export kann ihn aufklappen. Der großzügige Wert im offenen Zustand
          deckt auch lange Abschnitte ab – eine feste Höhe würde Diagramme
          abschneiden.
        */}
        <div
          id={inhaltId}
          data-pdf-expand=""
          className="transition-[max-height] duration-200 ease-out motion-reduce:transition-none"
          style={{
            maxHeight: offen ? "none" : 0,
            overflow: offen ? "visible" : "hidden",
          }}
        >
          <CardContent className="px-4 md:px-5 pb-5 pt-0">{children}</CardContent>
        </div>
      </Card>
    </div>
  );
}

export default Abschnitt;
