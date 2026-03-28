import { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Shield, Check, ArrowRight, ChevronDown, FileDown, BarChart3, Users,
  Calculator, DollarSign, Target, TrendingDown, Wallet, Lock,
} from "lucide-react";

const faq = [
  {
    q: "Ist RentenCheck für Privatpersonen geeignet?",
    a: "Nein. Die Plattform richtet sich ausschließlich an Finanz- und Versicherungsberater – also Makler, Vermittler und Agenturen. Ein Vertragsschluss mit Privatpersonen ist ausgeschlossen.",
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
    a: "Ja. Der Free-Plan ist dauerhaft kostenlos und beinhaltet die grundlegenden Rechner (Fonds-Sparvertrag, Einmalanlage). Der Premium-Plan startet mit einem 30-tägigen kostenlosen Testzeitraum – keine Kreditkarte erforderlich.",
  },
  {
    q: "Was passiert nach der Probezeit?",
    a: "Das Abonnement beginnt automatisch nach Ablauf der Probezeit, sofern nicht vorher über das Kundenportal gekündigt wird. Kündigung ist jederzeit möglich und wirkt zum Ende der laufenden Abrechnungsperiode.",
  },
];

function BrowserFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-200 ring-1 ring-black/5">
      <div className="bg-slate-100 px-4 py-2.5 flex items-center gap-2 border-b border-slate-200">
        <div className="flex gap-1.5 shrink-0">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 mx-3 bg-white rounded-md px-3 py-0.5 text-xs text-slate-400 text-center truncate">
          app.rentencheck.de
        </div>
      </div>
      <img src={src} alt={alt} className="w-full block" />
    </div>
  );
}

export default function Landing() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white">

      {/* ── Navbar ───────────────────────────────────────────────── */}
      <nav className="border-b border-slate-100 bg-white/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <img src="/rentencheck-logo.png" alt="RentenCheck" className="h-8 w-auto" />
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
            <a href="#funktionen" className="hover:text-slate-900 transition-colors">Funktionen</a>
            <a href="#rechner" className="hover:text-slate-900 transition-colors">Rechner</a>
            <Link to={createPageUrl("Pricing")} className="hover:text-slate-900 transition-colors">Preise</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden md:block text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Anmelden
            </Link>
            <Link
              to="/login"
              className="text-sm font-semibold bg-brand-cyan hover:bg-brand-blue text-white px-4 py-2 rounded-lg transition-colors"
            >
              Kostenlos starten
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-50 text-brand-cyan text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-blue-100">
              <Lock className="w-3 h-3" />
              Nur für Finanz- und Versicherungsberater
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-6">
              Die professionelle<br />
              <span className="text-brand-cyan">Vergleichssoftware</span><br />
              für Finanzberater
            </h1>
            <p className="text-lg text-slate-500 mb-8 leading-relaxed">
              Vergleichen Sie Lebensversicherung mit Fondsdepot — transparent, nachvollziehbar und mandantensicher. 5 Simulationsrechner in einem Tool.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 bg-brand-cyan hover:bg-brand-blue text-white font-semibold px-6 py-3 rounded-lg transition-colors text-sm"
              >
                Demo starten <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to={createPageUrl("Pricing")}
                className="inline-flex items-center justify-center gap-2 border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium px-6 py-3 rounded-lg transition-colors text-sm"
              >
                Preise ansehen
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-5 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-green-500" /> DSGVO-konform</span>
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-green-500" /> Kostenlos starten</span>
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-green-500" /> Keine Kreditkarte</span>
            </div>
          </div>
          <div className="hidden lg:block">
            <BrowserFrame
              src="/screenshots/screenshot-results.png"
              alt="RentenCheck Ergebnis-Ansicht: LV vs. Direktanlage"
            />
          </div>
        </div>
      </section>

      {/* ── Trust Bar ────────────────────────────────────────────── */}
      <section className="border-y border-slate-100 bg-slate-50 py-5 px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-8 text-sm text-slate-500 font-medium">
          {[
            { icon: Shield, text: "DSGVO-konform" },
            { icon: Lock, text: "Lokale Datenhaltung" },
            { icon: Check, text: "Kein Drittanbieter-Tracking" },
            { icon: Users, text: "Nur für zugelassene Berater" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-brand-cyan" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section id="funktionen" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-brand-cyan uppercase tracking-widest mb-3">Funktionen</p>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Alles was Sie brauchen</h2>
            <p className="text-slate-500 max-w-xl mx-auto text-sm leading-relaxed">
              Standardisierte Berechnungslogik, transparente Kostenstrukturen und mandatsfähige Auswertungen — alles in einem Tool.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: BarChart3,
                title: "Standardisierte Methodik",
                desc: "Einheitliche, nachvollziehbare Berechnungslogik für alle Vergleiche. Keine Black Box.",
              },
              {
                icon: Check,
                title: "Transparente Kosten",
                desc: "Alle Eingangsparameter und Kostenstrukturen — sichtbar und vollständig dokumentiert.",
              },
              {
                icon: FileDown,
                title: "PDF-Export mit Branding",
                desc: "Auswertungen mit Ihrem Logo und Berater-Profil für professionelle Kundenpräsentationen.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="p-6 rounded-2xl border border-slate-100 bg-white hover:border-blue-100 hover:shadow-md transition-all duration-200 group"
              >
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                  <item.icon className="w-5 h-5 text-brand-cyan" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── App Preview ──────────────────────────────────────────── */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-semibold text-slate-400 uppercase tracking-widest mb-8">
            Echtansicht der Anwendung
          </p>
          <BrowserFrame
            src="/screenshots/screenshot-results.png"
            alt="RentenCheck Ergebnis-Ansicht: LV vs. Direktanlage Vergleich"
          />
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-xs font-bold text-brand-cyan uppercase tracking-widest mb-3">So funktioniert's</p>
            <h2 className="text-3xl font-bold text-slate-900">In drei Schritten zur Analyse</h2>
          </div>
          <div className="space-y-20">
            {[
              {
                step: "01",
                title: "Parameter eingeben",
                desc: "Produkt-Konditionen, Laufzeit und Kosten eingeben. Voreinstellungen sparen Zeit bei jedem neuen Mandat — einmal konfigurieren, dauerhaft nutzen.",
                src: "/screenshots/screenshot-calculator.png",
                alt: "Fonds-Sparvertrag Rechner: Parameter eingeben",
                reverse: false,
              },
              {
                step: "02",
                title: "Simulation berechnen",
                desc: "Monatliche Simulation mit vollständiger Kosten- und Steueranalyse. LV vs. Direktanlage — transparent, nachvollziehbar und mit Brutto-/Netto-Umschaltung.",
                src: "/screenshots/screenshot-results.png",
                alt: "Simulationsergebnis: LV vs. Direktanlage",
                reverse: true,
              },
              {
                step: "03",
                title: "PDF exportieren",
                desc: "Auswertung als PDF mit Ihrem Logo und Berater-Profil. Transparent und mandatsfähig — direkt an den Kunden weitergeben.",
                src: "/screenshots/screenshot-bestadvice.png",
                alt: "BestAdvice Rechner: Bestandsvertrag vs. Umschichtung",
                reverse: false,
              },
            ].map((item) => (
              <div key={item.step} className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div className={item.reverse ? "md:order-2" : ""}>
                  <span className="text-7xl font-black text-slate-100 block mb-1 leading-none">{item.step}</span>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                  <p className="text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
                <div className={item.reverse ? "md:order-1" : ""}>
                  <BrowserFrame src={item.src} alt={item.alt} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Rechner-Module ───────────────────────────────────────── */}
      <section id="rechner" className="py-20 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-brand-cyan uppercase tracking-widest mb-3">Module</p>
            <h2 className="text-3xl font-bold text-slate-900 mb-3">5 Simulationsrechner</h2>
            <p className="text-sm text-slate-500">Von der Erstberatung bis zur Bestandsanalyse — alle Szenarien abgedeckt.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Calculator, name: "Fonds-Sparvertrag", desc: "LV vs. Direktanlage (monatliche Sparrate)", free: true },
              { icon: DollarSign, name: "Fonds-Einmalanlage", desc: "LV vs. Direktanlage (Einmalbetrag)", free: true },
              { icon: Target, name: "BestAdvice", desc: "Bestandsvertrag vs. Umschichtung in Fonds-LV", free: false },
              { icon: TrendingDown, name: "Rentenlücke", desc: "Versorgungslücke im Ruhestand berechnen", free: false },
              { icon: Wallet, name: "Entnahmeplan", desc: "Kapitalverzehr im Ruhestand simulieren", free: false },
            ].map((item) => (
              <div
                key={item.name}
                className="bg-white rounded-xl border border-slate-100 p-5 flex items-start gap-4 hover:border-blue-100 hover:shadow-sm transition-all duration-200"
              >
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <item.icon className="w-4 h-4 text-brand-cyan" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                    {item.free && (
                      <span className="text-[10px] bg-green-50 text-green-600 font-bold px-1.5 py-0.5 rounded-full border border-green-100">
                        Free
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Für wen ──────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-brand-cyan uppercase tracking-widest mb-3">Zielgruppe</p>
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Für wen ist RentenCheck?</h2>
            <p className="text-sm text-slate-500">Ausschließlich für Finanz- und Versicherungsberater.</p>
          </div>
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
                desc: "Schnelle Analysen für unterschiedliche Produktkonditionen — ohne Programmieraufwand.",
              },
              {
                icon: Shield,
                title: "Teams & Agenturen",
                desc: "Unbegrenzte Berechnungen, gemeinsame Voreinstellungen und Branding für das gesamte Team.",
              },
            ].map((item) => (
              <div key={item.title} className="p-6 rounded-2xl border border-slate-100 bg-slate-50">
                <div className="w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center mb-4 shadow-sm">
                  <item.icon className="w-5 h-5 text-brand-cyan" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Compliance ───────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Shield className="w-8 h-8 text-brand-cyan mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-3">Datenschutz & Compliance</h2>
            <p className="text-slate-400 text-sm">DSGVO-konform konzipiert — für den Einsatz im professionellen Umfeld.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              "DSGVO-konform – kein Tracking, keine Werbedaten",
              "AVV (Art. 28 DSGVO) ist Vertragsbestandteil",
              "Datenhaltung in der EU (Frankfurt, AWS eu-central-1)",
              "Kein Drittanbieter-Tracking (kein Google Analytics, kein Facebook Pixel)",
              "Technische und organisatorische Maßnahmen (TOM) dokumentiert",
              "Subprozessoren transparent gelistet (Supabase, Vercel, Stripe, Resend)",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 bg-white/5 rounded-xl p-4 border border-white/10">
                <Check className="w-4 h-4 text-brand-cyan mt-0.5 shrink-0" />
                <span className="text-sm text-slate-300">{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              to={createPageUrl("Compliance")}
              className="inline-flex items-center gap-2 text-sm font-medium text-brand-cyan hover:text-white transition-colors"
            >
              Compliance & TOM-Dokumentation ansehen <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-brand-cyan uppercase tracking-widest mb-3">Preise</p>
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Transparente Preise</h2>
            <p className="text-sm text-slate-500">Keine versteckten Kosten. Jederzeit kündbar.</p>
          </div>
          <div className="max-w-sm mx-auto">
            {/* Premium */}
            <div className="rounded-2xl bg-brand-blue p-7 flex flex-col relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 bg-brand-cyan text-white text-[10px] font-bold px-3 py-1.5 rounded-bl-xl tracking-wider">
                ALLES INKLUSIVE
              </div>
              <p className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-4">Premium</p>
              <div className="text-3xl font-black text-white mb-1">59 €</div>
              <p className="text-sm text-blue-300 mb-1">pro Monat, zzgl. MwSt.</p>
              <p className="text-xs text-blue-400 mb-6">oder 599,99 €/Jahr (spare 2 Monate)</p>
              <ul className="space-y-2.5 text-sm text-blue-100 flex-1 mb-8">
                {[
                  "Alle 5 Simulationsrechner",
                  "Unbegrenzte Berechnungen",
                  "PDF-Export mit Branding",
                  "BestAdvice & Rentenlücke",
                  "Eigenes Logo auf PDFs",
                  "30 Tage kostenlos testen",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-white shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link
                to={createPageUrl("Pricing")}
                className="block text-center bg-white text-brand-blue rounded-xl py-2.5 text-sm font-bold hover:bg-blue-50 transition-colors"
              >
                30 Tage kostenlos testen
              </Link>
            </div>
          </div>
          <p className="text-center mt-6 text-sm text-slate-500">
            Kündigung jederzeit möglich. Nach dem Testzeitraum 59 €/Monat zzgl. MwSt.
          </p>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-brand-cyan uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="text-3xl font-bold text-slate-900">Häufige Fragen</h2>
          </div>
          <div className="space-y-2">
            {faq.map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                >
                  <span className="text-sm font-semibold text-slate-900 pr-4">{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${openIndex === i ? "rotate-180" : ""}`}
                  />
                </button>
                {openIndex === i && (
                  <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-brand-blue">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Jetzt kostenlos starten</h2>
          <p className="text-blue-200 mb-8 text-sm">Keine Kreditkarte erforderlich. Free-Plan dauerhaft kostenlos.</p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-white text-brand-blue hover:bg-blue-50 font-bold px-8 py-3.5 rounded-xl transition-colors"
          >
            Demo starten <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="bg-slate-950 text-slate-500 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <img src="/rentencheck-logo.png" alt="RentenCheck" className="h-7 w-auto opacity-50" />
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
