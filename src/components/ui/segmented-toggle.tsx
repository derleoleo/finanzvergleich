// Umschalter zwischen genau zwei Möglichkeiten (A/B). Der weiße Schieber
// wandert auf die aktive Seite. Für Ein/Aus stattdessen <Switch> verwenden.
import type { ReactNode } from "react";

export type SegmentOption<T extends string> = { value: T; label: ReactNode };

type Props<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: readonly [SegmentOption<T>, SegmentOption<T>];
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
  const aktiverIndex = options.findIndex((o) => o.value === value);
  const index = aktiverIndex === -1 ? 0 : aktiverIndex;

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`relative inline-grid grid-cols-2 gap-1 rounded-full bg-slate-100 p-1 ${className}`}
    >
      {/* Schieber: liegt hinter den Beschriftungen und wandert zur aktiven Seite */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-white shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {options.map((option) => {
        const aktiv = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={aktiv}
            onClick={() => onChange(option.value)}
            className={`relative z-10 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
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
