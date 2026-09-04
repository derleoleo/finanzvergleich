import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Datenschutz() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-8">
          <ArrowLeft className="w-4 h-4" /> Zurück
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 mb-2">Datenschutzerklärung</h1>
        <p className="text-sm text-slate-500 mb-8">Stand: August 2026</p>

        <div className="space-y-8 text-slate-700 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">1. Verantwortlicher</h2>
            <address className="not-italic space-y-0.5">
              <p>Luisa Brandt, Einzelunternehmer</p>
              <p>Ernst-Bähre-Str. 3</p>
              <p>30453 Hannover</p>
              <p>E-Mail: <a href="mailto:info@rentencheck.app" className="text-blue-600 hover:underline">info@rentencheck.app</a></p>
            </address>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">2. Anwendungsbereich</h2>
            <p>
              Diese Plattform richtet sich ausschließlich an Unternehmer im Sinne des § 14 BGB
              (insbesondere Finanzberater und Vermittler). Eine Nutzung durch Verbraucher ist
              nicht vorgesehen.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">3. Hosting & Infrastruktur</h2>
            <p>Die Webanwendung wird gehostet bei:</p>
            <address className="not-italic mt-2 mb-3 pl-4 border-l-2 border-slate-200 space-y-0.5">
              <p className="font-medium">Vercel Inc.</p>
              <p>340 S Lemon Ave #4133</p>
              <p>Walnut, CA 91789, USA</p>
            </address>
            <p>
              Mit Vercel besteht ein Auftragsverarbeitungsvertrag gemäß Art. 28 DSGVO.
              Datenübermittlungen in die USA erfolgen auf Grundlage der EU-Standardvertragsklauseln
              (Art. 46 DSGVO).
            </p>
            <p className="mt-2">
              Im Rahmen des Hostings werden Server-Logfiles verarbeitet (u. a. IP-Adresse,
              Zeitstempel, Browserinformationen) zur Sicherstellung von Sicherheit und Stabilität.
            </p>
            <p className="mt-2 text-slate-500">Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.</p>
            <p className="mt-2">
              Schriftarten werden lokal von unseren Servern ausgeliefert. Es werden keine
              Verbindungen zu Google Fonts oder anderen externen Schriftdiensten aufgebaut.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">4. Registrierung & Nutzerkonto</h2>
            <p>Bei Registrierung und Nutzung werden folgende Daten verarbeitet:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>E-Mail-Adresse</li>
              <li>Passwort (gehashte Speicherung via Supabase Auth)</li>
              <li>Profilangaben (Name, Unternehmen, Anschrift, Telefon – freiwillig)</li>
              <li>Logo (Base64, optional)</li>
              <li>Abonnementstatus</li>
              <li>Serverseitig gespeicherte Berechnungen</li>
            </ul>

            <p className="mt-4 font-medium text-slate-800">Gespeicherte Berechnungsdaten:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Berechnungstitel (kann personenbezogene Bezüge enthalten)</li>
              <li>Geburtsjahr</li>
              <li>Finanzkennzahlen (Beitrag, Rückkaufswert, Laufzeit, Kapitalwerte)</li>
              <li>Annahmen zur Wertentwicklung</li>
              <li>Kostenparameter (Abschluss-, Verwaltungs-, Fonds-, Depotkosten)</li>
            </ul>

            <p className="mt-4">Die Speicherung erfolgt in einer PostgreSQL-Datenbank über:</p>
            <address className="not-italic mt-2 mb-3 pl-4 border-l-2 border-slate-200 space-y-0.5">
              <p className="font-medium">Supabase Inc.</p>
              <p>970 Trestle Glen Rd</p>
              <p>Oakland, CA 94610, USA</p>
            </address>
            <p>
              Die Datenbank-Region ist EU (Frankfurt).
              Mit Supabase besteht ein Auftragsverarbeitungsvertrag gemäß Art. 28 DSGVO.
            </p>
            <p className="mt-2 text-slate-500">Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">5. Rolle als Auftragsverarbeiter</h2>
            <p>
              Sofern Nutzer im Rahmen ihrer Tätigkeit personenbezogene Daten ihrer eigenen Kunden
              eingeben, handeln wir als Auftragsverarbeiter gemäß Art. 28 DSGVO.
            </p>
            <p className="mt-2">
              Ein Auftragsverarbeitungsvertrag (AVV) ist Bestandteil des Nutzungsvertrags und im
              Kundenbereich abrufbar.
            </p>
            <p className="mt-2">
              Nutzer werden ausdrücklich angehalten, keine Klarnamen in Berechnungstiteln zu verwenden.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">6. Zahlungsabwicklung</h2>
            <p>Die Zahlungsabwicklung erfolgt über:</p>
            <address className="not-italic mt-2 pl-4 border-l-2 border-slate-200 space-y-0.5">
              <p className="font-medium">Stripe Payments Europe Ltd.</p>
              <p>1 Grand Canal Street Lower</p>
              <p>Dublin, Irland</p>
            </address>
            <p className="mt-2">
              Stripe verarbeitet Zahlungsdaten eigenständig als Verantwortlicher.
            </p>
            <p className="mt-2 text-slate-500">
              Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">7. E-Mail-Versand</h2>
            <p>
              Für den Versand von Transaktions-E-Mails (z. B. Willkommens- und Vertragsmails)
              nutzen wir:
            </p>
            <address className="not-italic mt-2 mb-3 pl-4 border-l-2 border-slate-200 space-y-0.5">
              <p className="font-medium">Resend Inc.</p>
              <p>2261 Market Street #5039</p>
              <p>San Francisco, CA 94114, USA</p>
            </address>
            <p>
              Dabei wird Ihre E-Mail-Adresse verarbeitet. Mit Resend besteht ein
              Auftragsverarbeitungsvertrag gemäß Art. 28 DSGVO; Datenübermittlungen in die USA
              erfolgen auf Grundlage der EU-Standardvertragsklauseln (Art. 46 DSGVO).
            </p>
            <p className="mt-2 text-slate-500">Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">8. Fehlerdiagnose (Sentry)</h2>
            <p>
              Zur Erkennung und Behebung technischer Fehler setzen wir den Dienst Sentry ein:
            </p>
            <address className="not-italic mt-2 mb-3 pl-4 border-l-2 border-slate-200 space-y-0.5">
              <p className="font-medium">Functional Software Inc. (Sentry)</p>
              <p>45 Fremont Street, 8th Floor</p>
              <p>San Francisco, CA 94105, USA</p>
            </address>
            <p>
              Bei Anwendungsfehlern werden technische Informationen übertragen (u. a. Fehlermeldung,
              Browser- und Gerätedaten, IP-Adresse). Die Daten dienen ausschließlich der
              Fehlerdiagnose und werden nicht zu Werbe- oder Trackingzwecken verwendet.
              Mit Sentry besteht ein Auftragsverarbeitungsvertrag gemäß Art. 28 DSGVO;
              Datenübermittlungen in die USA erfolgen auf Grundlage der
              EU-Standardvertragsklauseln (Art. 46 DSGVO).
            </p>
            <p className="mt-2 text-slate-500">
              Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem
              stabilen und sicheren Betrieb).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">9. Feedback-Funktion</h2>
            <p>
              Über das Feedback-Formular übermittelte Angaben (Feedback-Art, Nachrichtentext und
              optional eine E-Mail-Adresse für Rückfragen) werden ausschließlich per E-Mail an uns
              weitergeleitet. Eine Speicherung in unserer Datenbank oder eine Zuordnung zu Ihrem
              Nutzerkonto findet nicht statt.
            </p>
            <p className="mt-3">
              Für die Zustellung nutzen wir den Formular-Dienst:
            </p>
            <p className="mt-2">
              <strong>Formspree, Inc.</strong>
              <br />
              2810 N Church St, Wilmington, DE 19802, USA
            </p>
            <p className="mt-3">
              Dabei werden die von Ihnen eingegebenen Inhalte sowie technische Verbindungsdaten
              (u. a. IP-Adresse) verarbeitet. Datenübermittlungen in die USA erfolgen auf Grundlage
              der EU-Standardvertragsklauseln (Art. 46 DSGVO).
              Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der
              Entgegennahme und Bearbeitung von Rückmeldungen zur Anwendung); bei Angabe einer
              E-Mail-Adresse zusätzlich Art. 6 Abs. 1 lit. a DSGVO (Einwilligung durch freiwillige
              Angabe).
            </p>
            <p className="mt-3 text-sm text-slate-600">
              Die Angabe einer E-Mail-Adresse ist freiwillig und nur erforderlich, wenn Sie eine
              Antwort wünschen. Bitte übermitteln Sie über dieses Formular keine personenbezogenen
              Daten Ihrer eigenen Kunden.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">10. Speicherdauer</h2>
            <p>Personenbezogene Daten werden gespeichert:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>solange der Nutzungsvertrag besteht,</li>
              <li>bis zur Löschung des Accounts durch den Nutzer,</li>
              <li>soweit gesetzliche Aufbewahrungspflichten (z. B. Steuerrecht) entgegenstehen.</li>
            </ul>
            <p className="mt-2">
              Nach Account-Löschung werden sämtliche nutzerbezogenen Berechnungsdaten innerhalb
              von 30 Tagen vollständig gelöscht oder anonymisiert.
            </p>
            <p className="mt-2">
              Server-Logs unterliegen den Speicherfristen der jeweiligen Hostinganbieter.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">11. Cookies & localStorage</h2>
            <p>Es werden ausschließlich technisch notwendige Speichertechnologien verwendet:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Supabase Session-Token (Authentifizierung)</li>
              <li>UI-Zwischenspeicher (Entwürfe, Einstellungen)</li>
              <li>Consent-Status</li>
            </ul>
            <p className="mt-2">Es erfolgt kein Tracking oder Analyse des Nutzerverhaltens.</p>
            <p className="mt-2 text-slate-500">
              Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO i. V. m. § 25 Abs. 2 Nr. 2 TDDDG.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">12. Datensicherheit</h2>
            <p>Es werden folgende Maßnahmen eingesetzt:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>TLS-Verschlüsselung (HTTPS)</li>
              <li>Passwort-Hashing (bcrypt)</li>
              <li>Row-Level-Security (RLS) in Supabase</li>
              <li>Zugriffsbeschränkungen</li>
              <li>Regelmäßige Updates</li>
              <li>Wöchentliche verschlüsselte Datenbank-Backups</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">13. Betroffenenrechte</h2>
            <p>
              Rechte gemäß Art. 15–21 DSGVO können per E-Mail geltend gemacht werden:{" "}
              <a href="mailto:info@rentencheck.app" className="text-blue-600 hover:underline">
                info@rentencheck.app
              </a>
            </p>
            <p className="mt-2">
              Darüber hinaus besteht gemäß Art. 77 DSGVO das Recht, Beschwerde bei einer
              Datenschutz-Aufsichtsbehörde einzulegen.
            </p>
            <p className="mt-2">
              Zuständige Aufsichtsbehörde: Die Landesbeauftragte für den Datenschutz Niedersachsen,
              Prinzenstraße 5, 30159 Hannover.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
