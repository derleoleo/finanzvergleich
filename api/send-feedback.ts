// Feedback aus der App per Resend an den Betreiber.
//
// Ersetzt Formspree: ein Auftragsverarbeiter weniger im Verzeichnis, keine
// Übermittlung in die USA und kein zusätzlicher AVV. Die Nachricht geht über
// dieselbe Resend-Verbindung wie die Willkommensmail.
//
// Nur für angemeldete Nutzer – sonst wäre das ein offener Mailversand.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Resend } from "resend";
import { ABSENDER, mailLayout } from "./_mail-layout.js";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);

const EMPFAENGER = "info@vorsorgewaage.de";
const MAX_NACHRICHT = 5000;
const MAX_EMAIL = 200;

// Schlüssel wie im Auswahlfeld in src/Layout.tsx
const TYPEN: Record<string, string> = {
  verbesserung: "Verbesserungsvorschlag",
  wunschrechner: "Wunsch: neuer Rechner",
  fehler: "Fehlermeldung",
  sonstiges: "Sonstiges",
};

/** Nutzereingaben landen in einer HTML-Mail – ohne Maskierung wäre das eine Lücke. */
function maskiere(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
  );
  const token = req.headers.authorization?.slice(7) ?? "";
  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  if (!user?.email) return res.status(401).json({ error: "Unauthorized" });

  const { typ, nachricht, email } = (req.body ?? {}) as {
    typ?: string;
    nachricht?: string;
    email?: string;
  };

  const text = String(nachricht ?? "").trim();
  if (!text) return res.status(400).json({ error: "Nachricht fehlt" });
  if (text.length > MAX_NACHRICHT) {
    return res.status(400).json({ error: "Nachricht ist zu lang" });
  }

  const art = TYPEN[String(typ ?? "")] ?? "Feedback";
  // Rückmeldeadresse: die angegebene, sonst die des Kontos
  const rueckmeldung = String(email ?? "").trim().slice(0, MAX_EMAIL) || user.email;

  const { error } = await resend.emails.send({
    from: ABSENDER,
    to: EMPFAENGER,
    replyTo: rueckmeldung,
    subject: `${art} von ${user.email}`,
    html: mailLayout({
      titel: "Feedback",
      ueberschrift: art,
      unterzeile: `von ${maskiere(user.email)}`,
      absaetze: [
        maskiere(text).replace(/\n/g, "<br>"),
        `<strong style="color:#1A1A2E;">Antwort an:</strong> ${maskiere(rueckmeldung)}`,
      ],
    }),
  });

  if (error) {
    console.error("send-feedback: Resend error", error);
    return res.status(500).json({ error: "Feedback konnte nicht gesendet werden" });
  }

  return res.status(200).json({ success: true });
}
