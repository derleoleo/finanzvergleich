// src/utils/vielleichtAngemeldet.ts
// Eine Vorab-Auskunft, ob überhaupt eine Anmeldung im Spiel sein kann.
//
// Der Anlass: `SmartRoot` und `SmartPricing` in App.tsx gaben `null` zurück,
// solange die Anmeldung lud. Geladen wurde dafür erst Supabase — gemessen
// 212,7 kB von 512 kB im Eintrittsbündel, siehe docs/startseite-buendel.md.
// Ein Besucher aus der Suche sah also nichts, bis diese 212 kB geladen *und
// ausgeführt* waren, obwohl die Landingpage von der Anmeldung nichts braucht.
//
// Einfach sofort die Landingpage zu rendern wäre der naheliegende Ausweg,
// hätte aber einen sichtbaren Preis: Angemeldete sähen auf `/` kurz die
// Landingpage, bevor die Übersicht erscheint. Genau dieses Flackern war der
// Grund für das `null`.
//
// Deshalb diese Abkürzung. Supabase legt die Sitzung in `localStorage` ab,
// unter einem Schlüssel der Form `sb-<kennung>-auth-token`. Ob so ein
// Schlüssel existiert, lässt sich ohne eine Zeile Supabase-Code beantworten —
// synchron, in Mikrosekunden. Ist keiner da, kann niemand angemeldet sein, und
// die öffentliche Seite darf sofort erscheinen. Ist einer da, wird wie bisher
// gewartet; für Angemeldete ändert sich damit nichts.
//
// Das ist bewusst eine Heuristik und keine Prüfung: Sie beantwortet nur
// „kann ausgeschlossen werden, dass jemand angemeldet ist?". Wer wirklich
// angemeldet ist, entscheidet weiterhin allein `supabase.auth.getSession()`.

/** Schlüssel, unter dem Supabase seine Sitzung ablegt. */
const SITZUNGSSCHLUESSEL = /^sb-.*-auth-token$/;

/**
 * False nur dann, wenn eine Anmeldung sicher ausgeschlossen ist.
 *
 * Im Zweifel true — dann wird gewartet, also genau das bisherige Verhalten.
 */
export function vielleichtAngemeldet(): boolean {
  try {
    // Nach dem Klick auf einen Anmelde- oder Rücksetzlink steht die Sitzung
    // noch in der Adresse und nicht im Speicher. Hier gilt: warten.
    if (/access_token|refresh_token|type=recovery/.test(window.location.hash)) {
      return true;
    }

    for (let i = 0; i < window.localStorage.length; i++) {
      const schluessel = window.localStorage.key(i);
      if (schluessel && SITZUNGSSCHLUESSEL.test(schluessel)) return true;
    }
    return false;
  } catch {
    // Gesperrter Speicher (privates Fenster, abgeschaltete Site-Daten): Ohne
    // Speicher kann Supabase keine Sitzung halten, eine Anmeldung ist also
    // unwahrscheinlich. Trotzdem true: Im Unbekannten bleibt es beim
    // bisherigen Verhalten, statt einen Angemeldeten flackern zu lassen.
    return true;
  }
}
