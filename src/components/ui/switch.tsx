// Ein/Aus-Schalter: Knopf gleitet nach rechts, wenn eingeschaltet.
// Für die Wahl zwischen zwei Möglichkeiten stattdessen <SegmentedToggle> verwenden.
// Das Eingabefeld bleibt eine unsichtbare Checkbox, damit <Label htmlFor> und
// die Tastaturbedienung weiter funktionieren.

export function Switch({
  checked,
  onCheckedChange,
  id,
  ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  id?: string;
  ariaLabel?: string;
}) {
  return (
    <label className="relative inline-flex shrink-0 cursor-pointer items-center">
      <input
        id={id}
        type="checkbox"
        role="switch"
        aria-label={ariaLabel}
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className="peer sr-only"
      />
      <span className="h-6 w-11 rounded-full bg-slate-300 transition-colors duration-200 peer-checked:bg-blue-600 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2 motion-reduce:transition-none" />
      <span className="pointer-events-none absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 peer-checked:translate-x-5 motion-reduce:transition-none" />
    </label>
  );
}
