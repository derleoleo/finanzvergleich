import { useState } from "react";
import { Input } from "./input";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof Input>, "type" | "value" | "onChange"> & {
  value: number;
  onChange: (value: number) => void;
};

/**
 * Numerisches Eingabefeld das echtes Leeren erlaubt.
 * Hält lokalen String-State damit der User das Feld komplett leeren kann,
 * ohne dass eine erzwungene 0 zurückspringt.
 */
export function NumericInput({ value, onChange, ...rest }: Props) {
  const [display, setDisplay] = useState<string>(() =>
    value === 0 ? "" : String(value)
  );

  // Externe Wertänderung während des Renderns übernehmen (statt in einem
  // Effect) – nur wenn der Wert nicht zum aktuellen Display-String passt.
  const parsed = parseFloat(display);
  const displayNum = Number.isFinite(parsed) ? parsed : 0;
  if (value !== displayNum) {
    setDisplay(value === 0 ? "" : String(value));
  }

  return (
    <Input
      type="number"
      value={display}
      onChange={(e) => {
        const raw = e.target.value;
        setDisplay(raw);
        const parsed = parseFloat(raw);
        onChange(Number.isFinite(parsed) ? parsed : 0);
      }}
      {...rest}
    />
  );
}
