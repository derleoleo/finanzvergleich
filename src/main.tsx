import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { fruehErfassen, sentryStarten } from "./utils/fehlermelder";
import { messungStarten } from "./utils/messung";

/*
 * Fehler erfassen, bevor irgendetwas anderes passiert.
 *
 * Das sind zwei `addEventListener` ohne eine Zeile Sentry — Sentry selbst ist
 * mit `VITE_SENTRY_DSN` 45,1 kB gzip von 137,0 kB im kritischen Pfad und wird
 * deshalb erst nach dem ersten Bild geladen. Alles, was bis dahin auftritt,
 * legt `fehlermelder.ts` in eine Warteschlange und reicht es danach weiter.
 * Kein Fehler geht verloren, er kommt nur später an.
 */
fruehErfassen();

// Trichtermessung auf eigener Infrastruktur; ohne Umgebungsvariablen ein
// Leerlauf (siehe utils/messung.ts).
messungStarten();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/*
 * Sentry nachladen, wenn der Browser gerade nichts Besseres zu tun hat.
 *
 * `requestIdleCallback` mit Frist, damit es auch unter Last kommt; Safari
 * kennt es bis heute nicht, dort genügt ein `setTimeout`. Beides läuft nach
 * `render`, blockiert das erste Bild also in keinem Fall.
 */
const spaeter: (fn: () => void) => void =
  typeof window.requestIdleCallback === "function"
    ? (fn) => window.requestIdleCallback(fn, { timeout: 3000 })
    : (fn) => window.setTimeout(fn, 1000);

spaeter(() => void sentryStarten());
