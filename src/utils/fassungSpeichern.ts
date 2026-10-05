// Festhalten einer Fassung – mit sichtbarem Ausgang (Audit A02).
//
// Bisher war das Anlegen einer Fassung eine stille Beigabe: Scheiterte es,
// kam `null` zurück, und kein Aufrufer sah hin. Der Hauptdatensatz war da
// schon geschrieben, der Nutzer bekam eine Erfolgsmeldung – und es gab keine
// Fassung des Stands, der ihm als gespeichert angezeigt wurde. Bei einer
// Aktualisierung war der vorherige Stand zu diesem Zeitpunkt bereits
// überschrieben.
//
// Ein gemeinsamer Schreibvorgang über beide Tabellen wäre die saubere Lösung,
// ginge aber nur serverseitig und für alle sieben Rechner zugleich. Bis dahin
// gilt: Der Teilerfolg wird benannt, und der Nachtrag ist ein Knopfdruck. Das
// erneute Auslösen der ganzen Berechnung wäre kein Ersatz – es legte einen
// zweiten Hauptdatensatz an.

import { FallVersion, type FallTabelle, type FallVersionModel } from '@/entities/FallVersion';

export type FassungEingabe = {
  fallTabelle: FallTabelle;
  fallId: string;
  name: string;
  form: Record<string, unknown>;
  results: Record<string, unknown>;
  reihen?: unknown;
};

export type FassungStand =
  | { stand: 'ok'; fassung: FallVersionModel }
  | { stand: 'fehlt'; grund: string; nachtrag: FassungEingabe };

/**
 * Hält eine Fassung fest und sagt, ob es geklappt hat. Der Rückgabewert ist
 * bewusst nicht ignorierbar: Wer ihn wegwirft, behauptet gegenüber dem Nutzer
 * etwas, das nicht geprüft wurde.
 */
export async function fassungFesthalten(eingabe: FassungEingabe): Promise<FassungStand> {
  try {
    const fassung = await FallVersion.anlegen(eingabe);
    if (fassung) return { stand: 'ok', fassung };
    return {
      stand: 'fehlt',
      grund: 'Die Fassung konnte nicht festgehalten werden.',
      nachtrag: eingabe,
    };
  } catch (e) {
    return {
      stand: 'fehlt',
      grund: e instanceof Error ? e.message : 'Unbekannter Fehler beim Festhalten der Fassung.',
      nachtrag: eingabe,
    };
  }
}

/** Text für die Oberfläche – an einer Stelle, damit er überall gleich lautet. */
export const FASSUNG_FEHLT_TEXT =
  'Die Berechnung ist gespeichert, aber es wurde keine Fassung davon festgehalten. ' +
  'Damit lässt sich dieser Stand später nicht unverändert wieder aufrufen.';
