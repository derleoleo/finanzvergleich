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

          {/* §1 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 1 Geltungsbereich</h2>
            <p>
              Diese Allgemeinen Geschäftsbedingungen gelten für alle Verträge zwischen
            </p>
            <address className="not-italic mt-2 mb-2 pl-4 border-l-2 border-slate-200 space-y-0.5">
              <p>Leonard Brandt <span className="text-slate-400 italic">[Rechtsform: PLATZHALTER, z. B. „Einzelunternehmer"]</span></p>
              <p>Ernst-Bähre-Str. 3, 30453 Hannover</p>
              <p>E-Mail: <a href="mailto:info@rentencheck.app" className="text-blue-600 hover:underline">info@rentencheck.app</a></p>
              <p className="text-slate-400 italic">Telefon: [PLATZHALTER]</p>
            </address>
            <p>(nachfolgend „Anbieter") und den Nutzern der Plattform RentenCheck.app.</p>
            <p className="mt-2">
              Die Plattform richtet sich primär an <strong>Unternehmer</strong> im Sinne von § 14 BGB
              (insbesondere Finanzberater und Vermittler). Verbraucher im Sinne von § 13 BGB können
              die Plattform nur nutzen, sofern sie den Vertragsabschluss als Privatperson vornehmen;
              in diesem Fall gelten zusätzlich die Verbraucherschutzvorschriften.
            </p>
            <p className="mt-2">
              Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts (CISG).
            </p>
          </section>

          {/* §2 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 2 Vertragsgegenstand</h2>
            <p>
              Der Anbieter stellt eine webbasierte Software zur Analyse und Simulation von
              Altersvorsorge- und Investmentszenarien bereit (Software-as-a-Service). Es handelt
              sich um ein digitales Tool; eine Finanz-, Steuer- oder Rechtsberatung wird
              ausdrücklich <strong>nicht</strong> erbracht.
            </p>
            <p className="mt-2">
              Die bereitgestellten Berechnungen stellen keine verbindlichen Angebote oder
              garantierten Ergebnisse dar.
            </p>
            <p className="mt-2">Der Anbieter stellt folgende Pläne bereit:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Free:</strong> Kostenloser Zugang mit eingeschränktem Funktionsumfang (3 Berechnungen/Monat)</li>
              <li><strong>Pro:</strong> Erweiterter Zugang mit allen Rechnern, PDF-Export und Voreinstellungen (10 Berechnungen/Monat)</li>
              <li><strong>Unlimited:</strong> Vollzugang inkl. eigenem Branding (Logo auf PDF-Exporten) und unbegrenzten Berechnungen</li>
            </ul>
            <p className="mt-2">
              Der aktuelle Funktionsumfang der Pläne ist auf{" "}
              <strong>rentencheck.app/pricing</strong> einsehbar und kann sich im Rahmen von
              § 11 weiterentwickeln.
            </p>
          </section>

          {/* §3 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 3 Registrierung und Vertragsschluss</h2>
            <p>Der Vertrag kommt zustande durch:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Registrierung mit E-Mail-Adresse und Passwort,</li>
              <li>Bestätigung der E-Mail-Adresse,</li>
              <li>Auswahl eines kostenpflichtigen Plans und Abschluss des Zahlungsvorgangs.</li>
            </ol>
            <p className="mt-2">
              Mit Abschluss des Registrierungsprozesses gibt der Nutzer ein verbindliches Angebot
              auf Abschluss eines Nutzungsvertrags ab. Der Anbieter kann Registrierungen ohne
              Angabe von Gründen ablehnen. Der Nutzer muss zum Zeitpunkt des Vertragsschlusses
              mindestens 18 Jahre alt sein.
            </p>
          </section>

          {/* §4 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 4 Preise und Zahlungsmodalitäten</h2>
            <p>
              Die jeweils gültigen Preise sind auf <strong>rentencheck.app/pricing</strong> einsehbar
              und verstehen sich inklusive der gesetzlichen Mehrwertsteuer.
            </p>
            <p className="mt-2">
              Die Abrechnung erfolgt <strong>im Voraus</strong> für die gewählte Abrechnungsperiode
              (monatlich oder jährlich). Die Zahlungsabwicklung erfolgt über{" "}
              <strong>Stripe Payments Europe Ltd.</strong>, Dublin, Irland. Stripe verarbeitet
              Zahlungsdaten eigenständig gemäß seinen Nutzungsbedingungen.
            </p>
            <p className="mt-2">
              Das Abonnement verlängert sich automatisch um die jeweils gewählte Laufzeit, sofern
              es nicht vor Ablauf der aktuellen Abrechnungsperiode über das Kundenportal (Stripe
              Customer Portal) gekündigt wird.
            </p>
            <p className="mt-2">
              Bei Zahlungsverzug ist der Anbieter berechtigt, den Zugang zur Plattform
              vorübergehend zu sperren. Bereits gezahlte Beträge werden nicht anteilig erstattet,
              sofern keine zwingenden gesetzlichen Vorschriften entgegenstehen.
            </p>
          </section>

          {/* §5 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 5 Kostenloser Testzeitraum</h2>
            <p>
              Kostenpflichtige Pläne werden mit einem <strong>14-tägigen kostenlosen Testzeitraum</strong>{" "}
              angeboten. Während des Testzeitraums entstehen keine Kosten. Nach Ablauf wird das
              Abonnement automatisch kostenpflichtig, sofern es nicht vorher gekündigt wurde.
            </p>
            <p className="mt-2">
              Der Testzeitraum kann pro Nutzer nur einmal in Anspruch genommen werden.
            </p>
          </section>

          {/* §6 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 6 Widerrufsrecht für Verbraucher</h2>

            <h3 className="font-semibold text-slate-800 mt-3 mb-1">6.1 Widerrufsbelehrung</h3>
            <div className="p-3 bg-slate-100 rounded-lg text-xs">
              <p className="font-semibold mb-1">Widerrufsrecht</p>
              <p>
                Sie haben das Recht, binnen 14 Tagen ohne Angabe von Gründen diesen Vertrag zu
                widerrufen. Die Widerrufsfrist beträgt 14 Tage ab dem Tag des Vertragsschlusses.
              </p>
              <p className="mt-2">
                Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (Leonard Brandt,
                Ernst-Bähre-Str. 3, 30453 Hannover,{" "}
                <a href="mailto:info@rentencheck.app" className="text-blue-600 hover:underline">info@rentencheck.app</a>)
                mittels einer eindeutigen Erklärung (z. B. Brief oder E-Mail) über Ihren Entschluss,
                diesen Vertrag zu widerrufen, informieren.
              </p>
              <p className="mt-2">
                Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die
                Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.
              </p>
              <p className="mt-2 font-semibold">Folgen des Widerrufs</p>
              <p>
                Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen zurückzuzahlen,
                die wir von Ihnen erhalten haben, unverzüglich und spätestens binnen 14 Tagen ab
                dem Tag der Mitteilung Ihres Widerrufs.
              </p>
            </div>

            <h3 className="font-semibold text-slate-800 mt-4 mb-1">6.2 Vorzeitiges Erlöschen des Widerrufsrechts</h3>
            <p>
              Das Widerrufsrecht erlischt vorzeitig, wenn der Anbieter mit der Ausführung des
              Vertrags begonnen hat und der Verbraucher:
            </p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>ausdrücklich zugestimmt hat, dass mit der Ausführung vor Ablauf der Widerrufsfrist begonnen wird, und</li>
              <li>bestätigt hat, dass er dadurch sein Widerrufsrecht verliert.</li>
            </ul>
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs">
              <p className="font-semibold text-amber-800 mb-1">⚠ Hinweis für die Implementierung</p>
              <p className="text-amber-700">
                Im Checkout-Prozess muss folgende Zustimmung eingeholt werden (Checkbox):<br />
                <em>„Ich verlange ausdrücklich, dass mit der Ausführung des Vertrags vor Ablauf der
                Widerrufsfrist begonnen wird. Mir ist bekannt, dass ich dadurch mein Widerrufsrecht
                verliere."</em><br /><br />
                Diese Checkbox ist noch nicht im Checkout implementiert — sie sollte vor der
                Weiterleitung zu Stripe ergänzt werden.
              </p>
            </div>
          </section>

          {/* §7 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 7 Nutzungsrechte</h2>
            <p>
              Der Nutzer erhält ein einfaches, nicht übertragbares Recht zur Nutzung der Plattform
              für eigene berufliche Zwecke im Rahmen des gebuchten Plans.
            </p>
            <p className="mt-2">
              Eine Weitergabe von Zugangsdaten an Dritte oder eine Unterlizenzierung ist nicht
              gestattet. White-Label- oder API-Nutzung bedarf einer gesonderten schriftlichen
              Vereinbarung mit dem Anbieter.
            </p>
          </section>

          {/* §8 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 8 Pflichten des Nutzers</h2>
            <p>Der Nutzer verpflichtet sich:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>keine rechtswidrigen Inhalte in die Plattform einzugeben,</li>
              <li>Kundendaten nur auf einer rechtmäßigen datenschutzrechtlichen Grundlage zu verarbeiten,</li>
              <li>Zugangsdaten vertraulich zu behandeln und bei Missbrauchsverdacht unverzüglich zu ändern,</li>
              <li>den Anbieter über eine unberechtigte Nutzung seines Kontos zu informieren.</li>
            </ul>
          </section>

          {/* §9 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 9 Haftung</h2>
            <p>Der Anbieter haftet unbeschränkt bei:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Vorsatz und grober Fahrlässigkeit,</li>
              <li>Verletzung von Leben, Körper oder Gesundheit,</li>
              <li>Ansprüchen nach dem Produkthaftungsgesetz.</li>
            </ul>
            <p className="mt-2">
              Bei leichter Fahrlässigkeit haftet der Anbieter nur bei Verletzung wesentlicher
              Vertragspflichten (Kardinalpflichten). Die Haftung ist in diesem Fall auf den
              vertragstypisch vorhersehbaren Schaden begrenzt. Für entgangenen Gewinn wird
              nicht gehaftet.
            </p>
            <p className="mt-2">
              Insbesondere übernimmt der Anbieter keine Haftung für die Richtigkeit der
              Berechnungsergebnisse oder für Entscheidungen, die auf deren Basis getroffen werden.
            </p>
            <p className="mt-2">
              Gegenüber Verbrauchern gelten die gesetzlichen Haftungsvorschriften ohne Einschränkung.
            </p>
            <p className="mt-2">
              Der Anbieter übernimmt keine Gewähr für die dauerhafte Speicherung einzelner
              Berechnungsergebnisse. Der Nutzer ist für die Sicherung seiner Daten selbst verantwortlich.
            </p>
          </section>

          {/* §10 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 10 Verfügbarkeit</h2>
            <p>
              Der Anbieter strebt eine durchschnittliche Jahresverfügbarkeit von <strong>98 %</strong> an.
              Geplante Wartungsfenster sowie Ausfälle durch höhere Gewalt, Drittanbieter-Ausfälle
              (Vercel, Supabase) oder Sicherheitsvorfälle sind hiervon ausgenommen.
              Ein Anspruch auf ununterbrochene Verfügbarkeit besteht nicht.
            </p>
          </section>

          {/* §11 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 11 Änderungen der AGB und des Leistungsumfangs</h2>
            <p>
              Der Anbieter kann diese AGB und den Leistungsumfang aus sachlichem Grund anpassen
              (z. B. Rechtsänderungen, neue Funktionen, geänderte Kostenstruktur). Änderungen
              werden dem Nutzer mindestens <strong>30 Tage vor Inkrafttreten</strong> per E-Mail
              angekündigt.
            </p>
            <p className="mt-2">
              Widerspricht der Nutzer nicht innerhalb von 30 Tagen nach Zugang der Mitteilung,
              gelten die Änderungen als angenommen. Auf dieses Widerspruchsrecht und die Folgen
              des Schweigens wird in der Mitteilung ausdrücklich hingewiesen.
            </p>
            <p className="mt-2">
              Bei Verbrauchern sind wesentliche Änderungen nur mit ausdrücklicher Zustimmung wirksam.
            </p>
          </section>

          {/* §12 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 12 Datenschutz</h2>
            <p>
              Informationen zur Verarbeitung personenbezogener Daten finden Sie in unserer{" "}
              <Link to="/datenschutz" className="text-blue-600 hover:underline">
                Datenschutzerklärung
              </Link>.
            </p>
          </section>

          {/* §13 */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">§ 13 Schlussbestimmungen</h2>
            <p>
              Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts (CISG). Gerichtsstand
              ist, soweit gesetzlich zulässig, Hannover. Sollten einzelne Bestimmungen dieser AGB
              unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
