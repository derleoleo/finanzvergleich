// Weiterempfehlung: Code abrufen (GET) und Werbung erfassen (POST).
//
// GET  → eigener Werbecode, Link und Zählerstand für die Anzeige
// POST → { code } des Werbers; wird beim Geworbenen nach der Registrierung
//         einmalig gesetzt. Die Gutschrift folgt erst bei der ersten Zahlung
//         (siehe stripe-webhook.ts).
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { holeOderErzeugeCode, normalisiereCode, WERBUNG_STATUS } from "./_werbung.js";

const BASIS_URL = "https://www.vorsorgewaage.de";

/**
 * Nur frische Konten dürfen als geworben gelten. Sonst könnte ein
 * Bestandskunde nachträglich einen Code eintragen und einem Bekannten den
 * Rabatt verschaffen, ohne dass eine Empfehlung stattgefunden hat.
 *
 * Sieben Tage statt zwei: Das Konto entsteht schon beim Registrieren, die
 * Zuordnung passiert aber erst bei der ersten Anmeldung. Wer die
 * Bestätigungsmail ein paar Tage liegen lässt, hätte seine Empfehlung sonst
 * verloren, ohne etwas falsch gemacht zu haben.
 */
const MAX_KONTOALTER_STUNDEN = 7 * 24;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const supabaseAnon = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
  );
  const token = req.headers.authorization?.slice(7) ?? "";
  const {
    data: { user },
  } = await supabaseAnon.auth.getUser(token);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (req.method === "GET") {
    const code = await holeOderErzeugeCode(supabaseAdmin, user.id);
    if (!code) return res.status(500).json({ error: "Code konnte nicht erzeugt werden" });

    const { data: werbungen } = await supabaseAdmin
      .from("werbungen")
      .select("status")
      .eq("werber_user_id", user.id);

    const alle = werbungen ?? [];
    return res.status(200).json({
      code,
      link: `${BASIS_URL}/?ref=${code}`,
      geworben: alle.length,
      belohnt: alle.filter((w) => w.status === WERBUNG_STATUS.belohnt).length,
    });
  }

  if (req.method === "POST") {
    const code = normalisiereCode((req.body as { code?: string })?.code);
    if (!code) return res.status(400).json({ error: "Code fehlt" });

    // Schon einmal zugeordnet? Dann bleibt es dabei – still, damit der
    // Aufruf beim Anmelden gefahrlos wiederholt werden kann.
    const { data: bestehend } = await supabaseAdmin
      .from("werbungen")
      .select("id")
      .eq("geworbener_user_id", user.id)
      .maybeSingle();
    if (bestehend) return res.status(200).json({ success: true, bereitsErfasst: true });

    const alterStunden =
      (Date.now() - new Date(user.created_at).getTime()) / 36e5;
    if (alterStunden > MAX_KONTOALTER_STUNDEN) {
      return res.status(400).json({ error: "Der Code gilt nur für neue Konten." });
    }

    const { data: werber } = await supabaseAdmin
      .from("werbe_codes")
      .select("user_id")
      .eq("code", code)
      .maybeSingle();
    if (!werber) return res.status(400).json({ error: "Unbekannter Empfehlungscode" });
    if (werber.user_id === user.id) {
      return res.status(400).json({ error: "Der eigene Code gilt nicht." });
    }

    const { error } = await supabaseAdmin.from("werbungen").insert({
      werber_user_id: werber.user_id,
      geworbener_user_id: user.id,
      code,
      status: WERBUNG_STATUS.registriert,
    });
    if (error) {
      // 23505: parallel schon erfasst – kein Fehler für den Aufrufer
      if (error.code === "23505") return res.status(200).json({ success: true });
      console.error("referral: Werbung konnte nicht gespeichert werden", error);
      return res.status(500).json({ error: "Interner Fehler" });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}
