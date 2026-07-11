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
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 3 Registrierung & Vertragsschluss</h2>
            <p>
              Mit Abschluss der Registrierung kommt ein unentgeltlicher Nutzungsvertrag über den
              kostenlosen Funktionsumfang (Basis-Plan) zustande. Durch Buchung eines
              kostenpflichtigen Abonnements wird der Vertrag um die gebuchten Premium-Funktionen
              erweitert.
            </p>
            <p className="mt-2">
              Der Anbieter ist berechtigt, Registrierungen ohne Angabe von Gründen abzulehnen.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 4 Preise & Zahlung</h2>
            <p>
              Es gelten die zum Zeitpunkt der Buchung in der aktuellen Preisübersicht
              (Seite „Premium") ausgewiesenen Preise. Die Preise verstehen sich zuzüglich
              gesetzlicher Umsatzsteuer, sofern diese anfällt.
            </p>
            <p className="mt-2">Die Abrechnung erfolgt im Voraus über den Zahlungsdienstleister Stripe.</p>
            <p className="mt-2">
              Bei Zahlungsverzug ist der Anbieter berechtigt, den Zugang zu den Premium-Funktionen
              nach vorheriger Ankündigung zu sperren, bis die offenen Beträge beglichen sind.
            </p>
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
            <p className="mt-2">
              Das Recht beider Parteien zur außerordentlichen Kündigung aus wichtigem Grund bleibt
              unberührt.
            </p>
            <p className="mt-2">
              Nach Vertragsende kann der Nutzer seinen Account selbst löschen; gespeicherte
              Berechnungsdaten werden danach gemäß der Datenschutzerklärung innerhalb von
              30 Tagen gelöscht. Bis zur Account-Löschung bleiben gespeicherte Berechnungen im
              kostenlosen Funktionsumfang einsehbar.
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
            <p>
              Der Anbieter strebt eine Verfügbarkeit von 98 % im Jahresmittel an. Nicht in die
              Berechnung einbezogen werden angekündigte Wartungsfenster sowie Ausfälle, die
              außerhalb des Einflussbereichs des Anbieters liegen (z. B. höhere Gewalt, Störungen
              bei Dritt-Infrastruktur).
            </p>
            <p className="mt-2">Ein Anspruch auf ununterbrochene Verfügbarkeit besteht nicht.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 10 Änderungen der AGB</h2>
            <p>
              Der Anbieter kann diese AGB mit Wirkung für die Zukunft ändern, soweit dies für den
              Nutzer zumutbar ist. Änderungen werden mindestens vier Wochen vor Inkrafttreten in
              Textform (z. B. per E-Mail) angekündigt. Widerspricht der Nutzer nicht innerhalb der
              Frist oder nutzt er die Plattform nach Inkrafttreten weiter, gelten die geänderten
              AGB als angenommen; hierauf wird in der Ankündigung gesondert hingewiesen.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 11 Schlussbestimmungen</h2>
            <p>Es gilt deutsches Recht. Gerichtsstand ist Hannover.</p>
            <p className="mt-2">
              Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder werden, bleibt die
              Wirksamkeit der übrigen Bestimmungen unberührt.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
