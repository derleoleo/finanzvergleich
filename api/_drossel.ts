// Drosselung der Endpunkte je Nutzer.
//
// Alle Endpunkte verlangen eine Anmeldung, aber das allein bremst niemanden:
// Ein kostenloses Konto genuegt, um `send-feedback` in einer Schleife zu
// rufen und damit Mails ueber den Resend-Zugang des Betreibers zu verschicken.
// Das kostet Geld und beschaedigt den Ruf der Absenderdomain.
//
// Gezaehlt wird in der Datenbank (Migration 20261011120000), nicht im
// Arbeitsspeicher: Serverlose Funktionen laufen in beliebig vielen Instanzen,
// ein Zaehler im Prozess waere deshalb wirkungslos.

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Was gilt, wenn der Zaehler selbst nicht antwortet?
 *
 * `sperren` heisst: lieber einen voruebergehenden Fehler melden als die
 * Nebenwirkung ungebremst ausloesen. Das gehoert zu Endpunkten, bei denen
 * jeder Aufruf Geld kostet oder Zugang verschafft - fehlt die Bremse, laeuft
 * genau der Missbrauch, gegen den sie eingebaut wurde (Audit C07).
 *
 * `durchlassen` heisst: Die Anwendung bleibt benutzbar. Das gilt nur, wo ein
 * Aufruf von aussen nichts kostet - oder wo das Sperren schlimmer waere als
 * das Durchlassen, etwa bei der Kontoloeschung: Sie ist ein Recht des Nutzers
 * und darf nicht an einer Stoerung der Drosselung haengen.
 */
type BeiStoerung = "sperren" | "durchlassen";

/** Grenzen je Endpunkt: wie viele Aufrufe in welchem Zeitraum. */
export const GRENZEN = {
  /** Jeder Aufruf verschickt eine Mail - hier ist die Grenze am engsten. */
  feedback: { fensterSekunden: 3600, grenze: 5, beiStoerung: "sperren" },
  willkommensmail: { fensterSekunden: 3600, grenze: 5, beiStoerung: "sperren" },
  /** Gegen das Durchprobieren von Testcodes. */
  code: { fensterSekunden: 3600, grenze: 10, beiStoerung: "sperren" },
  /** Kontolöschung ist selten und endgültig - aber ein Recht des Nutzers. */
  konto: { fensterSekunden: 3600, grenze: 5, beiStoerung: "durchlassen" },
  /** Zahlungsvorgaenge: grosszuegiger, aber nicht unbegrenzt. */
  kasse: { fensterSekunden: 3600, grenze: 20, beiStoerung: "durchlassen" },
  /** Den eigenen Code lesen ist harmlos - hier geht es nur um Missbrauch. */
  empfehlung: { fensterSekunden: 3600, grenze: 60, beiStoerung: "durchlassen" },
  /** Einen fremden Code eintragen verschafft einen Rabatt. */
  empfehlung_code: { fensterSekunden: 3600, grenze: 10, beiStoerung: "sperren" },
} as const satisfies Record<
  string,
  { fensterSekunden: number; grenze: number; beiStoerung: BeiStoerung }
>;

export type Endpunkt = keyof typeof GRENZEN;

/** `ok` = zaehlen und weitermachen, `grenze` = zu viele, `stoerung` = Zaehler antwortet nicht. */
export type Drosselstand = "ok" | "grenze" | "stoerung";

/**
 * Zaehlt den Aufruf und sagt, wie es weitergeht.
 *
 * Fruehere Fassung gab bei einem Datenbankfehler immer `true` zurueck. Eine
 * fehlende Migration oder eine Stoerung schaltete die Bremse damit still ab -
 * und zwar genau fuer den Mailversand, um dessen Kosten es hier geht. Deshalb
 * entscheidet jetzt der Endpunkt selbst, was eine Stoerung bedeutet.
 */
export async function pruefeDrossel(
  supabaseAdmin: SupabaseClient,
  userId: string,
  endpunkt: Endpunkt
): Promise<Drosselstand> {
  const { fensterSekunden, grenze, beiStoerung } = GRENZEN[endpunkt];
  const { data, error } = await supabaseAdmin.rpc("drossel_zaehlen", {
    p_user: userId,
    p_endpunkt: endpunkt,
    p_fenster_sekunden: fensterSekunden,
    p_grenze: grenze,
  });
  if (error) {
    console.error("[drossel] Zaehlen fehlgeschlagen", { endpunkt, error });
    return beiStoerung === "sperren" ? "stoerung" : "ok";
  }
  // Eine Antwort, die kein Wahrheitswert ist, ist keine Zusage. Sie wie ein
  // "erlaubt" zu behandeln waere dieselbe stille Freigabe wie oben.
  if (typeof data !== "boolean") {
    console.error("[drossel] unerwartete Antwort", { endpunkt, data });
    return beiStoerung === "sperren" ? "stoerung" : "ok";
  }
  return data ? "ok" : "grenze";
}

/**
 * Antwort fuer einen abgewiesenen Aufruf: Status und Wortlaut an einer Stelle,
 * damit die Oberflaeche beide Faelle ueberall gleich behandelt.
 *
 * 429 heisst "du warst zu schnell", 503 heisst "wir koennen gerade nicht
 * pruefen" - der Unterschied ist fuer den Nutzer wichtig, weil nur das erste
 * seine eigene Schuld ist.
 */
export function drosselAntwort(
  stand: Exclude<Drosselstand, "ok">,
  endpunkt: Endpunkt
): { status: number; koerper: { error: string } } {
  if (stand === "stoerung") {
    return {
      status: 503,
      koerper: {
        error:
          "Dieser Vorgang ist gerade nicht möglich, weil eine Prüfung im " +
          "Hintergrund nicht antwortet. Bitte versuchen Sie es in einigen " +
          "Minuten erneut.",
      },
    };
  }
  const { grenze } = GRENZEN[endpunkt];
  return {
    status: 429,
    koerper: {
      error:
        `Zu viele Anfragen: Mehr als ${grenze} Vorgänge pro Stunde sind nicht möglich. ` +
        `Bitte versuchen Sie es später erneut.`,
    },
  };
}
