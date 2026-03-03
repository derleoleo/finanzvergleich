import { useState, useEffect } from "react";
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

  useEffect(() => {
    // Nur synchronisieren wenn sich der externe Wert geändert hat
    // und er nicht mit dem aktuellen Display-String übereinstimmt.
    const parsed = parseFloat(display);
    const displayNum = Number.isFinite(parsed) ? parsed : 0;
    if (value !== displayNum) {
      setDisplay(value === 0 ? "" : String(value));
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

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
