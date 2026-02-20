import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function AGB() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-8">
          <ArrowLeft className="w-4 h-4" /> Zurück
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 mb-2">Allgemeine Geschäftsbedingungen</h1>
        <p className="text-sm text-slate-500 mb-8">Stand: Februar 2026</p>

        <div className="space-y-8 text-slate-700 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 1 Geltungsbereich</h2>
            <p>
              Diese Plattform richtet sich ausschließlich an Unternehmer im Sinne des § 14 BGB.
              Ein Vertragsschluss mit Verbrauchern ist ausgeschlossen.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 2 Vertragsgegenstand</h2>
            <p>
              Bereitstellung einer webbasierten Software zur modellhaften Simulation und Analyse
              von Altersvorsorge- und Investmentszenarien.
            </p>
            <p className="mt-2">Es erfolgt keine Finanz-, Steuer- oder Rechtsberatung.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 3 Registrierung</h2>
            <p>
              Der Vertrag kommt zustande durch Registrierung und Abschluss eines kostenpflichtigen
              Abonnements.
            </p>
            <p className="mt-2">
              Der Anbieter ist berechtigt, Registrierungen ohne Angabe von Gründen abzulehnen.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 4 Preise</h2>
            <p>
              Die Preise verstehen sich zuzüglich gesetzlicher Umsatzsteuer, sofern diese anfällt.
            </p>
            <p className="mt-2">Die Abrechnung erfolgt im Voraus.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 5 Laufzeit & Kündigung</h2>
            <p>
              Abonnements verlängern sich automatisch um die gewählte Laufzeit, sofern nicht vor
              Ablauf gekündigt wird.
            </p>
            <p className="mt-2">
              Kündigungen können jederzeit über das Kundenportal erfolgen und wirken zum Ende der
              laufenden Abrechnungsperiode.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 6 Nutzungsrechte</h2>
            <p>Der Nutzer erhält ein einfaches, nicht übertragbares Nutzungsrecht.</p>
            <p className="mt-2">Eine Weitergabe von Zugangsdaten ist unzulässig.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 7 Datenverarbeitung</h2>
            <p>
              Sofern personenbezogene Daten eingegeben werden, handelt der Anbieter als
              Auftragsverarbeiter gemäß Art. 28 DSGVO.
            </p>
            <p className="mt-2">Der AVV ist Bestandteil des Vertrags.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 8 Haftung</h2>
            <p>Unbeschränkte Haftung bei Vorsatz und grober Fahrlässigkeit.</p>
            <p className="mt-2">
              Bei leichter Fahrlässigkeit Haftung nur bei Verletzung wesentlicher
              Vertragspflichten, begrenzt auf den vertragstypischen Schaden.
            </p>
            <p className="mt-2">
              Die Berechnungen beruhen auf modellhaften Annahmen und vom Nutzer eingegebenen
              Parametern. Eine Gewähr für steuerliche oder rechtliche Richtigkeit wird nicht
              übernommen.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 9 Verfügbarkeit</h2>
            <p>Angestrebte Jahresverfügbarkeit: 98 %.</p>
            <p className="mt-2">Kein Anspruch auf ununterbrochene Verfügbarkeit.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 10 Schlussbestimmungen</h2>
            <p>Es gilt deutsches Recht. Gerichtsstand ist Hannover.</p>
          </section>

        </div>
      </div>
    </div>
  );
}
