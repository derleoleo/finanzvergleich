// src/utils/rechner.ts
// Einzige Quelle für die Liste der Rechner und ihrer Einzeiler.
//
// Die Liste stand als Inline-Array mitten im JSX der Landingpage. Dort ist sie
// nur zu lesen, wenn JavaScript läuft — und genau das tun die Abrufer der
// KI-Assistenten nicht (siehe `vorabInhalt.ts`). Wer die Namen für den
// Vorabtext braucht, hätte sie abschreiben müssen, und eine zweite Fassung
// dieser sechs Zeilen läuft bei der ersten Umbenennung auseinander.
//
// Hier steht nur, was die Namen und Einzeiler sind. Welches Symbol daneben
// steht, ist eine Frage der Oberfläche und bleibt in `Landing.tsx`.

export type Rechner = {
  /** Der Name, wie ihn Oberfläche und Vorabtext nennen. */
  name: string;
  /** Ein Halbsatz, was er rechnet. */
  desc: string;
  /** Im kostenlosen Plan enthalten? */
  free: boolean;
};

export const RECHNER: Rechner[] = [
  { name: "Fonds-Sparvertrag", desc: "LV vs. Direktanlage (monatliche Sparrate)", free: true },
  { name: "Fonds-Einmalanlage", desc: "LV vs. Direktanlage (Einmalbetrag)", free: true },
  { name: "BestAdvice", desc: "Bestandsvertrag vs. Umschichtung in Fonds-LV", free: false },
  { name: "Rentenlücke", desc: "Versorgungslücke im Ruhestand berechnen", free: false },
  { name: "Entnahmeplan", desc: "Kapitalverzehr im Ruhestand simulieren", free: false },
  {
    name: "Altersvorsorgedepot",
    desc: "Förderung ab 2027 – inkl. Vergleich mit Riester und freiem Depot",
    free: false,
  },
];
