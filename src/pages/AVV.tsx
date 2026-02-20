import { Link } from "react-router-dom";
import { ArrowLeft, Download } from "lucide-react";

export default function AVV() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-8">
          <ArrowLeft className="w-4 h-4" /> Zurück
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 mb-2">Auftragsverarbeitungsvertrag (AVV)</h1>
        <p className="text-sm text-slate-500 mb-2">Stand: Februar 2026 · Version 2026-02</p>
        <p className="text-sm text-slate-500 mb-8">
          gemäß Art. 28 DSGVO ·{" "}
          <Link to="/compliance" className="text-blue-600 hover:underline">Technische und organisatorische Maßnahmen</Link>
        </p>

        <a
          href="/compliance.pdf"
          download
          className="inline-flex items-center gap-2 text-sm font-medium bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors mb-10"
        >
          <Download className="w-4 h-4" />
          AVV als PDF herunterladen
        </a>

        <div className="space-y-8 text-slate-700 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 1 Gegenstand und Dauer der Auftragsverarbeitung</h2>
            <p>
              Dieser Auftragsverarbeitungsvertrag (nachfolgend „AVV") regelt die Verarbeitung
              personenbezogener Daten durch den Auftragnehmer (Anbieter der Plattform rentencheck.app,
              Leonard Brandt, Hannover) im Auftrag des Auftraggebers (registrierter Nutzer als
              Unternehmer i.S.d. § 14 BGB) im Rahmen der Nutzung der SaaS-Plattform.
            </p>
            <p className="mt-2">
              Der AVV gilt für die Dauer des Nutzungsvertrags und endet automatisch mit dessen
              Beendigung. Bei Vertragsende werden alle personenbezogenen Daten des Auftraggebers
              innerhalb von 30 Tagen gelöscht, sofern keine gesetzliche Aufbewahrungspflicht besteht.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 2 Art und Zweck der Verarbeitung</h2>
            <p>
              Der Auftragnehmer verarbeitet personenbezogene Daten ausschließlich zur Bereitstellung
              der SaaS-Plattform für die modellhafte Simulation und Analyse von
              Altersvorsorge- und Investmentszenarien.
            </p>
            <p className="mt-2">
              Eine Verarbeitung für eigene Zwecke des Auftragnehmers findet nicht statt. Die
              Verarbeitung erfolgt ausschließlich auf dokumentierte Weisung des Auftraggebers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 3 Kategorien betroffener Personen und Datenkategorien</h2>
            <p>Folgende Datenkategorien können verarbeitet werden:</p>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>Profildaten des Nutzers (Name, Unternehmen, E-Mail-Adresse)</li>
              <li>In Berechnungen eingegebene Parameterdaten (modellhafte Annahmen, keine echten Kundendaten erforderlich)</li>
              <li>Technische Zugriffsdaten (Session-Token, IP-Adresse, Browser-Informationen)</li>
            </ul>
            <p className="mt-2">
              <strong>Hinweis:</strong> Die Plattform ist für modellhafte Simulationen ausgelegt.
              Es wird empfohlen, keine echten personenbezogenen Kundendaten einzugeben.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 4 Pflichten des Auftragnehmers</h2>
            <p>Der Auftragnehmer verpflichtet sich:</p>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>Daten nur auf dokumentierte Weisung des Auftraggebers zu verarbeiten</li>
              <li>Zur Verschwiegenheit aller mit der Verarbeitung beauftragten Personen</li>
              <li>Alle erforderlichen technischen und organisatorischen Maßnahmen gemäß Art. 32 DSGVO zu ergreifen</li>
              <li>Subprozessoren nur nach vorheriger schriftlicher Genehmigung einzusetzen (Generalerlaubnis gemäß § 6 dieses AVV erteilt)</li>
              <li>Den Auftraggeber bei der Erfüllung von Betroffenenrechten zu unterstützen</li>
              <li>Nach Vertragsende alle Daten zu löschen oder zurückzugeben</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 5 Pflichten des Auftraggebers</h2>
            <p>Der Auftraggeber verpflichtet sich:</p>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>Den Auftragnehmer unverzüglich zu informieren, wenn in seinen Weisungen Fehler festgestellt werden</li>
              <li>Die Verarbeitung personenbezogener Daten im Rahmen der Plattform auf das notwendige Minimum zu beschränken</li>
              <li>Zugangsdaten vertraulich zu behandeln und nicht weiterzugeben</li>
              <li>Datenpannen, die seinen Verantwortungsbereich betreffen, unverzüglich zu melden</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 6 Subprozessoren</h2>
            <p>
              Der Auftraggeber erteilt hiermit eine allgemeine Genehmigung für den Einsatz der
              nachfolgend genannten Subprozessoren. Der Auftragnehmer informiert den Auftraggeber
              über geplante Änderungen mit angemessener Vorlaufzeit.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left p-2 font-semibold border border-slate-200">Subprozessor</th>
                    <th className="text-left p-2 font-semibold border border-slate-200">Zweck</th>
                    <th className="text-left p-2 font-semibold border border-slate-200">Sitz / Server</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border border-slate-200">Supabase Inc.</td>
                    <td className="p-2 border border-slate-200">Datenbank, Authentifizierung</td>
                    <td className="p-2 border border-slate-200">USA / EU (Frankfurt)</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="p-2 border border-slate-200">Vercel Inc.</td>
                    <td className="p-2 border border-slate-200">Hosting, CDN</td>
                    <td className="p-2 border border-slate-200">USA / EU (Frankfurt)</td>
                  </tr>
                  <tr>
                    <td className="p-2 border border-slate-200">Stripe Inc.</td>
                    <td className="p-2 border border-slate-200">Zahlungsabwicklung</td>
                    <td className="p-2 border border-slate-200">USA / EU (Dublin)</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="p-2 border border-slate-200">Resend Inc.</td>
                    <td className="p-2 border border-slate-200">Transaktionsmails</td>
                    <td className="p-2 border border-slate-200">USA / EU</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3">
              Alle Subprozessoren sind auf Basis von EU-Standardvertragsklauseln (SCC) oder einem
              angemessenen Datenschutzniveau eingebunden.{" "}
              <Link to="/compliance" className="text-blue-600 hover:underline">
                Vollständige Compliance-Übersicht →
              </Link>
            </p>
          </section>

        </div>

        <div className="mt-10 pt-8 border-t border-slate-200 flex flex-wrap gap-4 text-xs text-slate-400">
          <Link to="/agb" className="hover:text-slate-600">AGB</Link>
          <Link to="/datenschutz" className="hover:text-slate-600">Datenschutz</Link>
          <Link to="/compliance" className="hover:text-slate-600">Compliance</Link>
          <Link to="/impressum" className="hover:text-slate-600">Impressum</Link>
        </div>
      </div>
    </div>
  );
}
