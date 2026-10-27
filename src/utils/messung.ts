// src/utils/messung.ts
// Trichtermessung – was passiert zwischen erstem Besuch und erster Zahlung.
//
// Warum überhaupt: Ohne diese Zahlen ließ sich keine einzige Frage der
// Gewinnung beantworten. Wie viele Besucher registrieren sich? Wie viele davon
// rechnen überhaupt einmal? An welcher Stelle hören sie auf? Bezahlte
// Reichweite fließt sonst in einen Trichter, dessen Lecks niemand kennt.
//
// Gemessen wird mit Umami Cloud – ein Dienst eines Dritten
// (Umami Software, Inc.). Daraus folgt die wichtigste Grenze dieses Moduls:
//
//   Gemessen wird ausschließlich der öffentliche Teil der Seite, und nur
//   solange niemand angemeldet ist.
//
// Der Grund steht im AVV: § 2 sagt zu, dass eine „Verarbeitung für eigene
// Zwecke des Auftragnehmers nicht statt(findet)", und § 3 zählt „technische
// Zugriffsdaten (Session-Token, IP-Adresse, Browser-Informationen)" zu den
// Auftragsdaten. Würde das Zählskript in der angemeldeten Anwendung laufen,
// gingen genau diese Daten zu eigenen Zwecken an einen Dritten, der im AVV
// nicht als Subprozessor steht. Das wäre ein Vertragsbruch gegenüber jedem
// Berater – und bei einem Produkt, das mit Nachweisbarkeit wirbt, der
// schlimmste denkbare Mangel.
//
// Die Zahlen aus der angemeldeten Anwendung sind deshalb nicht verloren,
// sondern kommen aus der eigenen Datenbank (siehe `docs/trichter-zahlen.sql`).
// Dort sind sie ohnehin genauer: kein Werbeblocker, keine Stichprobe.
//
// Wer die Messung lückenlos über beide Hälften führen will, muss Umami selbst
// betreiben. Dann zeigt VITE_UMAMI_URL auf die eigene Adresse, und an diesem
// Modul ändert sich nichts außer der Liste unten.
//
// Was hier bewusst NICHT passiert:
// - keine Cookies, kein Wiedererkennen über Sitzungen hinweg (Umami arbeitet
//   ohne beides).
// - keine Kennungen gespeicherter Berechnungen. Die stehen in Adressen wie
//   /calculator/detail?id=… und dürfen das Haus nicht verlassen. Darum geht
//   jede Nutzlast durch `vorSenden` (siehe unten) – nicht durch ein
//   Versprechen, sondern durch Code.
// - keine personenbezogenen Daten in Ereignissen: keine Nutzerkennung, keine
//   E-Mail-Adresse, keine Fall- oder Mandantennamen, keine Beträge. Nur
//   Schrittnamen und, wo es hilft, eine Zahl.
//
// Ohne gesetzte Umgebungsvariablen tut dieses Modul gar nichts. Die Anwendung
// läuft also unverändert weiter, solange keine Zählstelle existiert.

import { ERLAUBTE_PARAMETER_SET } from "./messparameter";

const BASIS = import.meta.env.VITE_UMAMI_URL as string | undefined;
const SEITE = import.meta.env.VITE_UMAMI_WEBSITE_ID as string | undefined;

/**
 * Die Schritte des Trichters, die vor der Anmeldung liegen. Namen bleiben
 * stabil, sonst reißt die Reihe.
 *
 * Absichtlich kurz: Was in der angemeldeten Anwendung passiert – gespeicherte
 * Berechnung, erreichtes Limit, Kassengang – steht hier nicht und darf hier
 * nicht stehen (siehe Kopf). Die Liste ist die Durchsetzung, nicht die
 * Erinnerung: Ein Aufruf mit einem anderen Namen übersetzt nicht.
 */
export type Schritt =
  | "landing_cta"
  | "preise_gesehen"
  | "registrierung_abgeschlossen";

/**
 * Pfade, von denen gemessen werden darf. Alles andere wird verworfen – auch
 * automatische Seitenaufrufe, die Umami beim Wechsel der Adresse selbst
 * auslöst.
 *
 * Positivliste, kein Ausschluss: Eine neue Seite der Anwendung ist damit
 * standardmäßig nicht gemessen und nicht standardmäßig undicht.
 */
const OEFFENTLICHE_PFADE = new Set([
  "/",
  "/beispiel",
  "/pricing",
  "/login",
  "/impressum",
  "/datenschutz",
  "/agb",
  "/legal/avv",
  "/compliance",
]);

/**
 * Ob gerade jemand angemeldet ist. Gesetzt aus dem AuthContext, an einer
 * Stelle.
 *
 * Nötig, weil `/pricing` beiden offensteht: Dieselbe Adresse, aber ein
 * angemeldeter Berater ist ein Auftraggeber im Sinne des AVV und wird nicht
 * gemessen.
 */
let angemeldet = false;

export function messungAngemeldet(wert: boolean): void {
  angemeldet = wert;
}


/**
 * Entfernt alles aus einer Adresse, was nicht hinausgehen darf: fremde
 * Abfrageteile (vor allem `?id=` mit der Kennung einer gespeicherten
 * Berechnung) und den Fragmentteil. Der Pfad bleibt – dass jemand
 * `/altersvorsorgedepot` benutzt, ist die Information, um die es geht.
 *
 * Umami liefert je nach Ereignis einen relativen Pfad oder eine volle Adresse.
 * Beides muss funktionieren.
 */
export function bereinigteAdresse(adresse: string): string {
  try {
    const url = new URL(adresse, "https://www.vorsorgewaage.de");
    const behalten = new URLSearchParams();
    url.searchParams.forEach((wert, name) => {
      if (ERLAUBTE_PARAMETER_SET.has(name.toLowerCase())) behalten.append(name, wert);
    });
    const frage = behalten.toString();
    const pfad = `${url.pathname}${frage ? `?${frage}` : ""}`;
    return /^[a-z]+:\/\//i.test(adresse) ? `${url.origin}${pfad}` : pfad;
  } catch {
    return adresse.split("?")[0].split("#")[0];
  }
}

type Nutzlast = Record<string, unknown>;

/**
 * Letzte Station vor dem Absenden. Umami ruft diese Funktion für jede Nutzlast
 * auf; was sie zurückgibt, geht hinaus (siehe `data-before-send`).
 *
 * Hier entscheidet sich, ob die Zusagen im Datenschutzhinweis halten – nicht
 * in einem Vorsatz, sondern im Code. Drei Dinge, in dieser Reihenfolge:
 *
 * 1. Angemeldet? Dann nichts. (AVV, siehe Kopf.)
 * 2. Kein öffentlicher Pfad? Dann nichts. Das greift auch, wenn Umami beim
 *    Wechsel der Adresse von selbst einen Seitenaufruf meldet.
 * 3. Sonst: Adresse und Verweisenden kürzen. Nötig, weil die Rechner nach dem
 *    Speichern `?id=…` per `history.replaceState` setzen.
 *
 * `null` bricht das Senden ab (siehe `data-before-send`). Im Zweifel wird
 * nicht gesendet: Jeder unbekannte Fall fällt in Schritt 2 heraus.
 */
export function vorSenden(_art: string, nutzlast: Nutzlast): Nutzlast | null {
  if (!nutzlast || typeof nutzlast !== "object") return null;
  if (angemeldet) return null;

  const adresse = typeof nutzlast.url === "string" ? nutzlast.url : "";
  const pfad = bereinigteAdresse(adresse).replace(/^[a-z]+:\/\/[^/]+/i, "").split("?")[0];
  if (!OEFFENTLICHE_PFADE.has(pfad === "" ? "/" : pfad)) return null;

  for (const feld of ["url", "referrer"] as const) {
    const wert = nutzlast[feld];
    if (typeof wert === "string" && wert) nutzlast[feld] = bereinigteAdresse(wert);
  }
  return nutzlast;
}

/**
 * Name, unter dem `vorSenden` am Fenster hängt. Einmal vergeben und an beiden
 * Stellen verwendet: Ein Tippfehler im Attribut würde die Bereinigung
 * stillschweigend abschalten.
 */
const VOR_SENDEN = "vorsorgewaageVorSenden";

type UmamiFenster = Window & {
  umami?: { track: (name: string, daten?: Record<string, unknown>) => void };
};

let geladen = false;

/**
 * Lädt das Zählskript, einmal, und nur wenn eine Zählstelle eingerichtet ist.
 *
 * `data-domains` verhindert, dass Aufrufe von localhost oder von
 * Vorschau-Bereitstellungen mitgezählt werden – sonst stünden die eigenen
 * Entwicklungsklicks in derselben Statistik wie echte Besucher und man misst
 * sich selbst.
 *
 * `data-exclude-search` wird absichtlich NICHT gesetzt: Das würde auch die
 * utm-Parameter verwerfen und damit die Kampagnenauswertung. Die Trennung
 * erledigt `vorSenden` genauer.
 */
export function messungStarten(): void {
  if (geladen || !BASIS || !SEITE) return;
  geladen = true;

  // Muss stehen, bevor das Skript lädt: Umami liest das Attribut beim Start.
  (window as unknown as Record<string, unknown>)[VOR_SENDEN] = vorSenden;

  const skript = document.createElement("script");
  skript.defer = true;
  skript.src = `${BASIS.replace(/\/$/, "")}/script.js`;
  skript.setAttribute("data-website-id", SEITE);
  skript.setAttribute("data-domains", "www.vorsorgewaage.de");
  skript.setAttribute("data-before-send", VOR_SENDEN);
  skript.setAttribute("data-exclude-hash", "true");
  skript.setAttribute("data-do-not-track", "true");
  document.head.appendChild(skript);
}

/**
 * Einen Schritt melden.
 *
 * Scheitert nie: Fehlt die Zählstelle, ist das Skript noch nicht geladen oder
 * blockt ein Browser es, passiert schlicht nichts. Messung darf die Anwendung
 * unter keinen Umständen stören.
 */
export function ereignis(schritt: Schritt, zahl?: number): void {
  if (!BASIS || !SEITE) return;
  try {
    const umami = (window as UmamiFenster).umami;
    if (!umami) return;
    umami.track(schritt, zahl === undefined ? undefined : { zahl });
  } catch {
    /* Messung ist nie wichtiger als die Anwendung. */
  }
}
