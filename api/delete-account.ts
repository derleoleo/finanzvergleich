import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const supabaseAnon = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
  );
  const token = req.headers.authorization?.slice(7) ?? "";
  const { data: { user } } = await supabaseAnon.auth.getUser(token);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Alle Nutzerdaten löschen
  await supabaseAdmin.from("calculations").delete().eq("user_id", user.id);
  await supabaseAdmin.from("single_payment_calculations").delete().eq("user_id", user.id);
  await supabaseAdmin.from("best_advice_calculations").delete().eq("user_id", user.id);
  await supabaseAdmin.from("pension_gap_calculations").delete().eq("user_id", user.id);
  await supabaseAdmin.from("user_profiles").delete().eq("user_id", user.id);
  await supabaseAdmin.from("subscriptions").delete().eq("user_id", user.id);

  // Auth-User löschen
  const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ success: true });
}
