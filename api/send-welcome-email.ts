import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Resend } from "resend";
import { ABSENDER, liste, mailLayout } from "./_mail-layout.js";
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
    from: ABSENDER,
    to: user.email,
    subject: "Willkommen bei Vorsorgewaage",
    html: mailLayout({
      titel: "Willkommen",
      ueberschrift: "Willkommen bei Vorsorgewaage!",
      unterzeile: "Ihr Konto ist startklar.",
      absaetze: [
        "Guten Tag,",
        "mit Vorsorgewaage vergleichen Sie Lebensversicherung und Fondsdepot nach Kosten und Steuern – nachvollziehbar und mandantensicher. Ihre Berechnungen liegen in unserer Datenbank in der EU (Frankfurt am Main).",
        "<strong style=\"color:#1A1A2E;\">Was Sie jetzt tun können:</strong>",
        liste([
          "Ersten Vergleich starten: Depot vs. LV (monatliche Anlage)",
          "Berater-Profil ausfüllen – es erscheint auf Ihren PDF-Auswertungen",
          "Premium 30 Tage kostenlos testen (BestAdvice, Rentenlücke, Entnahmeplan, Altersvorsorgedepot und PDF-Export)",
        ]),
      ],
      knopf: { text: "Zur App", url: "https://www.vorsorgewaage.de" },
      fusszeile:
        "Im kostenlosen Plan sind drei Berechnungen pro Monat enthalten. Für den Premium-Test hinterlegen Sie eine Zahlungsmethode; berechnet wird erst nach Ablauf der 30 Tage.",
    }),
  });

  if (error) {
    console.error("Resend error:", error);
    return res.status(500).json({ error: "E-Mail konnte nicht gesendet werden" });
  }

  return res.status(200).json({ success: true });
}
