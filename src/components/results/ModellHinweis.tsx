// Weist darauf hin, dass eine gespeicherte Berechnung aus einem älteren
// Rechenmodell stammt – sonst wirken Kacheln (gespeichert) und Grafik
// (neu gezeichnet) unbemerkt widersprüchlich (Audit F13).
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  modellHinweis,
  stammtAusAelteremModell,
  type ModellStempel,
} from "@/lib/finance/modell";

type Props = {
  stempel?: Partial<ModellStempel>;
  /** Neu berechnen und speichern; fehlt der Handler, erscheint kein Knopf. */
  onNeuBerechnen?: () => void;
  neuBerechnenLaeuft?: boolean;
};

export default function ModellHinweis({ stempel, onNeuBerechnen, neuBerechnenLaeuft }: Props) {
  if (!stammtAusAelteremModell(stempel)) return null;

  return (
    <div
      className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
      role="status"
    >
      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
      <p className="text-sm text-amber-900 flex-1">{modellHinweis(stempel)}</p>
      {onNeuBerechnen && (
        <Button
          variant="outline"
          onClick={onNeuBerechnen}
          disabled={neuBerechnenLaeuft}
          className="shrink-0 bg-white"
          data-pdf-hide
        >
          {neuBerechnenLaeuft ? "Berechne …" : "Neu berechnen"}
        </Button>
      )}
    </div>
  );
}
