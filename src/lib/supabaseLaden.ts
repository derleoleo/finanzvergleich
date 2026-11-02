// src/lib/supabaseLaden.ts
// Supabase erst holen, wenn es gebraucht wird.
//
// Dieses Modul ist absichtlich winzig und importiert `./supabase` **nicht**
// statisch. Nur deshalb landet der Client in einem eigenen, nachgeladenen
// Stück: Sobald irgendein Modul im Eintrittsbündel `./supabase` direkt
// importiert, zieht es die 212,7 kB wieder in den kritischen Pfad — das war
// vorher über AuthContext, SubscriptionContext, Layout und ConsentGate der
// Fall (gemessen, siehe docs/startseite-buendel.md).
//
// Die Entitäten in `src/entities/*` importieren `./supabase` weiter direkt.
// Das ist richtig so: Sie werden nur von Seiten hinter der Anmeldung benutzt,
// und die sind ohnehin schon eigene Stücke.
//
// `import()` wird vom Modulsystem gemerkt — der zweite Aufruf kostet nichts
// und liefert denselben Client. Eine eigene Zwischenspeicherung hier wäre
// doppelt.

import type { SupabaseClient } from "@supabase/supabase-js";

/** Den Client holen; beim ersten Aufruf wird das Stück nachgeladen. */
export function supabaseLaden(): Promise<SupabaseClient> {
  return import("./supabase").then((m) => m.supabase);
}
