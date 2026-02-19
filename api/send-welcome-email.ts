import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  // JWT verifizieren
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
  );
  const token = req.headers.authorization?.slice(7) ?? "";
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user?.email) return res.status(401).json({ error: "Unauthorized" });

  const { error } = await resend.emails.send({
    from: "RentenCheck <info@contact.rentencheck.app>",
    to: user.email,
    subject: "Willkommen bei RentenCheck",
    html: `
      <!DOCTYPE html>
      <html lang="de">
      <body style="font-family: -apple-system, sans-serif; background: #f8fafc; margin: 0; padding: 40px 20px;">
        <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">
          <div style="background: #1e293b; padding: 32px 40px;">
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">RentenCheck</h1>
          </div>
          <div style="padding: 40px;">
            <h2 style="color: #0f172a; margin: 0 0 16px; font-size: 20px;">Willkommen!</h2>
            <p style="color: #475569; line-height: 1.6; margin: 0 0 24px;">
              Ihr Konto wurde erfolgreich erstellt. Mit RentenCheck können Sie
              Lebensversicherungen und Fondsdepots sekundengenau vergleichen –
              professionell, transparent und DSGVO-konform.
            </p>
            <p style="color: #475569; line-height: 1.6; margin: 0 0 8px; font-weight: 600;">
              Was Sie jetzt tun können:
            </p>
            <ul style="color: #475569; line-height: 1.8; margin: 0 0 32px; padding-left: 20px;">
              <li>Ersten Vergleich mit dem Fonds-Sparvertrag-Rechner erstellen</li>
              <li>Profil mit Ihren Beraterdaten befüllen (für PDF-Exporte)</li>
              <li>14 Tage alle Pro-Funktionen kostenlos testen</li>
            </ul>
            <a href="https://www.rentencheck.app" style="display: inline-block; background: #1e293b; color: white; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; font-size: 15px;">
              Zur App →
            </a>
          </div>
          <div style="background: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0; line-height: 1.6;">
              RentenCheck · Leonard Brandt · Ernst-Bähre-Str. 3, 30453 Hannover<br />
              <a href="https://www.rentencheck.app/datenschutz" style="color: #94a3b8;">Datenschutz</a> ·
              <a href="https://www.rentencheck.app/impressum" style="color: #94a3b8;">Impressum</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  });

  if (error) {
    console.error("Resend error:", error);
    return res.status(500).json({ error: "E-Mail konnte nicht gesendet werden" });
  }

  return res.status(200).json({ success: true });
}
