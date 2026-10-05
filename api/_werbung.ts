// Gemeinsame Bausteine der Weiterempfehlung.
// Dateiname mit Unterstrich: Vercel legt daraus keine eigene Funktion an.

import type { SupabaseClient } from "@supabase/supabase-js";

/** Zeichen ohne 0/O und 1/I/L – die verwechselt man beim Abtippen. */
const ZEICHEN = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LAENGE = 8;

export const WERBUNG_STATUS = {
  registriert: "registriert",
  /** Gutschrift laeuft. Siehe Migration 20261005120000 (Audit A07). */
  inArbeit: "in_arbeit",
  belohnt: "belohnt",
  abgelehnt: "abgelehnt",
} as const;

/**
 * Nach dieser Zeit gilt ein laufender Gutschriftversuch als abgebrochen und
 * darf wieder aufgenommen werden. Grosszuegig bemessen: Ein zweiter Versuch
 * waehrend eines noch laufenden ersten waere unnoetig, schadet dank des
 * Idempotenzschluessels aber nicht.
 */
export const WIEDERAUFNAHME_MS = 15 * 60 * 1000;

export function erzeugeCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LAENGE; i++) {
    code += ZEICHEN[Math.floor(Math.random() * ZEICHEN.length)];
  }
  return code;
}

export function normalisiereCode(eingabe: unknown): string {
  return String(eingabe ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, CODE_LAENGE);
}

/**
 * Der Coupon für den Geworbenen. Ist eine jahresspezifische Variante
 * hinterlegt, gilt sie für das Jahresabo – sonst überall dieselbe.
 */
export function couponFuerGeworbenen(priceId: string): string | undefined {
  const jaehrlich = process.env.STRIPE_COUPON_GEWORBEN_JAEHRLICH;
  if (jaehrlich && priceId === process.env.VITE_STRIPE_PRICE_PREMIUM_YEARLY) {
    return jaehrlich;
  }
  return process.env.STRIPE_COUPON_GEWORBEN || undefined;
}

/** Der Coupon, den der Werber auf sein laufendes Abo bekommt. */
export function couponFuerWerber(): string | undefined {
  return process.env.STRIPE_COUPON_WERBER || undefined;
}

/**
 * Holt den Werbecode eines Nutzers oder legt ihn an. Codekollisionen sind bei
 * 31^8 Möglichkeiten unwahrscheinlich, aber nicht unmöglich – deshalb ein paar
 * Versuche, statt auf Glück zu bauen.
 */
export async function holeOderErzeugeCode(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data: vorhanden } = await supabaseAdmin
    .from("werbe_codes")
    .select("code")
    .eq("user_id", userId)
    .maybeSingle();
  if (vorhanden?.code) return vorhanden.code;

  for (let versuch = 0; versuch < 5; versuch++) {
    const code = erzeugeCode();
    const { error } = await supabaseAdmin
      .from("werbe_codes")
      .insert({ user_id: userId, code });
    if (!error) return code;
    // 23505 = unique violation: entweder der Code oder der Nutzer war schneller
    if (error.code === "23505") {
      const { data: jetzt } = await supabaseAdmin
        .from("werbe_codes")
        .select("code")
        .eq("user_id", userId)
        .maybeSingle();
      if (jetzt?.code) return jetzt.code;
      continue;
    }
    console.error("werbung: Code konnte nicht angelegt werden", error);
    return null;
  }
  return null;
}
