// Gemeinsames Layout für die Mails, die wir selbst verschicken (Willkommen,
// Testzeitraum). Gleiche Optik wie die Supabase-Vorlagen in
// supabase/email-templates/ – bei Änderungen dort mitziehen.
// Dateiname mit Unterstrich: Vercel legt daraus keine eigene Funktion an.

const ABSENDER = "Vorsorgewaage <info@contact.vorsorgewaage.de>";
const BASIS_URL = "https://www.vorsorgewaage.de";

export { ABSENDER };

type Knopf = { text: string; url: string };

export function mailLayout({
  titel,
  ueberschrift,
  unterzeile,
  absaetze,
  knopf,
  fusszeile,
}: {
  titel: string;
  ueberschrift: string;
  unterzeile: string;
  /** Fertige HTML-Absätze (Strings dürfen einfache Auszeichnungen enthalten). */
  absaetze: string[];
  knopf?: Knopf;
  /** Kleingedruckter Hinweis unter dem Knopf. */
  fusszeile?: string;
}): string {
  const text = (inhalt: string) =>
    `<p style="margin:0 0 16px;font-size:15px;color:#445566;line-height:1.7;">${inhalt}</p>`;

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${titel} – Vorsorgewaage</title></head>
<body style="margin:0;padding:0;background-color:#F7F9FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F7F9FF;padding:40px 16px;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
        <tr>
          <td align="center" style="padding-bottom:32px;">
            <img src="${BASIS_URL}/email-logo.png" alt="Vorsorgewaage" width="220" height="48" style="display:block;border:0;outline:none;text-decoration:none;">
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;border-radius:16px;padding:48px 40px 40px;box-shadow:0 1px 4px rgba(0,60,180,0.07),0 8px 32px rgba(0,60,180,0.06);">
            <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#1A1A2E;text-align:center;letter-spacing:-0.5px;">${ueberschrift}</h1>
            <p style="margin:0 0 32px;font-size:15px;color:#8899BB;text-align:center;line-height:1.5;">${unterzeile}</p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 32px;"><tr><td style="height:1px;background:#E0E8F5;font-size:0;line-height:0;">&nbsp;</td></tr></table>
            ${absaetze.map(text).join("\n            ")}
            ${
              knopf
                ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0;">
              <tr>
                <td align="center">
                  <a href="${knopf.url}" style="display:inline-block;background:#0057FF;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">${knopf.text}</a>
                </td>
              </tr>
            </table>`
                : ""
            }
            ${
              fusszeile
                ? `<p style="margin:0;font-size:13px;color:#8899BB;line-height:1.6;text-align:center;">${fusszeile}</p>`
                : ""
            }
          </td>
        </tr>
        <tr>
          <td style="padding:28px 0 0;text-align:center;">
            <p style="margin:0 0 8px;font-size:12px;color:#8899BB;line-height:1.6;">
              Bei Fragen erreichen Sie uns unter <a href="mailto:info@vorsorgewaage.de" style="color:#0057FF;text-decoration:none;">info@vorsorgewaage.de</a>
            </p>
            <p style="margin:0;font-size:11px;color:#B0BFCC;">
              © 2026 Vorsorgewaage · Luisa Brandt · Ernst-Bähre-Str. 3, 30453 Hannover<br>
              <a href="${BASIS_URL}/impressum" style="color:#B0BFCC;text-decoration:none;">Impressum</a> ·
              <a href="${BASIS_URL}/datenschutz" style="color:#B0BFCC;text-decoration:none;">Datenschutz</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Liste als HTML-Absatz, damit die Aufzählungen im Layout gleich aussehen. */
export function liste(punkte: string[]): string {
  return `<ul style="margin:0;padding-left:20px;color:#445566;font-size:15px;line-height:1.8;">${punkte
    .map((p) => `<li>${p}</li>`)
    .join("")}</ul>`;
}
