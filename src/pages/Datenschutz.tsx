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

          {/* 1 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">1. Verantwortlicher</h2>
            <p>Verantwortlicher im Sinne der DSGVO ist:</p>
            <address className="not-italic mt-2 space-y-0.5">
              <p>Leonard Brandt</p>
              <p>Ernst-Bähre-Str. 3, 30453 Hannover</p>
              <p>E-Mail: <a href="mailto:info@rentencheck.app" className="text-blue-600 hover:underline">info@rentencheck.app</a></p>
              <p className="text-slate-400 italic">Telefon: [PLATZHALTER]</p>
              <p className="text-slate-400 italic">USt-IdNr.: [PLATZHALTER – falls vorhanden]</p>
            </address>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">2. Allgemeine Hinweise zur Datenverarbeitung</h2>
            <p>
              Wir verarbeiten personenbezogene Daten ausschließlich im Einklang mit der
              Datenschutz-Grundverordnung (DSGVO), dem Bundesdatenschutzgesetz (BDSG),
              dem Digitale-Dienste-Gesetz (DDG) sowie dem
              Telekommunikation-Digitale-Dienste-Datenschutz-Gesetz (TDDDG).
            </p>
            <p className="mt-2">
              Personenbezogene Daten sind alle Informationen, die sich auf eine identifizierte
              oder identifizierbare natürliche Person beziehen.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">3. Hosting & Infrastruktur</h2>
            <p>
              Unsere Webanwendung wird gehostet bei <strong>Vercel Inc.</strong>, 340 S Lemon Ave #4133,
              Walnut, CA 91789, USA. Mit Vercel besteht ein Auftragsverarbeitungsvertrag (AVV) nach
              Art. 28 DSGVO. Die Übermittlung von Daten in die USA erfolgt auf Basis der
              EU-Standardvertragsklauseln (SCC).
            </p>
            <p className="mt-2">
              Im Rahmen des Hostings werden durch Vercel Server-Logfiles gespeichert, einschließlich
              der IP-Adresse des zugreifenden Geräts. Die Speicherdauer beträgt bis zu 30 Tage.
              Die Verarbeitung erfolgt zur Sicherstellung der Systemsicherheit und Stabilität.
            </p>
            <p className="mt-2">
              Sofern eine Verarbeitung außerhalb der EU erfolgt, geschieht diese auf Grundlage
              der EU-Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO).
            </p>
            <p className="mt-2">
              Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem
              sicheren und stabilen Betrieb der Plattform).
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">4. Zugriffsdaten / Server-Logs</h2>
            <p>Beim Aufruf der Website verarbeitet Vercel automatisch folgende Daten:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>IP-Adresse (gekürzt)</li>
              <li>Datum und Uhrzeit des Zugriffs</li>
              <li>Browsertyp und -version</li>
              <li>Betriebssystem</li>
              <li>Referrer-URL</li>
              <li>Angeforderte Seite / Ressource</li>
            </ul>
            <p className="mt-2">
              <strong>Zweck:</strong> Sicherstellung der Systemsicherheit und Stabilität.<br />
              <strong>Speicherdauer:</strong> Gemäß den Aufbewahrungsfristen von Vercel, aktuell bis zu 30 Tage.<br />
              <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">5. Registrierung & Nutzerkonto</h2>
            <p>Bei Erstellung eines Accounts verarbeiten wir:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>E-Mail-Adresse</li>
              <li>Passwort (gespeichert als verschlüsselter Hash)</li>
              <li>Profilangaben (Name, Unternehmen, Anschrift, Telefon) – freiwillig</li>
              <li>Logo (nur im Unlimited-Plan) – freiwillig</li>
              <li>Abonnement-Status und gespeicherte Berechnungen</li>
            </ul>
            <p className="mt-2">
              Die Verarbeitung erfolgt über <strong>Supabase</strong> (Supabase Inc., 970 Trestle Glen Rd,
              Oakland, CA 94610, USA), dessen Server für dieses Projekt in der <strong>EU (Frankfurt/Main)</strong>{" "}
              betrieben werden. Mit Supabase besteht ein AVV gemäß Art. 28 DSGVO.
            </p>
            <p className="mt-2">
              <strong>Zweck:</strong> Bereitstellung der SaaS-Funktionalitäten.<br />
              <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).<br />
              <strong>Speicherdauer:</strong> Bis zur Löschung des Nutzerkontos.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">6. Zahlungsabwicklung</h2>
            <p>
              Die Zahlungsabwicklung erfolgt über <strong>Stripe Payments Europe Ltd.</strong>,
              1 Grand Canal Street Lower, Grand Canal Dock, Dublin, D02 H210, Irland.
              Mit Stripe besteht ein AVV nach Art. 28 DSGVO.
            </p>
            <p className="mt-2">Verarbeitete Daten:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Rechnungs- und Kontaktdaten</li>
              <li>Zahlungsdaten (Kreditkartendaten werden ausschließlich von Stripe verarbeitet – unsere Server sehen diese nicht)</li>
              <li>Transaktions-ID und Abonnement-Status</li>
            </ul>
            <p className="mt-2">
              <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">7. Verarbeitung von Kundendaten durch Berater</h2>
            <p>
              Nutzer der Plattform (insbesondere Finanzberater) können im Rahmen ihrer Tätigkeit
              personenbezogene Daten ihrer eigenen Kunden in die Rechner eingeben (z. B. Geburtsjahr,
              gewünschtes Renteneinkommen).
            </p>
            <p className="mt-2">
              In diesem Fall handeln wir als <strong>Auftragsverarbeiter</strong> gemäß Art. 28 DSGVO.
              Die Verarbeitung erfolgt ausschließlich nach Weisung des Nutzers als Verantwortlichem.
              Ein Auftragsverarbeitungsvertrag (AVV) wird auf Anfrage bereitgestellt.
            </p>
            <p className="mt-2">
              <strong>Rechtsgrundlage:</strong> Art. 28 DSGVO i. V. m. dem zwischen den Parteien
              geschlossenen AVV.<br />
              <strong>Kontakt für AVV-Anfragen:</strong>{" "}
              <a href="mailto:info@rentencheck.app" className="text-blue-600 hover:underline">info@rentencheck.app</a>
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">8. Feedback-Formular</h2>
            <p>
              Das optionale Feedback-Formular in der Seitenleiste sendet Nachrichten an{" "}
              <strong>Formspree Inc.</strong> (USA). Übermittelt werden: Feedbacktyp, Nachrichtentext
              sowie optional die E-Mail-Adresse. Die Übermittlung in die USA erfolgt auf Basis der
              EU-Standardvertragsklauseln. Daten werden nur bei aktiver Nutzung des Formulars übertragen.
            </p>
            <p className="mt-2">
              <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse
              an der Produktverbesserung).
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">9. Analyse-Tools</h2>
            <p>
              Wir setzen derzeit <strong>keine</strong> Analyse- oder Tracking-Tools (z. B.
              Google Analytics, Plausible) ein. Es wird kein Nutzerverhalten aufgezeichnet oder
              an Dritte übermittelt.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">10. Cookies & Browser-Speicher (localStorage)</h2>
            <p>Wir verwenden ausschließlich technisch notwendige Speichertechnologien:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>
                <strong>Session-Token (Supabase):</strong> Hält die Anmeldung aufrecht –
                gespeichert im localStorage Ihres Browsers.
              </li>
              <li>
                <strong>Berechnungsentwürfe:</strong> Zwischenspeicher für laufende Eingaben –
                verbleiben lokal, verlassen Ihr Gerät nicht.
              </li>
              <li>
                <strong>Voreinstellungen:</strong> Persönliche Standardwerte für die Rechner –
                ebenfalls nur lokal gespeichert.
              </li>
              <li>
                <strong>Consent-Flag:</strong> Speichert, ob Sie den Cookie-Hinweis bestätigt haben.
              </li>
            </ul>
            <p className="mt-2">
              Es werden <strong>keine</strong> Tracking-, Werbe- oder Drittanbieter-Cookies gesetzt.
              Ein Cookie-Opt-in ist daher für den Betrieb dieser Plattform nicht erforderlich.
            </p>
            <p className="mt-2">
              <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b und lit. f DSGVO i. V. m.
              § 25 Abs. 2 Nr. 2 TDDDG (technisch notwendig).
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">11. Speicherdauer</h2>
            <p>Wir speichern personenbezogene Daten nur so lange, wie:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>der Nutzungsvertrag besteht,</li>
              <li>gesetzliche Aufbewahrungspflichten greifen (z. B. § 147 AO: 10 Jahre für Buchungsbelege),</li>
              <li>oder berechtigte Interessen eine weitere Speicherung erfordern.</li>
            </ul>
            <p className="mt-2">
              Nach Wegfall des Speichergrunds erfolgt Löschung oder Anonymisierung.
              Kontodaten werden bei Account-Löschung auf Anfrage vollständig gelöscht.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">12. Ihre Rechte als betroffene Person</h2>
            <p>Sie haben das Recht auf:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Auskunft über gespeicherte Daten (Art. 15 DSGVO)</li>
              <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
              <li>Löschung Ihrer Daten (Art. 17 DSGVO)</li>
              <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
              <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
              <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
              <li>Widerruf einer erteilten Einwilligung mit Wirkung für die Zukunft</li>
              <li>Beschwerde bei der zuständigen Aufsichtsbehörde</li>
            </ul>
            <p className="mt-3">
              Anfragen richten Sie an:{" "}
              <a href="mailto:info@rentencheck.app" className="text-blue-600 hover:underline">info@rentencheck.app</a>
            </p>
            <p className="mt-2">
              Zuständige Aufsichtsbehörde (Niedersachsen):{" "}
              <strong>Die Landesbeauftragte für den Datenschutz Niedersachsen</strong>,{" "}
              <a href="https://www.lfd.niedersachsen.de" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                www.lfd.niedersachsen.de
              </a>
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">13. Datensicherheit</h2>
            <p>Wir setzen folgende technische und organisatorische Maßnahmen ein:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>TLS-Verschlüsselung für alle Datenübertragungen (HTTPS)</li>
              <li>Verschlüsselte Passwortspeicherung (bcrypt via Supabase Auth)</li>
              <li>Zugriffsbeschränkungen durch Row-Level-Security (RLS) in der Datenbank</li>
              <li>Rollen- und Berechtigungssystem (Service-Role Key nur serverseitig)</li>
              <li>Regelmäßige Sicherheitsupdates der eingesetzten Abhängigkeiten</li>
            </ul>
          </section>

          {/* 14 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">14. Automatisierte Entscheidungen</h2>
            <p>
              Eine ausschließlich automatisierte Entscheidungsfindung im Sinne von Art. 22 DSGVO,
              die rechtliche oder ähnlich erhebliche Wirkungen für Sie entfaltet, findet nicht statt.
            </p>
          </section>

          {/* 15 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">15. Auftragsverarbeiter-Übersicht</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left p-2 border border-slate-200">Anbieter</th>
                    <th className="text-left p-2 border border-slate-200">Zweck</th>
                    <th className="text-left p-2 border border-slate-200">Sitz / Transfer</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border border-slate-200">Vercel Inc.</td>
                    <td className="p-2 border border-slate-200">Hosting, Server-Logs</td>
                    <td className="p-2 border border-slate-200">USA (SCCs)</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="p-2 border border-slate-200">Supabase Inc.</td>
                    <td className="p-2 border border-slate-200">Authentifizierung, Datenbank</td>
                    <td className="p-2 border border-slate-200">USA (Server EU/Frankfurt)</td>
                  </tr>
                  <tr>
                    <td className="p-2 border border-slate-200">Stripe Payments Europe Ltd.</td>
                    <td className="p-2 border border-slate-200">Zahlungsabwicklung</td>
                    <td className="p-2 border border-slate-200">Irland (EU)</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="p-2 border border-slate-200">Formspree Inc.</td>
                    <td className="p-2 border border-slate-200">Feedback-Formular</td>
                    <td className="p-2 border border-slate-200">USA (SCCs)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 16 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">16. Änderungen dieser Datenschutzerklärung</h2>
            <p>
              Wir behalten uns vor, diese Datenschutzerklärung anzupassen, soweit dies durch
              Änderungen der rechtlichen Rahmenbedingungen oder unserer Dienste erforderlich wird.
              Die jeweils aktuelle Version ist stets unter{" "}
              <strong>rentencheck.app/datenschutz</strong> abrufbar. Bei wesentlichen Änderungen
              informieren wir registrierte Nutzer per E-Mail.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
