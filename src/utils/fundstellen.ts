// src/utils/fundstellen.ts
// Aus einer zitierten Norm eine Adresse machen – und wissen, wann nicht.
//
// Der Anlass: Die sieben Ratgeberbeiträge nennen 79 Fundstellen und
// enthielten **keinen einzigen externen Link**. Teils stehen die Zitate in
// einer Tabellenspalte, die wörtlich „Norm" heißt – genau dort, wo ein Leser
// einen Link erwartet.
//
// Dieses Modul ist die einzige Stelle, die aus einem Zitatstring eine Adresse
// macht. Es wird von drei Seiten gebraucht: vom einmaligen Vorschlagsskript
// (`scripts/fundstellen-verlinken.mjs`), vom Linkpflicht-Test
// (`ratgeber-fundstellen.test.ts`) und von den Einheitstests hier daneben.
// Deshalb steht die Abbildung im Code und nicht im Markdown: Sie ist das
// einzige Stück, das falsch sein *kann*, ohne dass es auffällt.

/**
 * Die Kürzel von gesetze-im-internet.de.
 *
 * **Nicht ableitbar.** Das VVG liegt unter `vvg_2008`, das InvStG unter
 * `invstg_2018` – wer das Kürzel aus dem Namen errät, landet auf einer
 * Fehlerseite. Jeder Eintrag hier ist einmal von Hand abgerufen worden.
 */
export const GESETZE: Record<string, string> = {
  EStG: "estg",
  VVG: "vvg_2008",
  InvStG: "invstg_2018",
  FinVermV: "finvermv",
  AltZertG: "altzertg",
  GewO: "gewo",
  BGB: "bgb",
};

/**
 * Das Altersvorsorgereformgesetz – das Ziel jeder Fundstelle mit „n.F.".
 *
 * **Die wichtigste Regel dieses Moduls.** Ein Zitat mit „n.F." meint die ab
 * Beitragsjahr 2027 geltende Fassung. Bei gesetze-im-internet.de steht die
 * **heutige** – ein Link dorthin würde dem Leser einen anderen Text zeigen
 * als den zitierten, und zwar ohne jeden Hinweis darauf. Das ist schlimmer
 * als kein Link.
 *
 * Geprüft: Die Adresse löst auf „Bundesgesetzblatt Teil I – Gesetz zur Reform
 * der steuerlich geförderten privaten Altersvorsorge" auf.
 */
export const NEUFASSUNG = {
  fundstelle: "BGBl. 2026 I Nr. 156",
  gesetz: "Altersvorsorgereformgesetz",
  adresse: "https://www.recht.bund.de/eli/bund/bgbl-1/2026/156",
  /** Erscheint als `title` am Link – `marked` übernimmt ihn ohne Konfiguration. */
  hinweis: "Fassung ab Beitragsjahr 2027 – BGBl. 2026 I Nr. 156, nicht die heute geltende",
} as const;

/**
 * Was bewusst ohne Link bleibt, mit dem Grund.
 *
 * Keine Bequemlichkeitsliste: Jeder Eintrag ist eine Entscheidung, die man
 * verteidigen können muss.
 */
export const OHNE_LINK: { was: string; grund: string }[] = [
  {
    was: "a.F.",
    grund:
      "Meint das heute geltende Riester-Recht. Das steht bei " +
      "gesetze-im-internet.de zwar jetzt noch, ab 2027 aber nicht mehr. Ein Link, " +
      "der in einem Jahr auf den falschen Text zeigt, ist schlechter als keiner – " +
      "und diese Beiträge sollen länger halten als ein Jahr.",
  },
  {
    was: "BMF-Schreiben",
    grund:
      "Das eine genannte (v. 13.01.2026) existiert, hat aber keine stabile " +
      "Adresse beim BMF; ein Link dorthin wäre in zwei Jahren tot. Datum und " +
      "Behörde stehen im Zitat und genügen zum Finden.",
  },
  {
    was: "BMF-FAQ",
    grund: "Dasselbe, und das Anwendungsschreiben steht überdies noch aus.",
  },
];

/**
 * Ein Zitat, wie es im Fließtext steht.
 *
 * Eine Fassung für Skript und Test – zwei liefen auseinander. Erfasst wird:
 * `§` oder `§§`, die Paragrafennummer samt Buchstabenzusatz (`10a`, `34f`),
 * beliebig viele Gliederungsangaben (`Abs. 1`, `S. 2–4`, `Nr. 55c`,
 * `Buchst. c`), Aufzählungen mit Komma, das Gesetzeskürzel und optional die
 * Fassungsangabe.
 *
 * **Bewusst nur auf einer Zeile.** Fünf Zitate im Bestand gehen über einen
 * Zeilenumbruch, und in vier davon steht `n.F.` bzw. `a.F.` erst auf der
 * nächsten Zeile. Zeilenweise verlinkt wären genau die auf der falschen
 * Fassung gelandet, ohne dass die `n.F.`-Prüfung angeschlagen hätte – der
 * gesuchte Teilstring enthält die Fassungsangabe dann ja nicht. Sie werden
 * deshalb nicht erfasst, sondern gemeldet und von Hand behandelt.
 */
export const ZITAT =
  /§§?\s?\d+[a-z]?(?:\s(?:Abs\.|S\.|Satz|Nr\.|Buchst\.)\s?[\d a-z.,–-]*?)*(?:,\s?\d+[a-z]?(?:\s(?:Abs\.|S\.|Nr\.)\s?[\d a-z]+)*)*\s[A-ZÄÖÜ][A-Za-zÄÖÜäöüß]+(?:\sn\.F\.|\sa\.F\.)?/g;

/** Das Gesetzeskürzel eines Zitats, oder `null`. */
export function kuerzelVon(zitat: string): string | null {
  const treffer = zitat.match(/\b([A-ZÄÖÜ][A-Za-zÄÖÜäöüß]+)(?:\s(?:n|a)\.F\.)?\s*$/);
  const name = treffer?.[1];
  return name && name in GESETZE ? name : null;
}

/**
 * Die Adresse zu einem Zitat – oder `null`, wenn es bewusst keine gibt.
 *
 * Die Regeln, in dieser Reihenfolge:
 *
 * 1. `a.F.` → kein Link (siehe `OHNE_LINK`).
 * 2. `n.F.` → **immer** das Altersvorsorgereformgesetz, nie
 *    gesetze-im-internet.de.
 * 3. Unbekanntes oder fehlendes Kürzel → kein Link. Das betrifft vor allem
 *    die „Norm"-Spalten, die ohne Kürzel zitieren (`§ 84 S. 1 Nr. 1`). Dort
 *    das Gesetz aus dem Zusammenhang zu erraten wäre die gefährlichste
 *    Variante: Drei Zeilen darüber steht `n.F.`, im Zitat selbst nicht.
 * 4. `§§`-Aufzählung → das Verzeichnis des Gesetzes, nicht der erste
 *    Paragraf. Ein Link auf `§ 195 BGB` würde über `§ 199` hinwegtäuschen.
 * 5. Sonst der einzelne Paragraf.
 */
export function fundstelleUrl(zitat: string): string | null {
  const text = zitat.trim();
  if (/\sa\.F\.$/.test(text)) return null;
  if (/\sn\.F\.$/.test(text)) return NEUFASSUNG.adresse;

  const kuerzel = kuerzelVon(text);
  if (!kuerzel) return null;
  const ordner = GESETZE[kuerzel];

  if (text.startsWith("§§")) return `https://www.gesetze-im-internet.de/${ordner}/`;

  const paragraf = text.match(/§\s?(\d+[a-z]?)/)?.[1];
  if (!paragraf) return null;
  return `https://www.gesetze-im-internet.de/${ordner}/__${paragraf}.html`;
}

/** Der `title` am Link – nur dort nötig, wo die Fassung erklärt werden muss. */
export function fundstelleHinweis(zitat: string): string | undefined {
  return /\sn\.F\.$/.test(zitat.trim()) ? NEUFASSUNG.hinweis : undefined;
}

/** Der fertige Markdown-Link, oder das Zitat unverändert. */
export function alsMarkdown(zitat: string): string {
  const url = fundstelleUrl(zitat);
  if (!url) return zitat;
  const hinweis = fundstelleHinweis(zitat);
  return `[${zitat}](${url}${hinweis ? ` "${hinweis}"` : ""})`;
}

/** Eine Fundstelle, wie sie im Text steht. */
export type Vorkommen = {
  /** Zeilennummer im Körper, 1-basiert. */
  zeile: number;
  /** Spaltenposition in der Zeile. */
  spalte: number;
  zitat: string;
  /** Steht schon ein Link darum? */
  verlinkt: boolean;
  /**
   * Geht das Zitat über den Zeilenumbruch weiter?
   *
   * Die gefährlichste Lage im ganzen Modul. `(§ 86 Abs. 1 EStG` am Zeilenende
   * mit `a.F.)` darunter sieht für sich genommen aus wie eine ganz normale
   * Fundstelle — `fundstelleUrl` würde sie auf die **heute geltende** Fassung
   * verlinken, und keine Prüfung auf „n.F." schlüge an, weil im gefundenen
   * Text nichts davon steht. Solche Vorkommen werden deshalb nicht verlinkt,
   * sondern gemeldet.
   */
  geteilt: boolean;
};

/** Ersetzt bestehende Links durch Platzhalter gleicher Länge. */
function ohneLinks(zeile: string): string {
  return zeile.replace(/\[[^\]]*\]\([^)]*\)/g, (t) => "\u0000".repeat(t.length));
}

/**
 * Setzt die naechste Zeile ein Zitat fort?
 *
 * Es gibt keine Pruefung auf „vollstaendig" – das ist der ganze Punkt.
 * `§ 86 Abs. 1 EStG` am Zeilenende *sieht* vollstaendig aus; dass darunter
 * `a.F.)` steht, ist von der Zeile aus nicht zu sehen. Entschieden wird
 * deshalb allein danach, ob das Zitat die Zeile beendet und die naechste mit
 * einer Fortsetzung beginnt.
 *
 * Bewusst aus Regex-Literalen und einer Nachschlagetabelle gebaut, nicht aus
 * einem zusammengesetzten Muster: Ein `new RegExp(\`…\s…\`)` verliert den
 * Backslash still, weil `\s` in einem Template-String keine bekannte
 * Escape-Folge ist. Das Muster passte dann auf nichts mehr – und ein Muster,
 * das nie trifft, faellt in einem Test auf „nichts gefunden" nicht auf.
 */
const EINLEITUNG = /^\s*>?\s*/;
const FORTSETZUNG = /^([na]\.F\.|S\.|Nr\.|Abs\.)/;

function setztZitatFort(naechste: string): boolean {
  const rest = naechste.replace(EINLEITUNG, "");
  if (FORTSETZUNG.test(rest)) return true;
  const wort = rest.match(/^[A-Za-zÄÖÜ]+/)?.[0];
  return wort !== undefined && wort in GESETZE;
}

/**
 * Alle Fundstellen eines Beitragskörpers.
 *
 * Eine Fassung für das Vorschlagsskript und für den Linkpflicht-Test – zwei
 * liefen auseinander, und zwar genau an der Stelle, die man nicht sieht.
 *
 * Übersprungen werden Überschriften (ein Sprungziel bekommt keinen Link) und
 * Codeblöcke. Der Frontmatter-Kopf gehört nicht hierher: Er wird zeilenweise
 * gelesen und durch `escape()` geschickt, ein Link erschiene dort als
 * Zeichenfolge.
 */
export function fundstellenImText(koerper: string): Vorkommen[] {
  const zeilen = koerper.split("\n");
  const gefunden: Vorkommen[] = [];
  let inCode = false;

  zeilen.forEach((zeile, i) => {
    if (/^\s*```/.test(zeile)) inCode = !inCode;
    if (inCode || /^\s*#/.test(zeile)) return;

    const setztFort = setztZitatFort(zeilen[i + 1] ?? "");

    const maskiert = ohneLinks(zeile);
    for (const t of maskiert.matchAll(ZITAT)) {
      const spalte = t.index ?? 0;
      const endet = spalte + t[0].length;
      gefunden.push({
        zeile: i + 1,
        spalte,
        zitat: zeile.slice(spalte, endet),
        verlinkt: false,
        // Nur ein Zitat, das die Zeile beendet, kann über den Umbruch gehen.
        geteilt: setztFort && zeile.slice(endet).trim() === "",
      });
    }
    for (const t of zeile.matchAll(/\[([^\]]*)\]\(([^)\s]+)(?:\s"[^"]*")?\)/g)) {
      for (const z of (t[1] ?? "").matchAll(ZITAT)) {
        gefunden.push({
          zeile: i + 1,
          spalte: t.index ?? 0,
          zitat: z[0],
          verlinkt: true,
          geteilt: false,
        });
      }
    }
  });

  return gefunden;
}

/** Trennt Frontmatter-Kopf und Körper. */
export function koerperVon(roh: string): string {
  const text = roh.replace(/\r\n/g, "\n");
  const ende = text.indexOf("\n---\n", 4);
  return ende < 0 ? text : text.slice(ende + 5);
}
