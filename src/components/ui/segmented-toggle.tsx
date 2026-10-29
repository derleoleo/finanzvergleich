// Umschalter zwischen zwei oder mehr Möglichkeiten. Der weiße Schieber wandert
// auf die aktive Stelle. Für Ein/Aus stattdessen <Switch> verwenden.
//
// Bis Oktober 2026 war der Baustein auf genau zwei Optionen festgelegt – als
// Tupeltyp, mit `grid-cols-2` und einer Tastaturlogik, die nur zwischen 0 und 1
// umschaltete. Die Einstiegsleiste des Altersvorsorgedepot-Rechners braucht
// drei. Erweitert statt kopiert: Zwei Bausteine mit derselben Aufgabe müsste
// man beim nächsten Barrierefreiheits-Fix beide pflegen.
import type { ReactNode } from "react";

export type SegmentOption<T extends string> = { value: T; label: ReactNode };

/** Abstand zwischen den Feldern und ringsum, in rem. Muss zu `gap-1`/`p-1` passen. */
const LUECKE = 0.25;

type Props<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  /** Mindestens zwei; die erste gilt, wenn `value` zu keiner passt. */
  options: readonly SegmentOption<T>[];
  /** Beschriftung für Screenreader, wenn daneben kein sichtbares Label steht. */
  ariaLabel?: string;
  className?: string;
};

export function SegmentedToggle<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className = "",
}: Props<T>) {
  const anzahl = options.length;
  const aktiverIndex = options.findIndex((o) => o.value === value);
  const index = aktiverIndex === -1 ? 0 : aktiverIndex;

  /** Nachbar in Laufrichtung, rundherum. */
  const nachbar = (von: number, richtung: 1 | -1) => (von + richtung + anzahl) % anzahl;

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`relative inline-grid gap-1 rounded-full bg-slate-100 p-1 ${className}`}
      style={{ gridTemplateColumns: `repeat(${anzahl}, minmax(0, 1fr))` }}
    >
      {/* Schieber: liegt hinter den Beschriftungen und wandert zur aktiven Stelle.
          Ein Schritt ist eine Feldbreite plus eine Lücke – sonst läuft der
          Schieber bei mehr als zwei Feldern aus dem Takt. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-1 left-1 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none"
        style={{
          width: `calc((100% - ${LUECKE * (anzahl + 1)}rem) / ${anzahl})`,
          transform: `translateX(calc(${index} * (100% + ${LUECKE}rem)))`,
        }}
      />
      {options.map((option, i) => {
        const aktiv = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={aktiv}
            // Bei Optionsfeldern erwarten Tastaturnutzer die Pfeiltasten;
            // nur das aktive Feld liegt im Tab-Ablauf.
            tabIndex={aktiv ? 0 : -1}
            onKeyDown={(e) => {
              const richtung =
                e.key === "ArrowRight" || e.key === "ArrowDown"
                  ? 1
                  : e.key === "ArrowLeft" || e.key === "ArrowUp"
                    ? -1
                    : 0;
              if (richtung === 0) return;
              e.preventDefault();
              const ziel = nachbar(i, richtung);
              onChange(options[ziel].value);
              const knoepfe = e.currentTarget.parentElement?.querySelectorAll("button");
              knoepfe?.[ziel]?.focus();
            }}
            onClick={() => onChange(option.value)}
            className={`relative z-10 whitespace-nowrap rounded-full px-2 py-1.5 text-xs sm:px-3 sm:text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              aktiv ? "font-semibold text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedToggle;
