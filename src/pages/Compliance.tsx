import { Link } from "react-router-dom";
import { ArrowLeft, Download, Shield } from "lucide-react";

export default function Compliance() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-8">
          <ArrowLeft className="w-4 h-4" /> Zurück
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-7 h-7 text-slate-700" />
          <h1 className="text-3xl font-bold text-slate-900">Compliance & Datenschutz</h1>
        </div>
        <p className="text-sm text-slate-500 mb-8">Stand: Februar 2026</p>

        <a
          href="/compliance.pdf"
          download
          className="inline-flex items-center gap-2 text-sm font-medium bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors mb-10"
        >
          <Download className="w-4 h-4" />
          AVV & TOM als PDF herunterladen
        </a>

        <div className="space-y-10 text-slate-700 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Technische und organisatorische Maßnahmen (TOM)</h2>
            <p className="mb-4 text-slate-600">
              Gemäß Art. 32 DSGVO hat der Anbieter folgende Maßnahmen zum Schutz personenbezogener
              Daten implementiert:
            </p>
            <div className="space-y-3">
              {[
                {
                  title: "Zugangskontrolle",
                  desc: "Authentifizierung über Supabase Auth (E-Mail + Passwort). Passwörter werden ausschließlich als bcrypt-Hash gespeichert. Row-Level-Security (RLS) stellt sicher, dass Nutzer nur auf eigene Daten zugreifen.",
                },
                {
                  title: "Transportverschlüsselung",
                  desc: "Alle Verbindungen erfolgen ausschließlich über HTTPS/TLS 1.2+. Unverschlüsselte Verbindungen werden automatisch weitergeleitet.",
                },
                {
                  title: "Verschlüsselung ruhender Daten",
                  desc: "Datenbank-Volumes bei Supabase sind AES-256-verschlüsselt.",
                },
                {
                  title: "Pseudonymisierung",
                  desc: "Berechnungen und Profildaten werden unter UUIDs (User-IDs) gespeichert, nicht unter Klarnamen im Systemkontext.",
                },
                {
                  title: "Backup & Wiederherstellung",
                  desc: "Tägliche automatische Backups durch Supabase mit Point-in-Time-Recovery. Wiederherstellungszeit (RTO) < 4 Stunden.",
                },
                {
                  title: "Incident-Management",
                  desc: "Sicherheitsvorfälle werden gemäß Art. 33 DSGVO innerhalb von 72 Stunden an die zuständige Aufsichtsbehörde gemeldet. Betroffene Nutzer werden unverzüglich informiert.",
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-3 bg-white rounded-xl p-4 border border-slate-100">
                  <Shield className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <p className="text-slate-600 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Subprozessoren</h2>
            <p className="mb-4 text-slate-600">
              Folgende Dienstleister werden als Subprozessoren gemäß Art. 28 DSGVO eingesetzt.
              Alle sind auf Basis von EU-Standardvertragsklauseln (SCC) oder einem angemessenen
              Datenschutzniveau eingebunden.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left p-3 font-semibold border border-slate-200">Subprozessor</th>
                    <th className="text-left p-3 font-semibold border border-slate-200">Zweck</th>
                    <th className="text-left p-3 font-semibold border border-slate-200">Server-Standort</th>
                    <th className="text-left p-3 font-semibold border border-slate-200">Rechtsgrundlage</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-3 border border-slate-200 font-medium">Supabase Inc.</td>
                    <td className="p-3 border border-slate-200">Datenbank, Authentifizierung, Storage</td>
                    <td className="p-3 border border-slate-200">EU (Frankfurt, AWS eu-central-1)</td>
                    <td className="p-3 border border-slate-200">SCC + DPA</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="p-3 border border-slate-200 font-medium">Vercel Inc.</td>
                    <td className="p-3 border border-slate-200">Hosting, CDN, Serverless Functions</td>
                    <td className="p-3 border border-slate-200">EU (Frankfurt)</td>
                    <td className="p-3 border border-slate-200">SCC + DPA</td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-slate-200 font-medium">Stripe Inc.</td>
                    <td className="p-3 border border-slate-200">Zahlungsabwicklung, Abonnementverwaltung</td>
                    <td className="p-3 border border-slate-200">EU (Dublin)</td>
                    <td className="p-3 border border-slate-200">SCC + DPA</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="p-3 border border-slate-200 font-medium">Resend Inc.</td>
                    <td className="p-3 border border-slate-200">Transaktionsmails (Bestätigung, Willkommen)</td>
                    <td className="p-3 border border-slate-200">EU (AWS eu-west-1)</td>
                    <td className="p-3 border border-slate-200">SCC + DPA</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Auftragsverarbeitungsvertrag (AVV)</h2>
            <p>
              Der AVV gemäß Art. 28 DSGVO ist Bestandteil jedes Nutzungsvertrags. Er wird bei
              der Registrierung akzeptiert und steht als PDF zum Download bereit.
            </p>
            <div className="mt-4 flex gap-4">
              <Link to="/legal/avv" className="text-blue-600 hover:underline text-sm">
                AVV online lesen →
              </Link>
              <a href="/compliance.pdf" download className="text-blue-600 hover:underline text-sm">
                AVV als PDF →
              </a>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Kein Tracking, keine Werbung</h2>
            <p>
              Diese Plattform verwendet keine Analyse-Tools von Drittanbietern (kein Google Analytics,
              kein Facebook Pixel, kein Hotjar). Es werden ausschließlich technisch notwendige Cookies
              und Session-Daten verarbeitet.
            </p>
          </section>

        </div>

        <div className="mt-10 pt-8 border-t border-slate-200 flex flex-wrap gap-4 text-xs text-slate-400">
          <Link to="/legal/avv" className="hover:text-slate-600">AVV</Link>
          <Link to="/agb" className="hover:text-slate-600">AGB</Link>
          <Link to="/datenschutz" className="hover:text-slate-600">Datenschutz</Link>
          <Link to="/impressum" className="hover:text-slate-600">Impressum</Link>
        </div>
      </div>
    </div>
  );
}
