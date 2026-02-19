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
              Diese Allgemeinen Geschäftsbedingungen gelten für die Nutzung der Webanwendung
              RentenCheck (rentencheck.app), betrieben von Leonard Brandt, Ernst-Bähre-Str. 3,
              30453 Hannover (nachfolgend „Anbieter"). Mit der Registrierung akzeptiert der Nutzer
              diese AGB.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 2 Leistungsbeschreibung</h2>
            <p>
              RentenCheck ist eine Softwareanwendung, die Vergleichsrechnungen für Finanzprodukte
              (insbesondere Lebensversicherungen und Fondsdepots) ermöglicht. Die Ergebnisse dienen
              der Orientierung und stellen keine Finanz-, Anlage- oder Steuerberatung dar.
            </p>
            <p className="mt-2">
              Der Anbieter stellt folgende Pläne bereit:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Free:</strong> Kostenloser Zugang mit eingeschränktem Funktionsumfang (3 Berechnungen/Monat)</li>
              <li><strong>Pro:</strong> Erweiterter Zugang mit allen Rechnern und PDF-Export (10 Berechnungen/Monat)</li>
              <li><strong>Unlimited:</strong> Vollzugang inkl. eigenem Branding und unbegrenzten Berechnungen</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 3 Registrierung und Konto</h2>
            <p>
              Die Nutzung erfordert eine Registrierung mit E-Mail-Adresse und Passwort. Der Nutzer
              ist verpflichtet, seine Zugangsdaten vertraulich zu behandeln. Falsche Angaben bei
              der Registrierung berechtigen den Anbieter zur Sperrung des Kontos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 4 Preise und Zahlung</h2>
            <p>
              Die aktuellen Preise sind auf der Preisseite (rentencheck.app/pricing) einsehbar.
              Die Abrechnung erfolgt monatlich oder jährlich im Voraus über den Zahlungsdienstleister
              Stripe. Alle Preise verstehen sich inklusive der gesetzlichen Mehrwertsteuer.
            </p>
            <p className="mt-2">
              Paid-Pläne werden mit einem <strong>14-tägigen kostenlosen Testzeitraum</strong> angeboten.
              Während des Testzeitraums entstehen keine Kosten; nach Ablauf wird das Abonnement
              automatisch kostenpflichtig, sofern es nicht vorher gekündigt wurde.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 5 Laufzeit und Kündigung</h2>
            <p>
              Abonnements laufen monatlich oder jährlich und verlängern sich automatisch, sofern
              sie nicht vor Ablauf der Laufzeit gekündigt werden. Die Kündigung ist jederzeit über
              das Kundenportal (Stripe Customer Portal) möglich und wirkt zum Ende der bezahlten
              Laufzeit. Nach der Kündigung wechselt das Konto automatisch in den Free-Plan.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 6 Widerrufsrecht</h2>
            <p>
              Verbraucher haben ein gesetzliches Widerrufsrecht von 14 Tagen ab Vertragsschluss.
              Das Widerrufsrecht erlischt vorzeitig, wenn der Anbieter mit der Ausführung der
              Dienstleistung begonnen hat und der Verbraucher ausdrücklich zugestimmt hat.
            </p>
            <p className="mt-2 font-semibold">Widerrufsbelehrung:</p>
            <p className="mt-1 p-3 bg-slate-100 rounded-lg text-xs">
              Sie haben das Recht, binnen 14 Tagen ohne Angabe von Gründen diesen Vertrag zu
              widerrufen. Die Widerrufsfrist beträgt 14 Tage ab dem Tag des Vertragsschlusses.
              Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (Leonard Brandt,
              info@rentencheck.app) mittels einer eindeutigen Erklärung über Ihren Entschluss,
              diesen Vertrag zu widerrufen, informieren.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 7 Haftungsbeschränkung</h2>
            <p>
              Der Anbieter haftet nur für Schäden, die auf vorsätzlichem oder grob fahrlässigem
              Verhalten beruhen. Die Haftung für leichte Fahrlässigkeit ist – soweit gesetzlich
              zulässig – ausgeschlossen. Insbesondere wird keine Haftung für die Richtigkeit der
              Berechnungsergebnisse oder für Entscheidungen übernommen, die auf Basis dieser
              Ergebnisse getroffen werden.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 8 Verfügbarkeit</h2>
            <p>
              Der Anbieter strebt eine hohe Verfügbarkeit des Dienstes an, übernimmt jedoch keine
              Garantie für eine ununterbrochene Verfügbarkeit. Wartungsarbeiten werden nach
              Möglichkeit zu nutzungsarmen Zeiten durchgeführt.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 9 Datenschutz</h2>
            <p>
              Informationen zur Verarbeitung personenbezogener Daten finden Sie in unserer{" "}
              <Link to="/datenschutz" className="text-blue-600 hover:underline">Datenschutzerklärung</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 10 Änderungen der AGB</h2>
            <p>
              Der Anbieter behält sich vor, diese AGB mit einer Frist von 30 Tagen zu ändern.
              Nutzer werden per E-Mail über Änderungen informiert. Die fortgesetzte Nutzung nach
              Ablauf der Frist gilt als Zustimmung.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 11 Schlussbestimmungen</h2>
            <p>
              Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Gerichtsstand ist,
              soweit gesetzlich zulässig, Hannover. Sollten einzelne Bestimmungen dieser AGB
              unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
