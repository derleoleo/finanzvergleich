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
        <p className="text-sm text-slate-500 mb-8">Stand: Februar 2026</p>

        <div className="space-y-8 text-slate-700 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">1. Verantwortlicher</h2>
            <p>
              Leonard Brandt, Ernst-Bähre-Str. 3, 30453 Hannover<br />
              E-Mail: <a href="mailto:info@rentencheck.app" className="text-blue-600 hover:underline">info@rentencheck.app</a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">2. Erhobene Daten und Zwecke</h2>

            <h3 className="font-semibold text-slate-800 mb-1 mt-4">2.1 Registrierung und Authentifizierung</h3>
            <p>
              Bei der Registrierung erheben wir Ihre E-Mail-Adresse und ein Passwort (gespeichert als Hash).
              Diese Daten werden über <strong>Supabase</strong> (Supabase Inc., 970 Trestle Glen Rd,
              Oakland, CA 94610, USA) verarbeitet, dessen Server für dieses Projekt in der EU (Frankfurt)
              betrieben werden. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
            </p>

            <h3 className="font-semibold text-slate-800 mb-1 mt-4">2.2 Profildaten und Berechnungen</h3>
            <p>
              Angaben im Nutzerprofil (Name, Unternehmen, Kontaktdaten, Logo) sowie gespeicherte
              Berechnungen werden in der Supabase-Datenbank (EU Frankfurt) gespeichert. Rechtsgrundlage:
              Art. 6 Abs. 1 lit. b DSGVO.
            </p>

            <h3 className="font-semibold text-slate-800 mb-1 mt-4">2.3 Zahlungsabwicklung</h3>
            <p>
              Zahlungen werden über <strong>Stripe</strong> (Stripe, Inc., 510 Townsend Street,
              San Francisco, CA 94103, USA) abgewickelt. Kreditkartendaten werden ausschließlich von Stripe
              verarbeitet und gelangen nicht auf unsere Server. Der Transfer in die USA erfolgt auf Basis
              der EU-Standardvertragsklauseln. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
            </p>

            <h3 className="font-semibold text-slate-800 mb-1 mt-4">2.4 Feedback-Formular</h3>
            <p>
              Über das Feedback-Formular in der App werden Nachrichten an <strong>Formspree</strong>
              (Formspree, Inc., USA) übertragen. Dabei werden die eingegebene Nachricht sowie optional
              eine E-Mail-Adresse verarbeitet. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO
              (berechtigtes Interesse an der Produktverbesserung).
            </p>

            <h3 className="font-semibold text-slate-800 mb-1 mt-4">2.5 Lokaler Browserspeicher (localStorage)</h3>
            <p>
              Berechnungsentwürfe und persönliche Voreinstellungen werden im localStorage Ihres Browsers
              gespeichert. Diese Daten verlassen Ihr Gerät nicht und werden nicht an Server übertragen.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">3. Cookies</h2>
            <p>
              Diese App verwendet keine Tracking- oder Marketing-Cookies. Lediglich ein technisch
              notwendiges Session-Token (von Supabase) wird im Browser gespeichert, um die Anmeldung
              aufrechtzuerhalten. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">4. Speicherdauer</h2>
            <p>
              Kontodaten werden bis zur Löschung des Nutzerkontos gespeichert. Zahlungsdaten werden
              entsprechend der gesetzlichen Aufbewahrungsfristen (§ 147 AO: 10 Jahre) aufbewahrt.
              Berechnungsdaten werden auf Wunsch des Nutzers gelöscht.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">5. Ihre Rechte</h2>
            <p>Sie haben das Recht auf:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Auskunft über gespeicherte personenbezogene Daten (Art. 15 DSGVO)</li>
              <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
              <li>Löschung Ihrer Daten (Art. 17 DSGVO)</li>
              <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
              <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
              <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
            </ul>
            <p className="mt-3">
              Zur Ausübung dieser Rechte wenden Sie sich an:{" "}
              <a href="mailto:info@rentencheck.app" className="text-blue-600 hover:underline">info@rentencheck.app</a>
            </p>
            <p className="mt-2">
              Sie haben zudem das Recht, sich bei der zuständigen Aufsichtsbehörde zu beschweren.
              In Niedersachsen: Die Landesbeauftragte für den Datenschutz Niedersachsen,
              <a href="https://www.lfd.niedersachsen.de" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                www.lfd.niedersachsen.de
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">6. Auftragsverarbeiter</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left p-2 border border-slate-200">Anbieter</th>
                    <th className="text-left p-2 border border-slate-200">Zweck</th>
                    <th className="text-left p-2 border border-slate-200">Sitz</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border border-slate-200">Supabase Inc.</td>
                    <td className="p-2 border border-slate-200">Authentifizierung, Datenbank</td>
                    <td className="p-2 border border-slate-200">USA (Server EU/Frankfurt)</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="p-2 border border-slate-200">Stripe, Inc.</td>
                    <td className="p-2 border border-slate-200">Zahlungsabwicklung</td>
                    <td className="p-2 border border-slate-200">USA (EU-SCCs)</td>
                  </tr>
                  <tr>
                    <td className="p-2 border border-slate-200">Formspree, Inc.</td>
                    <td className="p-2 border border-slate-200">Feedback-Formular</td>
                    <td className="p-2 border border-slate-200">USA (EU-SCCs)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
