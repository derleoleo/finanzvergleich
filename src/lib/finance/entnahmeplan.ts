// Entnahmeplan: Wie lange trägt das Kapital? (Audit F15)
//
// Korrigiert gegenüber der früheren Fassung:
// - Der Entnahmebeginn ist einstellbar. Vorher wuchs das Kapital immer ein
//   Jahr ohne Entnahme, was den Plan stillschweigend verlängert hat.
// - Die Komplettentnahme im letzten Jahr ist eine Option, kein Zwang. Sonst
//   erscheint am Ende eine Einmalzahlung, die niemand geplant hat.
// - Verluste werden als negatives Wachstum ausgewiesen statt auf null gekappt.
// - Startalter gleich Endalter ergibt eine Periode wie jede andere. Vorher
//   wurde dort zwangsweise das gesamte Kapital ausgezahlt und damit die
//   gewählte Entnahmeoption übergangen (Audit O-Nachlauf).
//
// Zeitkonvention (Audit N09): Gerechnet werden die Lebensjahre von `startAge`
// bis einschließlich `endAge`. Bei 65 bis 70 sind das sechs Jahresperioden –
// das Kapital trägt also bis zum Ende des 70. Lebensjahres, nicht nur bis zum
// 70. Geburtstag. Die Oberfläche muss das so benennen.
//
// Vereinfachung: Entnahme zu Jahresbeginn, Rendite auf das verbleibende
// Kapital. Steuern auf Entnahmen sind nicht enthalten.

export type EntnahmeZeile = {
  year: number;
  age: number;
  startCapital: number;
  withdrawal: number;
  growth: number;
  endCapital: number;
  totalWithdrawn: number;
  isLastYear?: boolean;
};

export type EntnahmeEingabe = {
  startCapital: number;
  annualWithdrawal: number;
  annualReturnPercent: number;
  startAge: number;
  endAge: number;
  /** Sonderentnahmen je Planjahr (Expertenmodus). */
  specialWithdrawals?: Record<number, number>;
  /** Jahre ohne Entnahme vor der ersten Auszahlung (Vorgabe 0). */
  aufschubJahre?: number;
  /**
   * Restkapital im letzten Jahr komplett entnehmen (Vorgabe false).
   * Gilt auch dann, wenn der Plan nur eine Periode hat (Startalter gleich
   * Endalter) – auch die kürzeste Laufzeit folgt der gewählten Option.
   */
  komplettentnahmeAmEnde?: boolean;
};

export function baueEntnahmeplan({
  startCapital,
  annualWithdrawal,
  annualReturnPercent,
  startAge,
  endAge,
  specialWithdrawals,
  aufschubJahre = 0,
  komplettentnahmeAmEnde = false,
}: EntnahmeEingabe): EntnahmeZeile[] {
  if (!Number.isFinite(startCapital) || startCapital === 0) return [];

  const rendite = (Number(annualReturnPercent) || 0) / 100;
  const aufschub = Math.max(0, Math.floor(aufschubJahre));
  const planJahre = Math.max(0, Math.round(endAge - startAge));

  const zeilen: EntnahmeZeile[] = [];
  let kapital = startCapital;
  let summeEntnommen = 0;

  for (let jahr = 0; jahr <= planJahre; jahr++) {
    const alter = startAge + jahr;
    const kapitalJahresanfang = kapital;
    const letztesJahr = jahr === planJahre;
    const vorAufschub = jahr < aufschub;

    let entnahme = 0;
    if (!vorAufschub) {
      const gewuenscht =
        letztesJahr && komplettentnahmeAmEnde
          ? kapitalJahresanfang
          : (specialWithdrawals?.[jahr] ?? annualWithdrawal);
      entnahme = Math.max(0, Math.min(gewuenscht, Math.max(0, kapitalJahresanfang)));
    }

    const nachEntnahme = kapitalJahresanfang - entnahme;
    // Negative Rendite bleibt negativ – ein Verlust ist kein Nullwachstum
    const wachstum = nachEntnahme * rendite;
    kapital = nachEntnahme + wachstum;
    summeEntnommen += entnahme;

    zeilen.push({
      year: jahr,
      age: alter,
      startCapital: Math.round(kapitalJahresanfang),
      withdrawal: Math.round(entnahme),
      growth: Math.round(wachstum),
      endCapital: Math.round(kapital),
      totalWithdrawn: Math.round(summeEntnommen),
      isLastYear: letztesJahr,
    });

    if (kapital <= 0) break;
  }

  return zeilen;
}
