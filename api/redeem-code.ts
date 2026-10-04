import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

/**
 * Meldungen für den Nutzer. Die Datenbank gibt nur ein Kürzel zurück; der
 * Wortlaut gehört in die Anwendung.
 */
const MELDUNGEN: Record<string, string> = {
  bereits_verwendet: "Dieser Code wurde bereits verwendet",
  abo_aktiv: "Sie haben bereits ein aktives Abo.",
  ungueltig: "Ungültiger Code",
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // JWT-Verifikation
  const supabaseAnon = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
  );
  const token = req.headers.authorization?.slice(7) ?? "";
  const {
    data: { user },
  } = await supabaseAnon.auth.getUser(token);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { code } = req.body as { code?: string };
  if (!code) return res.status(400).json({ error: "Code fehlt" });

  const normalizedCode = code.trim().toUpperCase();

  // Welche Codes gelten, weiß nur die Anwendung – die Datenbank prüft das
  // nicht. Deshalb steht diese Prüfung vor dem Aufruf und die Funktion ist
  // für angemeldete Nutzer gesperrt (siehe Migration).
  const validCodes = (process.env.TEST_CODES ?? "")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);

  if (!validCodes.includes(normalizedCode)) {
    return res.status(400).json({ error: "Ungültiger Code" });
  }

  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Prüfen, beanspruchen und freischalten in einer Transaktion. Vorher waren
  // das vier Anfragen: Dazwischen konnte ein zweiter Aufruf denselben Code
  // einlösen, und schlug die Freischaltung fehl, musste der Code von Hand
  // zurückgenommen werden – ein Weg, der selbst fehlschlagen konnte.
  const { data, error } = await supabaseAdmin.rpc("code_einloesen", {
    p_code: normalizedCode,
    p_user: user.id,
  });

  if (error) {
    console.error("redeem-code: Einloesung fehlgeschlagen", error);
    return res.status(500).json({
      error: "Die Freischaltung schlug fehl. Bitte versuchen Sie es erneut.",
    });
  }

  const ergebnis = typeof data === "string" ? data : "";
  if (ergebnis === "ok") return res.status(200).json({ success: true });

  if (MELDUNGEN[ergebnis]) {
    return res.status(400).json({ error: MELDUNGEN[ergebnis] });
  }

  // Unbekannte Antwort: nichts beschönigen, sondern melden – sonst sieht der
  // Nutzer einen Erfolg, den es nicht gab.
  console.error("redeem-code: unerwartete Antwort der Datenbank", { ergebnis });
  return res.status(500).json({
    error: "Die Freischaltung schlug fehl. Bitte versuchen Sie es erneut.",
  });
}
