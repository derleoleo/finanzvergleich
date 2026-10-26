// Was passiert, wenn der Zaehler selbst nicht antwortet?
//
// Diese Frage hat der Code zweimal falsch beantwortet: Erst liess er bei einem
// Datenbankfehler alles durch - genau fuer den Mailversand, um dessen Kosten
// es bei der Drosselung geht (Audit C07). Deshalb steht die Regel jetzt in
// einem Test und nicht nur in einem Kommentar.
import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GRENZEN, drosselAntwort, pruefeDrossel, type Endpunkt } from "./_drossel.js";

/** Ein Client, der auf `rpc` immer dasselbe antwortet. */
const client = (antwort: { data?: unknown; error?: unknown }) =>
  ({ rpc: vi.fn().mockResolvedValue(antwort) }) as unknown as SupabaseClient;

const alleEndpunkte = Object.keys(GRENZEN) as Endpunkt[];

describe("Drosselung (C07)", () => {
  it("laesst durch, solange der Zaehler zustimmt", async () => {
    for (const e of alleEndpunkte) {
      expect(await pruefeDrossel(client({ data: true }), "u1", e), e).toBe("ok");
    }
  });

  it("weist ab, wenn die Grenze erreicht ist", async () => {
    for (const e of alleEndpunkte) {
      expect(await pruefeDrossel(client({ data: false }), "u1", e), e).toBe("grenze");
    }
  });

  it("sperrt bei Stoerung alles, was Geld kostet oder Zugang verschafft", async () => {
    // Mails gehen ueber den Resend-Zugang des Betreibers, Codes schalten
    // Premium frei, ein Empfehlungscode einen Rabatt.
    const gesperrt: Endpunkt[] = [
      "feedback",
      "willkommensmail",
      "code",
      "empfehlung_code",
    ];
    for (const e of gesperrt) {
      const fehler = client({ data: null, error: { message: "relation fehlt" } });
      expect(await pruefeDrossel(fehler, "u1", e), e).toBe("stoerung");
    }
  });

  it("bleibt bei Stoerung benutzbar, wo ein Aufruf nichts kostet", async () => {
    // Die Kontoloeschung ist ein Recht des Nutzers und darf nicht an einer
    // Stoerung der Drosselung haengen; Bezahlen und das Lesen des eigenen
    // Codes kosten von aussen nichts.
    for (const e of ["konto", "kasse", "empfehlung"] as Endpunkt[]) {
      const fehler = client({ data: null, error: { message: "timeout" } });
      expect(await pruefeDrossel(fehler, "u1", e), e).toBe("ok");
    }
  });

  it("nimmt eine unverstaendliche Antwort nicht als Zusage", async () => {
    // Ohne diese Pruefung galt jeder Nicht-Wahrheitswert als "erlaubt" - also
    // auch `null` aus einer Funktion, die es nicht mehr gibt.
    expect(await pruefeDrossel(client({ data: null }), "u1", "feedback")).toBe("stoerung");
    expect(await pruefeDrossel(client({ data: "ja" }), "u1", "feedback")).toBe("stoerung");
  });

  it("unterscheidet in der Antwort eigene Schuld von Stoerung", async () => {
    expect(drosselAntwort("grenze", "feedback").status).toBe(429);
    expect(drosselAntwort("grenze", "feedback").koerper.error).toContain("5");
    expect(drosselAntwort("stoerung", "feedback").status).toBe(503);
    expect(drosselAntwort("stoerung", "feedback").koerper.error).toContain("erneut");
  });
});
