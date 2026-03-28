import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

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

  // Gültige Codes aus Env laden
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

  // Prüfen ob Code bereits eingelöst wurde
  const { data: existing } = await supabaseAdmin
    .from("redeemed_codes")
    .select("id")
    .eq("code", normalizedCode)
    .not("user_id", "is", null)
    .maybeSingle();

  if (existing) {
    return res.status(400).json({ error: "Dieser Code wurde bereits verwendet" });
  }

  // Code als eingelöst markieren
  const { error: insertError } = await supabaseAdmin.from("redeemed_codes").insert({
    code: normalizedCode,
    user_id: user.id,
    redeemed_at: new Date().toISOString(),
  });

  if (insertError) {
    // Race-condition: anderer Request hat den Code gerade eingelöst
    if (insertError.code === "23505") {
      return res.status(400).json({ error: "Dieser Code wurde bereits verwendet" });
    }
    console.error("redeem-code insert error:", insertError);
    return res.status(500).json({ error: "Interner Fehler" });
  }

  // Subscription auf Premium (30 Tage) setzen
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 30);

  await supabaseAdmin.from("subscriptions").upsert(
    {
      user_id: user.id,
      plan: "business",
      status: "trialing",
      current_period_end: trialEnd.toISOString(),
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  return res.status(200).json({ success: true });
}
