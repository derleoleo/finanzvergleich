// Hinweiszeile unter jedem Laufzeit-Feld: zeigt das Endalter und bietet als
// kleine Schnellwahl das Regelaltersgrenzen-Alter 67 an.
const REGELALTER = 67;
const MAX_LAUFZEIT = 80;

/** Ungefähres heutiges Alter; 0, wenn das Geburtsjahr unplausibel ist. */
export function aktuellesAlter(geburtsjahr: number | undefined): number {
  const jahr = Number(geburtsjahr);
  const jetzt = new Date().getFullYear();
  if (!jahr || jahr < 1900 || jahr > jetzt) return 0;
  return jetzt - jahr;
}

type Props = {
  geburtsjahr: number | undefined;
  laufzeitJahre: number | undefined;
  /** Setzt die Laufzeit auf den Wert, der zum Zielalter führt. */
  onLaufzeitChange: (jahre: number) => void;
  /** Standardtext, wenn kein Geburtsjahr vorliegt. */
  hinweisOhneGeburtsjahr?: string;
};

export default function EndalterHinweis({
  geburtsjahr,
  laufzeitJahre,
  onLaufzeitChange,
  hinweisOhneGeburtsjahr = "Endalter wird aus Geburtsjahr + Laufzeit berechnet.",
}: Props) {
  const alter = aktuellesAlter(geburtsjahr);
  if (!alter) return <div className="text-xs text-slate-500">{hinweisOhneGeburtsjahr}</div>;

  const endalter = alter + Number(laufzeitJahre || 0);
  const passt = endalter === REGELALTER;
  const moeglich = REGELALTER - alter >= 1;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
      <span>
        Endalter: <span className="font-semibold text-slate-700">{endalter}</span>
      </span>
      {!passt && moeglich && (
        <button
          type="button"
          onClick={() =>
            onLaufzeitChange(Math.min(MAX_LAUFZEIT, Math.max(1, REGELALTER - alter)))
          }
          title={`Setzt die Laufzeit auf ${REGELALTER - alter} Jahre, damit das Endalter ${REGELALTER} ist`}
          className="rounded-full border border-slate-200 px-2 py-0.5 font-medium text-blue-600 transition-colors hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Endalter {REGELALTER}
        </button>
      )}
    </div>
  );
}
