// src/utils/fehlermelder.ts
// Fehler melden, ohne Sentry im kritischen Pfad zu halten.
//
// Gemessen am Bau mit `VITE_SENTRY_DSN`: Sentry sind 45,1 kB gzip von
// 137,0 kB im kritischen Pfad der Startseite — nach `react` der zweitgrößte
// Posten, und das vor dem ersten Bild (siehe docs/startseite-buendel.md).
//
// Der naheliegende Ausweg — einfach später laden — hat einen Preis, der den
// Zweck von Sentry trifft: In dem Fenster zwischen erstem Bild und geladenem
// Sentry würde nichts gemeldet, und das ist genau das Fenster, in dem
// Startfehler auftreten. Diese Datei umgeht den Preis, statt ihn hinzunehmen.
//
// Der Trick ist unspektakulär: Zwei native Zeilen (`error` und
// `unhandledrejection`) hängen sich beim Start an das Fenster, kosten keine
// messbaren Bytes und legen alles in eine Warteschlange. Sobald Sentry da ist,
// wird sie abgearbeitet. Kein Fehler geht verloren, er kommt nur später an.
//
// Was dabei verloren geht, und zwar bewusst: Die Brotkrumen vor dem Laden
// fehlen — Sentry hat zu dem Zeitpunkt noch nichts mitgeschnitten. Und die
// Transaktion für den Seitenaufbau (`browserTracingIntegration`) beginnt erst
// nach dem Laden, erfasst den ersten Aufbau also nicht mehr. Das ist eine
// Entscheidung gegen die Messung der Ladezeit und für die Ladezeit selbst;
// bei `tracesSampleRate: 0.1` wurde ohnehin nur jeder zehnte Aufbau erfasst.

// Nur der Typ: `import type` wird beim Bauen restlos entfernt und zieht kein
// Byte Sentry in das Eintrittsbuendel. Ein Cast statt dessen waere bequemer
// und schlechter - dann prueft niemand mehr, ob `beforeSend` noch zu Sentrys
// Schnittstelle passt.
import type { BrowserOptions } from "@sentry/react";
import { ohneParameter } from "./fehlerdiagnose";

type Meldung = { fehler: unknown; kontext?: Record<string, unknown> };

/**
 * Was vor dem Laden auflief.
 *
 * Gedeckelt: Eine Schleife, die zehntausend Fehler wirft, soll den Speicher
 * nicht fluten. Was über die Grenze geht, wäre ohnehin dieselbe Meldung.
 */
const WARTESCHLANGE: Meldung[] = [];
const MAX_WARTEND = 20;

/** Gesetzt, sobald Sentry geladen ist. Vorher wandert alles in die Schlange. */
let weiterreichen: ((m: Meldung) => void) | null = null;

/** Nur einmal starten, auch wenn mehrere Stellen danach fragen. */
let gestartet = false;

/**
 * Einen Fehler melden – egal, ob Sentry schon da ist.
 *
 * Die eine Stelle, über die alles läuft: die nativen Lauscher unten, die
 * Fehlergrenze in `App.tsx` und alles, was später dazukommt.
 */
export function fehlerMelden(fehler: unknown, kontext?: Record<string, unknown>): void {
  const m: Meldung = { fehler, kontext };
  if (weiterreichen) {
    weiterreichen(m);
    return;
  }
  if (WARTESCHLANGE.length < MAX_WARTEND) WARTESCHLANGE.push(m);
}

/**
 * Die nativen Lauscher aufhängen. Synchron, vor dem ersten Rendern.
 *
 * Zwei `addEventListener` – das ist der ganze Preis dafür, dass vor Sentry
 * aufgetretene Fehler nicht verschwinden.
 */
export function fruehErfassen(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("error", (e: ErrorEvent) => {
    fehlerMelden(e.error ?? e.message, { quelle: "window.error" });
  });
  window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
    fehlerMelden(e.reason, { quelle: "unhandledrejection" });
  });
}

/**
 * Die Sentry-Einstellungen.
 *
 * Wörtlich aus `main.tsx` übernommen, damit sich beim Umzug nichts ändert:
 * keine personenbezogenen Daten, Adressen ohne Abfrageteil, Eingaben in
 * Formularen nicht in der Spur.
 */
function einstellungen(dsn: string, modus: string): BrowserOptions {
  return {
    dsn,
    environment: modus,
    tracesSampleRate: 0.1,
    // Keine personenbezogenen Daten: weder Sentrys Standardangaben (IP, Cookies,
    // Kopfzeilen) noch Adressen mit Kennungen gespeicherter Berechnungen.
    sendDefaultPii: false,
    beforeSend(event) {
      delete event.user;
      if (event.request) {
        event.request.url = ohneParameter(event.request.url);
        delete event.request.query_string;
        delete event.request.cookies;
        delete event.request.headers;
      }
      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.data?.url) {
        breadcrumb.data.url = ohneParameter(String(breadcrumb.data.url));
      }
      // Eingaben in Formularen gehören nicht in die Spur
      if (breadcrumb.category === "ui.input") return null;
      return breadcrumb;
    },
  };
}

/**
 * Sentry nachladen und die Warteschlange abarbeiten.
 *
 * Ohne `VITE_SENTRY_DSN` passiert nichts – dann wird auch nichts geladen, und
 * die Warteschlange bleibt liegen, wie bisher ohne Sentry auch.
 */
export async function sentryStarten(): Promise<void> {
  if (gestartet) return;
  gestartet = true;

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  /*
   * Benannt holen, nicht als Namensraum.
   *
   * `const Sentry = await import(...)` sieht harmloser aus, materialisiert
   * aber das ganze Modul: Rollup kann nichts wegwerfen, und im Stück landen
   * `replay`, `feedback` und `replay-canvas` — zusammen 408 kB Quelle, die
   * vorher wegoptimiert wurden. Gemessen: 144,1 statt 45,1 kB gzip. Mit
   * benannter Destrukturierung kann Rollup den Rest wieder abschneiden.
   */
  const { init, captureException, browserTracingIntegration } = await import("@sentry/react");

  init({
    ...einstellungen(dsn, import.meta.env.MODE),
    integrations: [browserTracingIntegration()],
  });

  weiterreichen = ({ fehler, kontext }) => {
    captureException(fehler, kontext ? { extra: kontext } : undefined);
  };

  // Was vor dem Laden auflief, geht jetzt raus.
  while (WARTESCHLANGE.length) weiterreichen(WARTESCHLANGE.shift() as Meldung);
}

/** Nur für Tests: Zustand zurücksetzen. */
export function _zuruecksetzen(): void {
  WARTESCHLANGE.length = 0;
  weiterreichen = null;
  gestartet = false;
}

/** Nur für Tests: Was gerade wartet. */
export function _wartend(): Meldung[] {
  return [...WARTESCHLANGE];
}

/** Nur für Tests: Weitergabe von Hand setzen, ohne Sentry zu laden. */
export function _weiterreichenSetzen(fn: (m: Meldung) => void): void {
  weiterreichen = fn;
  while (WARTESCHLANGE.length) fn(WARTESCHLANGE.shift() as Meldung);
}
