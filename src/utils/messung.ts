// src/utils/messung.ts
// Trichtermessung – was passiert zwischen erstem Besuch und erster Zahlung.
//
// Warum überhaupt: Bisher ließ sich keine einzige Frage der Gewinnung
// beantworten. Wie viele Besucher registrieren sich? Wie viele davon rechnen
// überhaupt einmal? An welcher Stelle hören sie auf? Ohne diese Zahlen ist
// jede Entscheidung über Inhalte oder Anzeigen geraten, und bezahlte Reichweite
// fließt in einen Trichter, dessen Lecks niemand kennt.
//
// Was hier bewusst NICHT passiert:
// - kein Dienst eines Dritten. Gemessen wird mit Umami auf eigener
//   Infrastruktur; die Zusage „kein Drittanbieter-Tracking" bleibt wahr.
// - keine Cookies, kein Wiedererkennen über Sitzungen hinweg (Umami arbeitet
//   ohne beides). Damit greift auch § 25 TDDDG nicht, der für das Speichern
//   auf dem Endgerät eine Einwilligung verlangt.
// - keine personenbezogenen Daten in Ereignissen: keine Nutzerkennung, keine
//   E-Mail-Adresse, keine Fall- oder Mandantennamen, keine Beträge. Nur
//   Schrittnamen und, wo es hilft, eine Zahl.
//
// Ohne gesetzte Umgebungsvariablen tut dieses Modul gar nichts. Die Anwendung
// läuft also unverändert weiter, solange keine Zählstelle existiert.

const BASIS = import.meta.env.VITE_UMAMI_URL as string | undefined;
const SEITE = import.meta.env.VITE_UMAMI_WEBSITE_ID as string | undefined;

/** Die Schritte des Trichters. Namen bleiben stabil, sonst reißt die Reihe. */
export type Schritt =
  | "landing_cta"
  | "preise_gesehen"
  | "registrierung_abgeschlossen"
  | "berechnung_gespeichert"
  | "limit_erreicht"
  | "upgrade_geklickt"
  | "kasse_gestartet";

type UmamiFenster = Window & {
  umami?: { track: (name: string, daten?: Record<string, unknown>) => void };
};

let geladen = false;

/**
 * Lädt das Zählskript, einmal, und nur wenn eine Zählstelle eingerichtet ist.
 *
 * `data-domains` verhindert, dass Aufrufe von localhost mitgezählt werden –
 * sonst stünden die eigenen Entwicklungsklicks in derselben Statistik wie
 * echte Besucher und man misst sich selbst.
 */
export function messungStarten(): void {
  if (geladen || !BASIS || !SEITE) return;
  geladen = true;
  const skript = document.createElement("script");
  skript.defer = true;
  skript.src = `${BASIS.replace(/\/$/, "")}/script.js`;
  skript.setAttribute("data-website-id", SEITE);
  skript.setAttribute("data-domains", "www.vorsorgewaage.de");
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
