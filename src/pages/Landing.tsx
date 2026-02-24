import { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Shield, Check, ArrowRight, ChevronDown, FileDown, BarChart3, Users,
} from "lucide-react";

const faq = [
  {
    q: "Ist RentenCheck für Privatpersonen geeignet?",
    a: "Nein. Die Plattform richtet sich ausschließlich an Unternehmer im Sinne des § 14 BGB – also Makler, Vermittler und Agenturen. Ein Vertragsschluss mit Verbrauchern ist ausgeschlossen.",
  },
  {
    q: "Handelt es sich um Finanzberatung?",
    a: "Nein. RentenCheck erstellt ausschließlich modellhafte Simulationen auf Basis der vom Nutzer eingegebenen Parameter. Es erfolgt keine Finanz-, Steuer- oder Rechtsberatung. Die Ergebnisse sind Werkzeuge zur internen Analyse und Kundenkommunikation.",
  },
  {
    q: "Wo werden meine Daten gespeichert?",
    a: "Berechnungen und Profildaten werden in Supabase (AWS eu-central-1, Frankfurt) gespeichert. Der Auftragsverarbeitungsvertrag (AVV) gemäß Art. 28 DSGVO ist Bestandteil jedes Nutzungsvertrags. Drittanbieter-Tracking findet nicht statt.",
  },
  {
    q: "Gibt es eine kostenlose Testversion?",
    a: "Ja. Der Free-Plan ist dauerhaft kostenlos und beinhaltet die grundlegenden Rechner (Fonds-Sparvertrag, Einmalanlage). Pro und Unlimited starten mit einem 30-tägigen kostenlosen Testzeitraum – keine Kreditkarte erforderlich.",
  },
  {
    q: "Was passiert nach der Probezeit?",
    a: "Das Abonnement beginnt automatisch nach Ablauf der Probezeit, sofern nicht vorher über das Kundenportal gekündigt wird. Kündigung ist jederzeit möglich und wirkt zum Ende der laufenden Abrechnungsperiode.",
  },
];

export default function Landing() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white">

      {/* Navbar */}
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <img src="/rentencheck-logo.png" alt="RentenCheck" className="h-9 w-auto" />
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Anmelden
            </Link>
            <Link
              to="/login"
              className="text-sm font-semibold bg-gradient-to-tr from-brand-cyan to-brand-blue hover:opacity-90 text-white px-4 py-2 rounded-xl transition-opacity"
            >
              Demo starten
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-linear-to-br from-slate-900 to-slate-800 text-white py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-block bg-white/10 text-slate-200 text-xs font-semibold px-3 py-1 rounded-full mb-6 border border-white/20">
            Ausschließlich für Unternehmer · § 14 BGB
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
            Modellbasierte Simulationen<br />
            <span className="bg-gradient-to-tr from-brand-cyan to-brand-blue bg-clip-text text-transparent">
              für Finanzvergleiche.
            </span>
          </h1>
          <p className="text-lg text-slate-300 max-w-xl mx-auto mb-4">
            Standardisiertes Analyse-Werkzeug für Vermittler und Makler.
          </p>
          <p className="text-sm text-slate-400 max-w-xl mx-auto mb-10">
            Keine Finanz-, Steuer- oder Rechtsberatung. Alle Ergebnisse sind modellhafte Simulationen.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/login"
              className="bg-gradient-to-tr from-brand-cyan to-brand-blue hover:opacity-90 text-white font-bold px-8 py-3.5 rounded-xl text-base transition-opacity flex items-center justify-center gap-2"
            >
              Demo starten <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to={createPageUrl("Pricing")}
              className="border border-white/30 hover:border-white/60 text-white px-8 py-3.5 rounded-xl text-base transition-colors text-center"
            >
              Preise ansehen
            </Link>
          </div>
        </div>
      </section>

      {/* 3 Nutzen-Bullets */}
      <section className="py-16 px-6 border-b border-slate-100">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {[
            {
              icon: BarChart3,
              title: "Standardisierte Methodik",
              desc: "Einheitliche, nachvollziehbare Berechnungslogik für alle Vergleiche – keine Black Box.",
            },
            {
              icon: Check,
              title: "Transparente Annahmen & Kosten",
              desc: "Alle Eingangsparameter und Kostenstrukturen sind sichtbar und dokumentiert.",
            },
            {
              icon: FileDown,
              title: "PDF-Export mit Branding",
              desc: "Auswertungen mit eigenem Logo und Berater-Profil direkt an Kunden weitergeben.",
            },
          ].map((item) => (
            <div key={item.title} className="flex flex-col items-center">
              <div className="w-12 h-12 bg-brand-cyan/10 rounded-2xl flex items-center justify-center mb-4">
                <item.icon className="w-6 h-6 text-brand-cyan" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">{item.title}</h3>
              <p className="text-sm text-slate-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* So funktioniert's */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-12">So funktioniert's</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Parameter eingeben", desc: "Produkt-Konditionen und Annahmen eingeben. Voreinstellungen sparen Zeit bei jedem neuen Mandat." },
              { step: "2", title: "Simulation berechnen", desc: "Monatliche Simulation mit vollständiger Kosten- und Steueranalyse." },
              { step: "3", title: "PDF exportieren", desc: "Auswertung als PDF mit Ihrem Logo und Berater-Profil. Transparent und mandatsfähig." },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-cyan to-brand-blue text-white text-xl font-bold flex items-center justify-center mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Für wen */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-3">Für wen ist RentenCheck?</h2>
          <p className="text-slate-500 text-center mb-12 text-sm">
            Ausschließlich für Unternehmer i.S.d. § 14 BGB.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Users,
                title: "Makler",
                desc: "Standardisierte Vergleiche für Kundengespräche. Nachvollziehbar, exportierbar, mandatsfähig.",
              },
              {
                icon: BarChart3,
                title: "Vermittler",
                desc: "Schnelle Analysen für unterschiedliche Produktkonditionen – ohne Programmieraufwand.",
              },
              {
                icon: Shield,
                title: "Teams & Agenturen",
                desc: "Unbegrenzte Berechnungen, gemeinsame Voreinstellungen und Branding für das gesamte Team.",
              },
            ].map((item) => (
              <div key={item.title} className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <div className="w-10 h-10 bg-brand-cyan/10 rounded-xl flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-brand-cyan" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance Section */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6 justify-center">
            <Shield className="w-7 h-7 text-brand-cyan" />
            <h2 className="text-2xl font-bold text-slate-900">Datenschutz & Compliance</h2>
          </div>
          <p className="text-slate-500 text-center mb-10 text-sm">
            DSGVO-konform konzipiert – für den Einsatz im professionellen Umfeld.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              "DSGVO-konform – kein Tracking, keine Werbedaten",
              "AVV (Art. 28 DSGVO) ist Vertragsbestandteil",
              "Datenhaltung in der EU (Frankfurt, AWS eu-central-1)",
              "Kein Drittanbieter-Tracking (kein Google Analytics, kein Facebook Pixel)",
              "Technische und organisatorische Maßnahmen (TOM) dokumentiert",
              "Subprozessoren transparent gelistet (Supabase, Vercel, Stripe, Resend)",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 bg-white rounded-xl p-4 border border-slate-100">
                <Shield className="w-4 h-4 text-brand-cyan mt-0.5 shrink-0" />
                <span className="text-sm text-slate-700">{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              to={createPageUrl("Compliance")}
              className="inline-flex items-center gap-2 text-sm font-medium text-brand-blue hover:underline"
            >
              Compliance & TOM-Dokumentation ansehen <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-3">Transparente Preise</h2>
          <p className="text-slate-500 text-center mb-3 text-sm">
            Alle Pläne nur für Unternehmer i.S.d. § 14 BGB.
          </p>
          <p className="text-slate-400 text-center mb-12 text-xs">
            Keine Finanz-, Steuer- oder Rechtsberatung enthalten.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Free</p>
              <div className="text-3xl font-bold text-slate-900 mb-1">0 €</div>
              <p className="text-sm text-slate-500 mb-6">dauerhaft kostenlos</p>
              <ul className="space-y-2 text-sm text-slate-700 flex-1">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-cyan shrink-0" /> Fonds-Sparvertrag</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-cyan shrink-0" /> Fonds-Einmalanlage</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-cyan shrink-0" /> 3 Simulationen/Monat</li>
              </ul>
              <Link to="/login" className="mt-6 block text-center border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                Kostenlos starten
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-slate-900 rounded-2xl p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pro</p>
                <span className="text-xs bg-gradient-to-tr from-brand-cyan to-brand-blue text-white font-bold px-2 py-0.5 rounded-full">30 Tage gratis</span>
              </div>
              <div className="text-3xl font-bold text-white mb-1">19,99 €</div>
              <p className="text-sm text-slate-400 mb-6">pro Monat, zzgl. MwSt.</p>
              <ul className="space-y-2 text-sm text-slate-300 flex-1">
                {["Alle 5 Simulationsrechner", "PDF-Export mit Berater-Branding", "BestAdvice & Rentenlücken-Rechner", "10 Simulationen/Monat"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-cyan shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link to={createPageUrl("Pricing")} className="mt-6 block text-center bg-gradient-to-tr from-brand-cyan to-brand-blue hover:opacity-90 text-white rounded-xl py-2.5 text-sm font-bold transition-opacity">
                30 Tage kostenlos testen
              </Link>
            </div>

            {/* Unlimited */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Unlimited</p>
              <div className="text-3xl font-bold text-slate-900 mb-1">34,99 €</div>
              <p className="text-sm text-slate-500 mb-6">pro Monat, zzgl. MwSt.</p>
              <ul className="space-y-2 text-sm text-slate-700 flex-1">
                {["Alles aus Pro", "Unbegrenzte Simulationen", "Eigenes Logo auf PDFs", "Prioritäts-Support"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-cyan shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link to={createPageUrl("Pricing")} className="mt-6 block text-center border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                30 Tage kostenlos testen
              </Link>
            </div>
          </div>

          <p className="text-center mt-6 text-sm text-slate-500">
            Auch als Jahrestarif verfügbar – spare 2 Monate.{" "}
            <Link to={createPageUrl("Pricing")} className="text-brand-blue hover:underline">Alle Pläne ansehen →</Link>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-10">Häufige Fragen</h2>
          <div className="space-y-2">
            {faq.map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                >
                  <span className="text-sm font-medium text-slate-900 pr-4">{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${openIndex === i ? "rotate-180" : ""}`}
                  />
                </button>
                {openIndex === i && (
                  <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-50 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <img src="/rentencheck-logo.png" alt="RentenCheck" className="h-8 w-auto opacity-80" />
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs">
            <Link to="/impressum" className="hover:text-white transition-colors">Impressum</Link>
            <Link to="/datenschutz" className="hover:text-white transition-colors">Datenschutz</Link>
            <Link to="/agb" className="hover:text-white transition-colors">AGB</Link>
            <Link to="/legal/avv" className="hover:text-white transition-colors">AVV</Link>
            <Link to="/compliance" className="hover:text-white transition-colors">Compliance</Link>
          </div>
          <p className="text-xs">© {new Date().getFullYear()} Leonard Brandt</p>
        </div>
      </footer>
    </div>
  );
}
