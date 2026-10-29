import { Card, CardContent } from '@/components/ui/card';
import { SegmentedToggle } from '@/components/ui/segmented-toggle';

/**
 * Die Fragen, die über fast alles andere entscheiden.
 *
 * Der Altersvorsorgedepot-Rechner zeigte 43 Bedienelemente auf einem
 * durchgehenden Scroll-Flow — darunter die Felder aller drei
 * Vergleichspartner gleichzeitig, obwohl immer nur einer gewählt ist. Diese
 * Leiste beantwortet vorweg, was 18 der 24 bedingten Felder steuert, und
 * bleibt dabei sichtbar: Im Beratungsgespräch wird die Weichenstellung
 * umgestellt, nicht einmal gesetzt und vergessen.
 *
 * Eine eigene Frage „Riester-Bestand: ja/nein" stand hier kurzzeitig daneben.
 * Sie war überflüssig: Wer „Riester-Bestand" als Vergleichspartner wählt, sagt
 * damit bereits, dass es einen gibt. Zwei Fragen für dieselbe Tatsache sind
 * eine zu viel.
 */

export type Vergleichspartner = 'depot' | 'fonds_lv' | 'riester_alt';
export type Auszahlform = 'auszahlplan' | 'leibrente';
export type Beitragsbasis = 'gleicher_nettoaufwand' | 'gleicher_bruttobeitrag';

export type AvdEinstiegProps = {
  vergleichspartner: Vergleichspartner;
  onVergleichspartner: (wert: Vergleichspartner) => void;
  auszahlform: Auszahlform;
  onAuszahlform: (wert: Auszahlform) => void;
  /**
   * Womit beide Seiten gespeist werden: mit demselben Beitrag oder mit
   * denselben Kosten aus eigener Tasche.
   *
   * Stand vorher als Auswahlfeld „Vergleichsbasis" im vierten Feld einer
   * Wenn-Dann-Kette in Abschnitt 3 - und damit nur beim freien Depot.
   * Die Frage gehört hierher: Sie entscheidet über jede Zahl darunter,
   * und sie wird im Gespräch umgestellt, nicht einmal gesetzt.
   */
  beitragsbasis: Beitragsbasis;
  onBeitragsbasis: (wert: Beitragsbasis) => void;
  /** Erklärt den gewählten Vergleich in einem Satz. */
  erlaeuterung: string;
};

const PARTNER = [
  { value: 'depot', label: 'Freies Depot' },
  { value: 'fonds_lv', label: 'Fondspolice' },
  { value: 'riester_alt', label: 'Riester-Bestand' },
] as const;

const AUSZAHLUNG = [
  { value: 'auszahlplan', label: 'Auszahlplan' },
  { value: 'leibrente', label: 'Leibrente' },
] as const;

const BASIS = [
  { value: 'gleicher_nettoaufwand', label: 'Nettobeiträge' },
  { value: 'gleicher_bruttobeitrag', label: 'Bruttobeiträge' },
] as const;

function Frage({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-slate-500 mb-1.5">{titel}</p>
      {children}
    </div>
  );
}

export function AvdEinstieg({
  vergleichspartner,
  onVergleichspartner,
  auszahlform,
  onAuszahlform,
  beitragsbasis,
  onBeitragsbasis,
  erlaeuterung,
}: AvdEinstiegProps) {
  return (
    <Card className="border-0 shadow-lg bg-white">
      <CardContent className="p-4 md:p-5 space-y-3">
        <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8" data-pdf-hide>
          <Frage titel="Altersvorsorgedepot vergleichen mit">
            <SegmentedToggle
              value={vergleichspartner}
              onChange={onVergleichspartner}
              options={PARTNER}
              ariaLabel="Vergleichspartner"
            />
          </Frage>

          <Frage titel="Auszahlung">
            <SegmentedToggle
              value={auszahlform}
              onChange={onAuszahlform}
              options={AUSZAHLUNG}
              ariaLabel="Auszahlform"
            />
          </Frage>

          <Frage titel="Beide Seiten bekommen">
            <SegmentedToggle
              value={beitragsbasis}
              onChange={onBeitragsbasis}
              options={BASIS}
              ariaLabel="Beitragsbasis"
            />
          </Frage>
        </div>

        <p className="text-xs text-slate-500">{erlaeuterung}</p>
      </CardContent>
    </Card>
  );
}

export default AvdEinstieg;
