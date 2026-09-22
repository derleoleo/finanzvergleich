// Erzeugt die Supabase-Auth-Mailvorlagen in supabase/email-templates/ aus einem
// gemeinsamen Layout. Aufruf: node scripts/generate-email-templates.mjs
// Danach den Inhalt jeder Datei in Supabase → Authentication → Emails → Templates
// einfügen (Betreff steht jeweils im Kommentar oben in der Datei).
//
// Nur Platzhalter verwenden, die Supabase kennt: {{ .ConfirmationURL }}, {{ .Token }},
// {{ .Email }}, {{ .NewEmail }}, {{ .SiteURL }}. Eigene wie {{ .Name }} bleiben leer.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const zielOrdner = path.join(root, "supabase/email-templates");

const p = (text, stil = "") =>
  `<p style="margin:0 0 16px;font-size:15px;color:#445566;line-height:1.7;${stil}">${text}</p>`;
const hinweis = (text) =>
  `<p style="margin:0 0 8px;font-size:13px;color:#8899BB;line-height:1.6;text-align:center;">${text}</p>`;
const trenner = (abstand = "32px 0") =>
  `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:${abstand};"><tr><td style="height:1px;background:#E0E8F5;font-size:0;line-height:0;">&nbsp;</td></tr></table>`;

function button(beschriftung) {
  return `
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0;">
              <tr>
                <td align="center">
                  <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#0057FF;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">
                    ${beschriftung}
                  </a>
                </td>
              </tr>
            </table>
            ${hinweis("Funktioniert der Button nicht? Kopieren Sie diesen Link in Ihren Browser:")}
            <p style="margin:0 0 24px;font-size:12px;line-height:1.5;text-align:center;word-break:break-all;">
              <a href="{{ .ConfirmationURL }}" style="color:#0057FF;text-decoration:underline;">{{ .ConfirmationURL }}</a>
            </p>`;
}

const code = `
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0;">
              <tr>
                <td align="center">
                  <div style="display:inline-block;background:#F0F5FF;border-radius:10px;padding:16px 32px;font-size:32px;font-weight:700;letter-spacing:8px;color:#1A1A2E;font-family:'SFMono-Regular',Consolas,monospace;">{{ .Token }}</div>
                </td>
              </tr>
            </table>`;

const kachel = (titel, text) => `
                  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#F7F9FF;border-radius:10px;padding:16px;text-align:center;">
                    <div style="font-size:12px;font-weight:600;color:#1A1A2E;margin-bottom:4px;">${titel}</div>
                    <div style="font-size:11px;color:#8899BB;line-height:1.5;">${text}</div>
                  </td></tr></table>`;

const funktionen = `
            ${trenner("32px 0 28px")}
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="33%" style="padding:0 6px 0 0;vertical-align:top;">${kachel("LV oder Depot?", "Nach Kosten und Steuern transparent abgewogen")}
                </td>
                <td width="34%" style="padding:0 3px;vertical-align:top;">${kachel("6 Rechner", "Von BestAdvice bis Altersvorsorgedepot")}
                </td>
                <td width="33%" style="padding:0 0 0 6px;vertical-align:top;">${kachel("Daten in der EU", "Gespeichert in Frankfurt am Main")}
                </td>
              </tr>
            </table>`;

function layout({ vorlage, betreff, titel, ueberschrift, unterzeile, inhalt }) {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${titel} – Vorsorgewaage</title>
</head>
<!--
  Supabase → Authentication → Emails → Templates → „${vorlage}“
  Betreff: ${betreff}
  Erzeugt von scripts/generate-email-templates.mjs – dort ändern, nicht hier.
-->
<body style="margin:0;padding:0;background-color:#F7F9FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F7F9FF;padding:40px 16px;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

        <!-- LOGO -->
        <tr>
          <td align="center" style="padding-bottom:32px;">
            <img src="https://www.vorsorgewaage.de/email-logo.png" alt="Vorsorgewaage" width="220" height="48" style="display:block;border:0;outline:none;text-decoration:none;">
          </td>
        </tr>

        <!-- KARTE -->
        <tr>
          <td style="background:#ffffff;border-radius:16px;padding:48px 40px 40px;box-shadow:0 1px 4px rgba(0,60,180,0.07),0 8px 32px rgba(0,60,180,0.06);">

            <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#1A1A2E;text-align:center;letter-spacing:-0.5px;">${ueberschrift}</h1>
            <p style="margin:0 0 32px;font-size:15px;color:#8899BB;text-align:center;line-height:1.5;">${unterzeile}</p>

            ${trenner("0 0 32px")}
${inhalt}
          </td>
        </tr>

        <!-- FUSSZEILE -->
        <tr>
          <td style="padding:28px 0 0;text-align:center;">
            <p style="margin:0 0 8px;font-size:12px;color:#8899BB;line-height:1.6;">
              Bei Fragen erreichen Sie uns unter <a href="mailto:info@vorsorgewaage.de" style="color:#0057FF;text-decoration:none;">info@vorsorgewaage.de</a>
            </p>
            <p style="margin:0;font-size:11px;color:#B0BFCC;">
              © 2026 Vorsorgewaage ·
              <a href="https://www.vorsorgewaage.de/impressum" style="color:#B0BFCC;text-decoration:none;">Impressum</a> ·
              <a href="https://www.vorsorgewaage.de/datenschutz" style="color:#B0BFCC;text-decoration:none;">Datenschutz</a>
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>
`;
}

const nichtAngefordert =
  "Falls Sie das nicht angefordert haben, können Sie diese E-Mail ignorieren – es ändert sich nichts.";

const vorlagen = {
  "confirm-signup.html": {
    vorlage: "Confirm signup",
    betreff: "Bitte bestätigen Sie Ihre E-Mail-Adresse – Vorsorgewaage",
    titel: "E-Mail-Adresse bestätigen",
    ueberschrift: "Fast geschafft!",
    unterzeile: "Bitte bestätigen Sie Ihre E-Mail-Adresse.",
    inhalt: `            ${p("Guten Tag,")}
            ${p(`vielen Dank für Ihre Registrierung bei Vorsorgewaage – den Vergleichsrechnern für Finanz- und
              Versicherungsberater. Damit Sie loslegen können, bestätigen Sie bitte Ihre E-Mail-Adresse
              <strong style="color:#1A1A2E;">{{ .Email }}</strong>:`, "margin-bottom:0;")}
${button("E-Mail-Adresse bestätigen")}
            ${hinweis("Der Link ist aus Sicherheitsgründen nur begrenzt gültig. Falls Sie sich nicht registriert haben, können Sie diese E-Mail ignorieren.")}
${funktionen}`,
  },

  "reset-password.html": {
    vorlage: "Reset Password",
    betreff: "Passwort zurücksetzen – Vorsorgewaage",
    titel: "Passwort zurücksetzen",
    ueberschrift: "Neues Passwort festlegen",
    unterzeile: "Sie haben angefordert, Ihr Passwort zurückzusetzen.",
    inhalt: `            ${p("Guten Tag,")}
            ${p(`für Ihr Konto <strong style="color:#1A1A2E;">{{ .Email }}</strong> wurde ein neues Passwort
              angefordert. Über den folgenden Button legen Sie es fest:`, "margin-bottom:0;")}
${button("Neues Passwort festlegen")}
            ${hinweis(`Der Link ist aus Sicherheitsgründen nur begrenzt gültig und nur einmal verwendbar. ${nichtAngefordert.replace("es ändert sich nichts", "Ihr bisheriges Passwort bleibt bestehen")}`)}`,
  },

  "magic-link.html": {
    vorlage: "Magic Link",
    betreff: "Ihr Anmeldelink – Vorsorgewaage",
    titel: "Anmelden",
    ueberschrift: "Ihr Anmeldelink",
    unterzeile: "Melden Sie sich mit einem Klick an – ganz ohne Passwort.",
    inhalt: `            ${p("Guten Tag,")}
            ${p(`hier ist Ihr persönlicher Anmeldelink für <strong style="color:#1A1A2E;">{{ .Email }}</strong>:`, "margin-bottom:0;")}
${button("Jetzt anmelden")}
            ${hinweis(`Der Link ist nur begrenzt gültig und nur einmal verwendbar. Leiten Sie diese E-Mail nicht weiter. ${nichtAngefordert}`)}`,
  },

  "change-email.html": {
    vorlage: "Change Email Address",
    betreff: "Neue E-Mail-Adresse bestätigen – Vorsorgewaage",
    titel: "E-Mail-Adresse ändern",
    ueberschrift: "E-Mail-Adresse ändern",
    unterzeile: "Bitte bestätigen Sie die Änderung.",
    inhalt: `            ${p("Guten Tag,")}
            ${p(`für Ihr Vorsorgewaage-Konto wurde eine Änderung der E-Mail-Adresse angefordert:`)}
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">
              <tr><td style="background:#F7F9FF;border-radius:10px;padding:16px 20px;font-size:14px;color:#445566;line-height:1.8;">
                bisher: <strong style="color:#1A1A2E;">{{ .Email }}</strong><br>
                neu: <strong style="color:#1A1A2E;">{{ .NewEmail }}</strong>
              </td></tr>
            </table>
            ${p("Bitte bestätigen Sie die Änderung:", "margin-bottom:0;")}
${button("Änderung bestätigen")}
            ${hinweis(`Falls Sie diese Änderung nicht angefordert haben, bestätigen Sie sie nicht und schreiben Sie uns bitte an <a href="mailto:info@vorsorgewaage.de" style="color:#0057FF;text-decoration:none;">info@vorsorgewaage.de</a>.`)}`,
  },

  "invite-user.html": {
    vorlage: "Invite user",
    betreff: "Einladung zu Vorsorgewaage",
    titel: "Einladung",
    ueberschrift: "Sie wurden eingeladen",
    unterzeile: "Ihr Zugang zu Vorsorgewaage ist vorbereitet.",
    inhalt: `            ${p("Guten Tag,")}
            ${p(`Sie wurden eingeladen, Vorsorgewaage zu nutzen – die Vergleichsrechner für Finanz- und
              Versicherungsberater. Nehmen Sie die Einladung für <strong style="color:#1A1A2E;">{{ .Email }}</strong>
              an und legen Sie Ihr Passwort fest:`, "margin-bottom:0;")}
${button("Einladung annehmen")}
            ${hinweis("Der Link ist nur begrenzt gültig. Falls Sie keine Einladung erwartet haben, können Sie diese E-Mail ignorieren.")}
${funktionen}`,
  },

  "password-changed.html": {
    vorlage: "Password changed (Security notifications)",
    betreff: "Ihr Passwort wurde geändert – Vorsorgewaage",
    titel: "Passwort geändert",
    ueberschrift: "Passwort wurde geändert",
    unterzeile: "Sicherheitshinweis zu Ihrem Konto",
    inhalt: `            ${p("Guten Tag,")}
            ${p(`das Passwort Ihres Vorsorgewaage-Kontos <strong style="color:#1A1A2E;">{{ .Email }}</strong> wurde soeben geändert.`)}
            ${p("Haben Sie die Änderung selbst vorgenommen, ist alles in Ordnung – Sie müssen nichts tun.")}
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 0;">
              <tr>
                <td style="background:#FFF8EC;border-left:4px solid #F59E0B;border-radius:8px;padding:16px 20px;">
                  <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#8A5A00;">Das waren nicht Sie?</p>
                  <p style="margin:0;font-size:13px;color:#8A5A00;line-height:1.6;">
                    Setzen Sie Ihr Passwort sofort über den Button zurück und informieren Sie uns unter
                    <a href="mailto:info@vorsorgewaage.de" style="color:#8A5A00;text-decoration:underline;">info@vorsorgewaage.de</a>.
                  </p>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
              <tr>
                <td align="center">
                  <a href="https://www.vorsorgewaage.de/reset-password" style="display:inline-block;background:#0057FF;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">
                    Passwort zurücksetzen
                  </a>
                </td>
              </tr>
            </table>`,
  },

  "reauthentication.html": {
    vorlage: "Reauthentication",
    betreff: "Ihr Bestätigungscode – Vorsorgewaage",
    titel: "Bestätigungscode",
    ueberschrift: "Ihr Bestätigungscode",
    unterzeile: "Zur Bestätigung einer sicherheitsrelevanten Änderung.",
    inhalt: `            ${p("Guten Tag,")}
            ${p("bitte geben Sie diesen Code in Vorsorgewaage ein, um fortzufahren:", "margin-bottom:0;")}
${code}
            ${hinweis(`Der Code ist nur kurz gültig. Geben Sie ihn niemandem weiter – auch nicht uns. ${nichtAngefordert}`)}`,
  },
};

fs.mkdirSync(zielOrdner, { recursive: true });
for (const [datei, v] of Object.entries(vorlagen)) {
  fs.writeFileSync(path.join(zielOrdner, datei), layout(v));
  console.log(`${datei.padEnd(24)} Betreff: ${v.betreff}`);
}
