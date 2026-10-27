// src/utils/messparameter.ts
// Die eine Liste der Abfrageparameter, die eine Adresse verlassen dürfen.
//
// Eigene Datei, weil zwei sehr verschiedene Stellen sie brauchen: die Messung
// in der Anwendung (utils/messung.ts) und die statischen Ratgeberseiten, die
// beim Bauen entstehen und ihre eigene, winzige Fassung der Regel in die Seite
// schreiben (utils/ratgeber.ts). Zwei Listen würden beim nächsten Parameter
// auseinanderlaufen – und die undichte wäre die, an die niemand denkt.
//
// Positivliste, keine Sperrliste: Alles Unbekannte fällt weg. Erlaubt ist nur,
// woher ein Besuch kommt. Das braucht die Kampagnenauswertung, und es sagt
// nichts über einen Mandanten.

export const ERLAUBTE_PARAMETER = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "ref",
] as const;

export const ERLAUBTE_PARAMETER_SET: ReadonlySet<string> = new Set(ERLAUBTE_PARAMETER);
